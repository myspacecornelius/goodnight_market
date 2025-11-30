"""
Feed Processing Celery Tasks

Background tasks for:
- Computing feed rankings
- Updating heat indexes
- Finding trade matches
- Cleaning up expired data
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import h3

from celery import shared_task
from celery.utils.log import get_task_logger
import redis

logger = get_task_logger(__name__)

# Redis client
redis_client = redis.StrictRedis.from_url(
    'redis://redis:6379/0',
    decode_responses=True
)


@shared_task(bind=True, max_retries=3)
def compute_listing_rankings(self, h3_indexes: Optional[List[str]] = None):
    """
    Compute ranking scores for listings in specified hexes.
    
    Ranking algorithm:
    - Proximity factor: Already handled by H3 query
    - Engagement (30%): saves, DMs, views normalized
    - Demand (20%): from NeighborhoodHeatIndex
    - Freshness (10%): time decay
    - Authenticity (10%): verification score
    """
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        import os
        
        from services.models.listing import Listing, ListingStatus
        from services.models.heat_index import NeighborhoodHeatIndex
        
        database_url = os.getenv("DATABASE_URL")
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        
        with Session() as db:
            # Query listings to rank
            query = db.query(Listing).filter(Listing.status == ListingStatus.ACTIVE)
            
            if h3_indexes:
                query = query.filter(Listing.h3_index.in_(h3_indexes))
            
            listings = query.all()
            logger.info(f"Computing rankings for {len(listings)} listings")
            
            # Get max values for normalization
            max_saves = max((listing.save_count for listing in listings), default=1) or 1
            max_messages = max((listing.message_count for listing in listings), default=1) or 1
            max_views = max((listing.view_count for listing in listings), default=1) or 1
            
            now = datetime.utcnow()
            
            for listing in listings:
                # Engagement score (0-30)
                save_score = (listing.save_count / max_saves) * 15
                message_score = (listing.message_count / max_messages) * 10
                view_score = (listing.view_count / max_views) * 5
                engagement_score = save_score + message_score + view_score
                
                # Demand score from heat index (0-20)
                heat_index = db.query(NeighborhoodHeatIndex).filter(
                    NeighborhoodHeatIndex.h3_index == listing.h3_index
                ).first()
                demand_score = (heat_index.heat_score / 100 * 20) if heat_index else 0
                
                # Freshness score (0-10) - exponential decay over 7 days
                age_hours = (now - listing.created_at).total_seconds() / 3600
                freshness_score = max(0, 10 * (1 - (age_hours / 168)))  # 168 hours = 7 days
                
                # Authenticity score (0-10)
                auth_score = listing.authenticity_score / 10
                
                # Verified bonus
                verified_bonus = 5 if listing.is_verified else 0
                
                # Price drop bonus (if recently dropped)
                price_drop_bonus = 0
                if listing.original_price and listing.price:
                    drop_percent = listing.get_price_drop_percent()
                    if drop_percent > 10:
                        price_drop_bonus = min(5, drop_percent / 5)
                
                # Total rank score
                listing.rank_score = (
                    engagement_score +
                    demand_score +
                    freshness_score +
                    auth_score +
                    verified_bonus +
                    price_drop_bonus
                )
                
                listing.demand_score = demand_score
            
            db.commit()
            logger.info(f"Updated rankings for {len(listings)} listings")
            
            return {
                "success": True,
                "listings_updated": len(listings),
                "computed_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Ranking computation failed: {e}")
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def update_heat_indexes(self, h3_indexes: Optional[List[str]] = None):
    """
    Update neighborhood heat indexes based on recent activity.
    
    Computes:
    - Velocity metrics (activity per hour)
    - Trending brands/SKUs
    - Price trends
    """
    try:
        from sqlalchemy import create_engine, func
        from sqlalchemy.orm import sessionmaker
        import os
        
        from services.models.listing import Listing, ListingSave, ListingStatus
        from services.models.feed_event import FeedEvent
        from services.models.heat_index import NeighborhoodHeatIndex
        
        database_url = os.getenv("DATABASE_URL")
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        
        with Session() as db:
            now = datetime.utcnow()
            window_start = now - timedelta(hours=24)
            
            # Get unique hexes with activity
            if h3_indexes:
                hexes_to_update = h3_indexes
            else:
                # Get hexes with recent listings
                hexes_query = db.query(Listing.h3_index).filter(
                    Listing.status == ListingStatus.ACTIVE,
                    Listing.created_at >= window_start
                ).distinct()
                hexes_to_update = [r[0] for r in hexes_query.all()]
            
            logger.info(f"Updating heat indexes for {len(hexes_to_update)} hexes")
            
            for hex_id in hexes_to_update:
                # Get or create heat index
                heat_index = NeighborhoodHeatIndex.get_or_create(db, hex_id)
                
                # Count active listings
                active_listings = db.query(func.count(Listing.id)).filter(
                    Listing.h3_index == hex_id,
                    Listing.status == ListingStatus.ACTIVE
                ).scalar()
                
                # Count new listings in window
                new_listings = db.query(func.count(Listing.id)).filter(
                    Listing.h3_index == hex_id,
                    Listing.created_at >= window_start
                ).scalar()
                
                # Count saves in window
                saves_count = db.query(func.count(ListingSave.id)).join(
                    Listing, ListingSave.listing_id == Listing.id
                ).filter(
                    Listing.h3_index == hex_id,
                    ListingSave.created_at >= window_start
                ).scalar()
                
                # Count feed events by type
                events = db.query(
                    FeedEvent.event_type,
                    func.count(FeedEvent.id)
                ).filter(
                    FeedEvent.h3_index == hex_id,
                    FeedEvent.created_at >= window_start
                ).group_by(FeedEvent.event_type).all()
                
                event_counts = dict(events)
                
                # Compute velocities (per hour)
                hours = 24
                heat_index.listing_velocity = new_listings / hours
                heat_index.save_velocity = saves_count / hours
                heat_index.dm_velocity = event_counts.get('TRADE_REQUEST', 0) / hours
                heat_index.trade_request_velocity = event_counts.get('TRADE_REQUEST', 0) / hours
                heat_index.view_velocity = 0  # Would need view tracking
                
                heat_index.active_listings = active_listings
                
                # Get trending brands
                brand_counts = db.query(
                    Listing.brand,
                    func.count(Listing.id).label('count')
                ).filter(
                    Listing.h3_index == hex_id,
                    Listing.status == ListingStatus.ACTIVE
                ).group_by(Listing.brand).order_by(
                    func.count(Listing.id).desc()
                ).limit(5).all()
                
                heat_index.trending_brands = [
                    {"brand": brand, "score": count * 10}
                    for brand, count in brand_counts
                ]
                
                # Get trending SKUs
                sku_counts = db.query(
                    Listing.sku,
                    Listing.title,
                    func.count(Listing.id).label('count')
                ).filter(
                    Listing.h3_index == hex_id,
                    Listing.status == ListingStatus.ACTIVE,
                    Listing.sku.isnot(None)
                ).group_by(Listing.sku, Listing.title).order_by(
                    func.count(Listing.id).desc()
                ).limit(5).all()
                
                heat_index.trending_skus = [
                    {"sku": sku, "name": title, "score": count * 10}
                    for sku, title, count in sku_counts
                ]
                
                # Compute average price
                avg_price = db.query(func.avg(Listing.price)).filter(
                    Listing.h3_index == hex_id,
                    Listing.status == ListingStatus.ACTIVE,
                    Listing.price.isnot(None)
                ).scalar()
                
                heat_index.avg_listing_price = float(avg_price) if avg_price else None
                
                # Update time window
                heat_index.window_start = window_start
                heat_index.window_end = now
                
                # Compute composite heat score
                heat_index.compute_heat_score()
            
            db.commit()
            logger.info(f"Updated {len(hexes_to_update)} heat indexes")
            
            return {
                "success": True,
                "hexes_updated": len(hexes_to_update),
                "computed_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Heat index update failed: {e}")
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def find_trade_matches(self, user_id: Optional[str] = None):
    """
    Find trade opportunities based on user inventory and wishlists.
    
    Algorithm:
    1. Get user's active listings (what they have)
    2. Get user's saved listings (what they want)
    3. Find other users with complementary inventory
    4. Score matches by locality and value balance
    """
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        import os
        from uuid import UUID
        
        from services.models.listing import Listing, ListingSave, ListingStatus
        from services.models.trade_match import TradeMatch
        from services.models.user import User
        
        database_url = os.getenv("DATABASE_URL")
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        
        with Session() as db:
            # Get users to process
            if user_id:
                users = [db.query(User).filter(User.user_id == UUID(user_id)).first()]
            else:
                # Process users with trade-intent listings
                users = db.query(User).join(
                    Listing, Listing.user_id == User.user_id
                ).filter(
                    Listing.status == ListingStatus.ACTIVE,
                    Listing.trade_intent.in_(['TRADE', 'BOTH'])
                ).distinct().limit(100).all()
            
            matches_created = 0
            
            for user in users:
                if not user:
                    continue
                
                # Get user's trade listings
                user_listings = db.query(Listing).filter(
                    Listing.user_id == user.user_id,
                    Listing.status == ListingStatus.ACTIVE,
                    Listing.trade_intent.in_(['TRADE', 'BOTH'])
                ).all()
                
                # Get user's saved listings (what they want)
                saved_listings = db.query(Listing).join(
                    ListingSave, ListingSave.listing_id == Listing.id
                ).filter(
                    ListingSave.user_id == user.user_id,
                    Listing.status == ListingStatus.ACTIVE,
                    Listing.trade_intent.in_(['TRADE', 'BOTH'])
                ).all()
                
                # For each saved listing, check if owner wants something user has
                for wanted in saved_listings:
                    # Skip own listings
                    if wanted.user_id == user.user_id:
                        continue
                    
                    # Check if other user has saved any of this user's listings
                    other_user_saves = db.query(ListingSave).filter(
                        ListingSave.user_id == wanted.user_id,
                        ListingSave.listing_id.in_([lst.id for lst in user_listings])
                    ).first()
                    
                    if other_user_saves:
                        # Found a potential two-way match!
                        user_offers = db.query(Listing).filter(
                            Listing.id == other_user_saves.listing_id
                        ).first()
                        
                        if user_offers:
                            # Check if match already exists
                            existing = db.query(TradeMatch).filter(
                                TradeMatch.listing_ids.contains([user_offers.id, wanted.id])
                            ).first()
                            
                            if not existing:
                                # Calculate locality score
                                try:
                                    distance = h3.h3_distance(
                                        user_offers.h3_index,
                                        wanted.h3_index
                                    )
                                    locality_score = max(0, 100 - (distance * 10))
                                except Exception:
                                    locality_score = 50
                                
                                # Create match
                                match = TradeMatch.create_two_way(
                                    user_a_id=str(user.user_id),
                                    user_b_id=str(wanted.user_id),
                                    listing_a_id=str(user_offers.id),
                                    listing_b_id=str(wanted.id),
                                    listing_a_title=user_offers.title,
                                    listing_b_title=wanted.title,
                                    h3_common=user_offers.h3_index if locality_score > 80 else None,
                                    locality_score=locality_score
                                )
                                
                                # Calculate match score
                                match.match_score = locality_score * 0.5
                                
                                # Value balance (closer to 1.0 = more balanced)
                                if user_offers.price and wanted.price:
                                    ratio = min(float(user_offers.price), float(wanted.price)) / \
                                            max(float(user_offers.price), float(wanted.price))
                                    match.value_balance = ratio
                                    match.match_score += ratio * 50
                                
                                db.add(match)
                                matches_created += 1
            
            db.commit()
            logger.info(f"Created {matches_created} trade matches")
            
            return {
                "success": True,
                "matches_created": matches_created,
                "computed_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Trade match finding failed: {e}")
        self.retry(exc=e, countdown=60)


@shared_task
def cleanup_expired_feed_data():
    """
    Clean up expired feed events, matches, and listings.
    """
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        import os
        
        from services.models.feed_event import FeedEvent
        from services.models.trade_match import TradeMatch, MatchStatus
        from services.models.listing import Listing, ListingStatus
        
        database_url = os.getenv("DATABASE_URL")
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        
        with Session() as db:
            now = datetime.utcnow()
            
            # Delete expired feed events (older than 7 days)
            expired_events = db.query(FeedEvent).filter(
                FeedEvent.created_at < now - timedelta(days=7)
            ).delete()
            
            # Expire old trade matches
            expired_matches = db.query(TradeMatch).filter(
                TradeMatch.expires_at < now,
                TradeMatch.status.in_([
                    MatchStatus.SUGGESTED,
                    MatchStatus.VIEWED,
                    MatchStatus.PENDING
                ])
            ).update({"status": MatchStatus.EXPIRED})
            
            # Expire old listings
            expired_listings = db.query(Listing).filter(
                Listing.expires_at < now,
                Listing.status == ListingStatus.ACTIVE
            ).update({"status": ListingStatus.EXPIRED})
            
            db.commit()
            
            logger.info(
                f"Cleanup: {expired_events} events, "
                f"{expired_matches} matches, "
                f"{expired_listings} listings expired"
            )
            
            return {
                "success": True,
                "expired_events": expired_events,
                "expired_matches": expired_matches,
                "expired_listings": expired_listings,
                "cleaned_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        raise


@shared_task
def broadcast_feed_event(channel: str, event_data: Dict[str, Any]):
    """
    Broadcast a feed event to Redis pub/sub.
    Called after creating feed events to notify WebSocket subscribers.
    """
    try:
        redis_client.publish(channel, json.dumps(event_data))
        logger.debug(f"Broadcast event to {channel}")
    except Exception as e:
        logger.error(f"Broadcast failed: {e}")

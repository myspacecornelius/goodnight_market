"""
Feed V2 Router - Hyperlocal marketplace feed with real-time updates.

Endpoints:
- GET /v2/feed/hyperlocal - Ranked local listings
- GET /v2/feed/heat-index - Demand metrics for area
- GET /v2/feed/activity-ribbon - Recent events ticker
- GET /v2/feed/trade-matches - Suggested trades
- POST /v2/listings - Create listing
- GET /v2/listings/{id} - Get listing details
- POST /v2/listings/{id}/save - Save listing
- POST /v2/listings/{id}/price-drop - Drop price
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from services.core.database import get_db
from services.core.security import get_current_user
from services.core.redis_client import get_redis
from services.core.h3_geo import (
    coords_to_h3, get_radius_hexes, estimate_distance_miles
)
from services.models.user import User
from services.models.listing import Listing, ListingSave, ListingStatus
from services.models.feed_event import FeedEvent
from services.models.heat_index import NeighborhoodHeatIndex
from services.models.trade_match import TradeMatch, MatchStatus
from services.models.location import Location
from services.schemas.listing import (
    ListingCreate, ListingResponse, ListingFeedItem,
    HyperlocalFeedResponse, HeatIndexResponse, ActivityRibbonItem,
    ActivityRibbonResponse, TradeMatchResponse, TradeMatchListResponse,
    PriceDropRequest
)

import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v2/feed", tags=["feed-v2"])


# =============================================================================
# HYPERLOCAL FEED
# =============================================================================

@router.get("/hyperlocal", response_model=HyperlocalFeedResponse)
async def get_hyperlocal_feed(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius: float = Query(default=1.0, ge=0.25, le=5.0, description="Radius in miles"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    size: Optional[str] = Query(None, description="Filter by size"),
    condition: Optional[str] = Query(None, description="Filter by condition"),
    trade_intent: Optional[str] = Query(None, description="Filter by trade intent"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    sort_by: str = Query(default="rank", description="Sort: rank, price, newest, distance"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get hyperlocal listings feed.
    
    Ranking algorithm considers:
    - Proximity (40%): Distance decay
    - Engagement (30%): Saves, DMs, views
    - Demand (20%): From neighborhood heat index
    - Freshness (10%): Time decay
    """
    # Get H3 hexes covering the search radius
    center_h3 = coords_to_h3(lat, lng, 9)
    
    # Determine which resolution to query based on radius
    if radius <= 0.5:
        hex_column = Listing.h3_index
        search_hexes = get_radius_hexes(lat, lng, radius)
    elif radius <= 1.5:
        hex_column = Listing.h3_index_r8
        search_hexes = get_radius_hexes(lat, lng, radius)
        # Convert to r8 hexes
        import h3
        search_hexes = list(set(h3.h3_to_parent(h, 8) for h in search_hexes))
    else:
        hex_column = Listing.h3_index_r7
        search_hexes = get_radius_hexes(lat, lng, radius)
        import h3
        search_hexes = list(set(h3.h3_to_parent(h, 7) for h in search_hexes))
    
    # Build base query
    query = db.query(Listing).filter(
        Listing.status == ListingStatus.ACTIVE,
        hex_column.in_(search_hexes)
    )
    
    # Apply filters
    if brand:
        query = query.filter(Listing.brand.ilike(f"%{brand}%"))
    if size:
        query = query.filter(Listing.size == size)
    if condition:
        query = query.filter(Listing.condition == condition)
    if trade_intent:
        query = query.filter(Listing.trade_intent == trade_intent)
    if min_price is not None:
        query = query.filter(Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(Listing.price <= max_price)
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply sorting
    if sort_by == "price":
        query = query.order_by(Listing.price.asc().nullslast())
    elif sort_by == "newest":
        query = query.order_by(desc(Listing.created_at))
    elif sort_by == "distance":
        # For distance sorting, we'd need to compute actual distances
        # For now, use h3 index ordering as proxy
        query = query.order_by(Listing.h3_index)
    else:  # rank (default)
        query = query.order_by(desc(Listing.rank_score), desc(Listing.created_at))
    
    # Paginate
    listings = query.offset(offset).limit(limit).all()
    
    # Compute distances and convert to feed items
    feed_items = []
    for listing in listings:
        distance = estimate_distance_miles(center_h3, listing.h3_index)
        item = ListingFeedItem(
            id=listing.id,
            user_id=listing.user_id,
            title=listing.title,
            brand=listing.brand,
            sku=listing.sku,
            size=listing.size,
            condition=listing.condition,
            images=listing.images,
            authenticity_score=listing.authenticity_score,
            is_verified=listing.is_verified,
            price=float(listing.price) if listing.price else None,
            original_price=float(listing.original_price) if listing.original_price else None,
            price_drop_percent=listing.get_price_drop_percent(),
            trade_intent=listing.trade_intent,
            distance_miles=round(distance, 2),
            rank_score=listing.rank_score,
            demand_score=listing.demand_score,
            view_count=listing.view_count,
            save_count=listing.save_count,
            status=listing.status,
            created_at=listing.created_at
        )
        feed_items.append(item)
    
    # Get heat level for the area
    heat_index = db.query(NeighborhoodHeatIndex).filter(
        NeighborhoodHeatIndex.h3_index == center_h3
    ).first()
    heat_level = heat_index.heat_level if heat_index else "cold"
    
    return HyperlocalFeedResponse(
        listings=feed_items,
        total_count=total_count,
        radius_miles=radius,
        center_h3=center_h3,
        heat_level=heat_level
    )


# =============================================================================
# HEAT INDEX
# =============================================================================

@router.get("/heat-index", response_model=HeatIndexResponse)
async def get_neighborhood_heat(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db)
):
    """
    Get demand indicators for the immediate area.
    
    Shows what's driving demand based on:
    - Saves, DMs, trade requests
    - Search volume
    - Recent listings
    """
    h3_index = coords_to_h3(lat, lng, 9)
    
    # Get or create heat index for this hex
    heat_index = NeighborhoodHeatIndex.get_or_create(db, h3_index)
    db.commit()
    
    return HeatIndexResponse(**heat_index.to_dict())


@router.get("/heat-index/map")
async def get_heat_map(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(default=3.0, ge=1.0, le=10.0),
    db: Session = Depends(get_db)
):
    """
    Get heat map data for rendering hex overlay.
    Returns GeoJSON FeatureCollection of heat-indexed hexes.
    """
    import h3
    
    # Get hexes in radius at resolution 8 (larger hexes for map view)
    center_h3 = coords_to_h3(lat, lng, 8)
    k = int(radius * 1.5)  # Approximate k-ring size
    search_hexes = list(h3.k_ring(center_h3, k))
    
    # Query heat indexes for these hexes
    heat_indexes = db.query(NeighborhoodHeatIndex).filter(
        NeighborhoodHeatIndex.h3_index_r8.in_(search_hexes)
    ).all()
    
    # Convert to GeoJSON
    features = [hi.to_map_feature() for hi in heat_indexes]
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "center": {"lat": lat, "lng": lng},
        "radius_miles": radius
    }


# =============================================================================
# ACTIVITY RIBBON
# =============================================================================

@router.get("/activity-ribbon", response_model=ActivityRibbonResponse)
async def get_activity_ribbon(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(default=3.0, ge=1.0, le=10.0),
    event_types: Optional[List[str]] = Query(None, description="Filter by event types"),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get real-time activity ticker events.
    
    Shows:
    - New listings posted
    - Price drops
    - Items sold nearby
    - Trade activity
    - Shop restock announcements
    """
    import h3
    
    # Get hexes covering the area at resolution 7 (broader coverage for activity)
    center_h3 = coords_to_h3(lat, lng, 7)
    k = int(radius * 0.8)
    search_hexes = list(h3.k_ring(center_h3, k))
    
    # Query recent events
    query = db.query(FeedEvent).filter(
        FeedEvent.h3_index_r7.in_(search_hexes),
        FeedEvent.created_at >= datetime.utcnow() - timedelta(hours=24)
    )
    
    # Filter by event types if specified
    if event_types:
        query = query.filter(FeedEvent.event_type.in_(event_types))
    
    # Exclude expired events
    query = query.filter(
        or_(
            FeedEvent.expires_at.is_(None),
            FeedEvent.expires_at > datetime.utcnow()
        )
    )
    
    events = query.order_by(desc(FeedEvent.created_at)).limit(limit).all()
    
    ribbon_items = [
        ActivityRibbonItem(
            id=e.id,
            type=e.event_type,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            display_text=e.display_text,
            payload=e.payload,
            created_at=e.created_at
        )
        for e in events
    ]
    
    return ActivityRibbonResponse(
        events=ribbon_items,
        has_more=len(events) == limit
    )


# =============================================================================
# TRADE MATCHES
# =============================================================================

@router.get("/trade-matches", response_model=TradeMatchListResponse)
async def get_trade_matches(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get suggested trade opportunities based on user inventory + wishlist.
    
    Prioritizes local matches to reduce friction.
    """
    user_id = str(current_user.user_id)
    
    # Query matches involving this user
    query = db.query(TradeMatch).filter(
        TradeMatch.user_ids.contains([current_user.user_id])
    )
    
    if status_filter:
        query = query.filter(TradeMatch.status == status_filter)
    else:
        # Default: show active matches (not completed/declined/expired)
        query = query.filter(
            TradeMatch.status.in_([
                MatchStatus.SUGGESTED, 
                MatchStatus.VIEWED, 
                MatchStatus.PENDING,
                MatchStatus.ACCEPTED
            ])
        )
    
    # Exclude expired
    query = query.filter(
        or_(
            TradeMatch.expires_at.is_(None),
            TradeMatch.expires_at > datetime.utcnow()
        )
    )
    
    matches = query.order_by(
        desc(TradeMatch.match_score),
        desc(TradeMatch.locality_score)
    ).limit(limit).all()
    
    # Convert to user-specific view
    match_responses = []
    for match in matches:
        user_view = match.to_user_view(user_id)
        match_responses.append(TradeMatchResponse(**user_view))
    
    return TradeMatchListResponse(
        matches=match_responses,
        total_count=len(match_responses)
    )


@router.post("/trade-matches/{match_id}/accept")
async def accept_trade_match(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a trade match"""
    match = db.query(TradeMatch).filter(TradeMatch.id == match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Trade match not found")
    
    if current_user.user_id not in match.user_ids:
        raise HTTPException(status_code=403, detail="Not a participant in this trade")
    
    match.record_acceptance(str(current_user.user_id))
    db.commit()
    
    return {"status": match.status, "message": "Acceptance recorded"}


@router.post("/trade-matches/{match_id}/decline")
async def decline_trade_match(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decline a trade match"""
    match = db.query(TradeMatch).filter(TradeMatch.id == match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Trade match not found")
    
    if current_user.user_id not in match.user_ids:
        raise HTTPException(status_code=403, detail="Not a participant in this trade")
    
    match.record_decline(str(current_user.user_id))
    db.commit()
    
    return {"status": match.status, "message": "Trade declined"}


# =============================================================================
# LISTINGS CRUD
# =============================================================================

listings_router = APIRouter(prefix="/v2/listings", tags=["listings-v2"])


@listings_router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing_data: ListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_client = Depends(get_redis)
):
    """
    Create a new marketplace listing.
    """
    # Create location record
    from geoalchemy2.elements import WKTElement
    location = Location(
        point=WKTElement(f'POINT({listing_data.longitude} {listing_data.latitude})', srid=4326),
        geohash=""  # Will be set by trigger or we can compute
    )
    db.add(location)
    db.flush()
    
    # Create listing
    listing = Listing(
        user_id=current_user.user_id,
        title=listing_data.title,
        description=listing_data.description,
        brand=listing_data.brand,
        sku=listing_data.sku,
        colorway=listing_data.colorway,
        size=listing_data.size,
        size_type=listing_data.size_type.value,
        condition=listing_data.condition.value,
        condition_notes=listing_data.condition_notes,
        has_box=listing_data.has_box,
        has_extras=listing_data.has_extras,
        images=listing_data.images,
        authenticity_photos=listing_data.authenticity_photos,
        price=listing_data.price,
        trade_intent=listing_data.trade_intent.value,
        trade_interests=listing_data.trade_interests,
        trade_notes=listing_data.trade_notes,
        location_id=location.id,
        visibility=listing_data.visibility.value,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    
    # Set H3 indexes
    listing.set_h3_indexes(listing_data.latitude, listing_data.longitude)
    
    db.add(listing)
    db.flush()
    
    # Create feed event
    event = FeedEvent.create_listing_event(
        listing_id=str(listing.id),
        user_id=str(current_user.user_id),
        h3_index=listing.h3_index,
        title=listing.title,
        brand=listing.brand,
        price=float(listing.price) if listing.price else None,
        condition=listing.condition,
        image_url=listing.images[0] if listing.images else None,
        trade_intent=listing.trade_intent
    )
    db.add(event)
    
    db.commit()
    db.refresh(listing)
    
    # Publish to Redis for real-time subscribers
    try:
        await redis_client.publish(
            f"feed:{listing.h3_index}",
            json.dumps(event.to_ribbon_item())
        )
    except Exception as e:
        logger.warning(f"Failed to publish feed event: {e}")
    
    return ListingResponse(
        id=listing.id,
        user_id=listing.user_id,
        title=listing.title,
        description=listing.description,
        brand=listing.brand,
        sku=listing.sku,
        colorway=listing.colorway,
        size=listing.size,
        size_type=listing.size_type,
        condition=listing.condition,
        condition_notes=listing.condition_notes,
        has_box=listing.has_box,
        has_extras=listing.has_extras,
        images=listing.images,
        authenticity_photos=listing.authenticity_photos,
        authenticity_score=listing.authenticity_score,
        is_verified=listing.is_verified,
        price=float(listing.price) if listing.price else None,
        original_price=float(listing.original_price) if listing.original_price else None,
        price_drop_percent=listing.get_price_drop_percent(),
        trade_intent=listing.trade_intent,
        trade_interests=listing.trade_interests,
        trade_notes=listing.trade_notes,
        h3_index=listing.h3_index,
        view_count=listing.view_count,
        save_count=listing.save_count,
        message_count=listing.message_count,
        status=listing.status,
        visibility=listing.visibility,
        created_at=listing.created_at,
        updated_at=listing.updated_at
    )


@listings_router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get listing details"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Record view (don't count own views)
    if listing.user_id != current_user.user_id:
        listing.record_view()
        db.commit()
    
    return ListingResponse(
        id=listing.id,
        user_id=listing.user_id,
        title=listing.title,
        description=listing.description,
        brand=listing.brand,
        sku=listing.sku,
        colorway=listing.colorway,
        size=listing.size,
        size_type=listing.size_type,
        condition=listing.condition,
        condition_notes=listing.condition_notes,
        has_box=listing.has_box,
        has_extras=listing.has_extras,
        images=listing.images,
        authenticity_photos=listing.authenticity_photos,
        authenticity_score=listing.authenticity_score,
        is_verified=listing.is_verified,
        price=float(listing.price) if listing.price else None,
        original_price=float(listing.original_price) if listing.original_price else None,
        price_drop_percent=listing.get_price_drop_percent(),
        trade_intent=listing.trade_intent,
        trade_interests=listing.trade_interests,
        trade_notes=listing.trade_notes,
        h3_index=listing.h3_index,
        view_count=listing.view_count,
        save_count=listing.save_count,
        message_count=listing.message_count,
        status=listing.status,
        visibility=listing.visibility,
        created_at=listing.created_at,
        updated_at=listing.updated_at
    )


@listings_router.post("/{listing_id}/save")
async def save_listing(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save/bookmark a listing"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if already saved
    existing = db.query(ListingSave).filter(
        ListingSave.listing_id == listing_id,
        ListingSave.user_id == current_user.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already saved")
    
    # Create save
    save = ListingSave(
        listing_id=listing_id,
        user_id=current_user.user_id
    )
    db.add(save)
    
    # Update listing metrics
    listing.record_save()
    
    db.commit()
    
    return {"message": "Listing saved", "save_count": listing.save_count}


@listings_router.delete("/{listing_id}/save")
async def unsave_listing(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove save from a listing"""
    save = db.query(ListingSave).filter(
        ListingSave.listing_id == listing_id,
        ListingSave.user_id == current_user.user_id
    ).first()
    
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    
    db.delete(save)
    
    # Update listing metrics
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if listing:
        listing.save_count = max(0, listing.save_count - 1)
    
    db.commit()
    
    return {"message": "Save removed"}


@listings_router.post("/{listing_id}/price-drop")
async def drop_listing_price(
    listing_id: uuid.UUID,
    price_data: PriceDropRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_client = Depends(get_redis)
):
    """Drop the price of a listing"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your listing")
    
    old_price = float(listing.price) if listing.price else 0
    
    if not listing.drop_price(price_data.new_price):
        raise HTTPException(status_code=400, detail="New price must be lower than current price")
    
    # Create price drop event
    event = FeedEvent.create_price_drop_event(
        listing_id=str(listing.id),
        user_id=str(current_user.user_id),
        h3_index=listing.h3_index,
        title=listing.title,
        old_price=old_price,
        new_price=price_data.new_price,
        image_url=listing.images[0] if listing.images else None
    )
    db.add(event)
    
    db.commit()
    
    # Publish to Redis
    try:
        await redis_client.publish(
            f"feed:{listing.h3_index}",
            json.dumps(event.to_ribbon_item())
        )
    except Exception as e:
        logger.warning(f"Failed to publish price drop event: {e}")
    
    return {
        "message": "Price dropped",
        "old_price": old_price,
        "new_price": price_data.new_price,
        "drop_percent": listing.get_price_drop_percent()
    }


@listings_router.post("/{listing_id}/sold")
async def mark_listing_sold(
    listing_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    redis_client = Depends(get_redis)
):
    """Mark a listing as sold"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your listing")
    
    listing.mark_sold()
    
    # Create sold event
    event = FeedEvent.create_sold_event(
        listing_id=str(listing.id),
        h3_index=listing.h3_index,
        title=listing.title,
        brand=listing.brand,
        price=float(listing.price) if listing.price else None,
        image_url=listing.images[0] if listing.images else None
    )
    db.add(event)
    
    db.commit()
    
    # Publish to Redis
    try:
        await redis_client.publish(
            f"feed:{listing.h3_index}",
            json.dumps(event.to_ribbon_item())
        )
    except Exception as e:
        logger.warning(f"Failed to publish sold event: {e}")
    
    return {"message": "Listing marked as sold", "status": listing.status}

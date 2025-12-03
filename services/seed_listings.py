"""
Seed data for Feed V2 - Marketplace Listings

Creates realistic sneaker marketplace listings across major cities
for testing the hyperlocal feed.
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from faker import Faker
from sqlalchemy.orm import Session
from sqlalchemy import func

from services.core.database import SessionLocal
from services.models.user import User
from services.models.listing import Listing
from services.models.feed_event import FeedEvent
from services.models.heat_index import NeighborhoodHeatIndex
from services.models.trade_match import TradeMatch, MatchType, MatchStatus, UserWishlist
from services.models.location import Location
from geoalchemy2.elements import WKTElement

fake = Faker()

# Sneaker inventory data
SNEAKER_INVENTORY = [
    {"brand": "Jordan", "model": "Air Jordan 1 Retro High OG", "sku": "DZ5485-612", "colorway": "Chicago Lost & Found", "retail": 180},
    {"brand": "Jordan", "model": "Air Jordan 1 Retro High OG", "sku": "555088-134", "colorway": "University Blue", "retail": 170},
    {"brand": "Jordan", "model": "Air Jordan 4 Retro", "sku": "DH6927-111", "colorway": "Military Black", "retail": 210},
    {"brand": "Jordan", "model": "Air Jordan 4 Retro", "sku": "FQ8138-001", "colorway": "Bred Reimagined", "retail": 215},
    {"brand": "Jordan", "model": "Air Jordan 11 Retro", "sku": "CT8012-011", "colorway": "Cool Grey", "retail": 225},
    {"brand": "Jordan", "model": "Air Jordan 3 Retro", "sku": "CT8532-100", "colorway": "White Cement Reimagined", "retail": 200},
    {"brand": "Nike", "model": "Dunk Low Retro", "sku": "DD1391-100", "colorway": "Panda", "retail": 110},
    {"brand": "Nike", "model": "Dunk Low Retro", "sku": "DD1391-101", "colorway": "Grey Fog", "retail": 110},
    {"brand": "Nike", "model": "Dunk Low Premium", "sku": "DQ7681-001", "colorway": "Vintage Green", "retail": 120},
    {"brand": "Nike", "model": "Air Max 1", "sku": "DM0399-101", "colorway": "Patta Waves Monarch", "retail": 160},
    {"brand": "Nike", "model": "Air Max 90", "sku": "CN8490-002", "colorway": "Infrared 2020", "retail": 140},
    {"brand": "New Balance", "model": "550", "sku": "BB550WT1", "colorway": "White Green", "retail": 130},
    {"brand": "New Balance", "model": "550", "sku": "BB550PB1", "colorway": "Aime Leon Dore Green", "retail": 130},
    {"brand": "New Balance", "model": "2002R", "sku": "M2002RHQ", "colorway": "Protection Pack Rain Cloud", "retail": 150},
    {"brand": "New Balance", "model": "990v3", "sku": "M990GY3", "colorway": "Grey", "retail": 200},
    {"brand": "Adidas", "model": "Yeezy Boost 350 V2", "sku": "CP9652", "colorway": "Zebra", "retail": 230},
    {"brand": "Adidas", "model": "Yeezy Boost 350 V2", "sku": "CP9366", "colorway": "Cream White", "retail": 220},
    {"brand": "Adidas", "model": "Yeezy Slide", "sku": "GW1932", "colorway": "Onyx", "retail": 70},
    {"brand": "Adidas", "model": "Samba OG", "sku": "B75806", "colorway": "White Black Gum", "retail": 100},
    {"brand": "Adidas", "model": "Gazelle", "sku": "BB5476", "colorway": "Core Black", "retail": 100},
]

CONDITIONS = ['DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR']
CONDITION_WEIGHTS = [30, 35, 20, 10, 5]
SIZES_MENS = ['8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']
SIZE_WEIGHTS = [10, 15, 18, 20, 18, 15, 12, 8, 5]
TRADE_INTENTS = ['SALE', 'TRADE', 'BOTH']
TRADE_INTENT_WEIGHTS = [60, 15, 25]

CITY_LOCATIONS = {
    "Boston": [
        {"name": "Newbury Street", "lat": 42.3505, "lng": -71.0763},
        {"name": "Harvard Square", "lat": 42.3736, "lng": -71.1190},
        {"name": "Seaport District", "lat": 42.3519, "lng": -71.0445},
    ],
    "NYC": [
        {"name": "SoHo", "lat": 40.7233, "lng": -74.0030},
        {"name": "Union Square", "lat": 40.7359, "lng": -73.9911},
        {"name": "Williamsburg", "lat": 40.7081, "lng": -73.9571},
    ],
    "LA": [
        {"name": "Melrose Ave", "lat": 34.0837, "lng": -118.3365},
        {"name": "Venice Beach", "lat": 34.0195, "lng": -118.4912},
        {"name": "Downtown LA", "lat": 34.0522, "lng": -118.2437},
    ],
    "Chicago": [
        {"name": "Wicker Park", "lat": 41.9073, "lng": -87.6776},
        {"name": "Lincoln Park", "lat": 41.9243, "lng": -87.6368},
    ]
}

DESCRIPTIONS = [
    "Selling to fund my next pickup. No trades unless heat.",
    "Worn twice, kept clean. Receipt available.",
    "Deadstock, never taken out of box. Quick sale.",
    "100% authentic from SNKRS app. More pics on request.",
    "Grails that need a new home. Someone give these love.",
    "Impulse buy, never wore. My loss is your gain.",
    "Downsizing collection. Everything must go.",
    "Wrong size, looking for swap or cash.",
]

TRADE_INTERESTS = [
    "Jordan 1 Chicago", "Travis Scott", "Off-White", "Yeezy 350",
    "Dunk Low heat", "New Balance 550", "AJ4 any cw", "Size 10 grails",
]


def get_price(retail: int, condition: str) -> float:
    multipliers = {'DS': 1.5, 'VNDS': 1.2, 'EXCELLENT': 0.9, 'GOOD': 0.7, 'FAIR': 0.5}
    return round((retail * multipliers.get(condition, 1.0) * random.uniform(0.8, 1.4)) / 5) * 5


def seed_listings(num_listings: int = 100):
    """Seed the database with marketplace listings."""
    print(f"🏪 Seeding {num_listings} marketplace listings...")
    db: Session = SessionLocal()
    
    try:
        users = db.query(User).limit(20).all()
        if not users:
            print("❌ No users found. Run seed_data() first.")
            return
        
        print(f"📦 Found {len(users)} users to assign listings")
        listings_created = 0
        events_created = 0
        
        for i in range(num_listings):
            sneaker = random.choice(SNEAKER_INVENTORY)
            user = random.choice(users)
            city = random.choice(list(CITY_LOCATIONS.keys()))
            loc = random.choice(CITY_LOCATIONS[city])
            
            lat = loc["lat"] + random.uniform(-0.005, 0.005)
            lng = loc["lng"] + random.uniform(-0.005, 0.005)
            
            location = Location(
                point=WKTElement(f'POINT({lng} {lat})', srid=4326),
                geohash=""
            )
            db.add(location)
            db.flush()
            
            condition = random.choices(CONDITIONS, weights=CONDITION_WEIGHTS)[0]
            size = random.choices(SIZES_MENS, weights=SIZE_WEIGHTS)[0]
            trade_intent = random.choices(TRADE_INTENTS, weights=TRADE_INTENT_WEIGHTS)[0]
            price = get_price(sneaker["retail"], condition)
            
            original_price = None
            if random.random() < 0.25:
                original_price = price + random.randint(20, 80)
            
            listing = Listing(
                user_id=user.user_id,
                title=f"{sneaker['model']} '{sneaker['colorway']}'",
                description=random.choice(DESCRIPTIONS),
                brand=sneaker["brand"],
                sku=sneaker["sku"],
                colorway=sneaker["colorway"],
                size=size,
                size_type='MENS',
                condition=condition,
                condition_notes=f"{condition} condition. " + ("OG all." if condition in ['DS', 'VNDS'] else "Minor wear."),
                has_box=condition in ['DS', 'VNDS'] or random.random() < 0.5,
                has_extras=random.random() < 0.15,
                images=[f"https://images.stockx.com/{sneaker['sku'].replace('-', '')}.jpg"],
                authenticity_score=random.randint(70, 100),
                is_verified=random.random() < 0.25,
                price=Decimal(str(price)),
                original_price=Decimal(str(original_price)) if original_price else None,
                trade_intent=trade_intent,
                trade_interests=random.sample(TRADE_INTERESTS, k=random.randint(1, 3)) if trade_intent != 'SALE' else None,
                location_id=location.id,
                view_count=random.randint(0, 300),
                save_count=random.randint(0, 40),
                message_count=random.randint(0, 15),
                rank_score=random.uniform(0, 100),
                demand_score=random.uniform(0, 50),
                status='ACTIVE',
                visibility='public',
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                expires_at=datetime.utcnow() + timedelta(days=30),
            )
            listing.set_h3_indexes(lat, lng)
            db.add(listing)
            db.flush()
            listings_created += 1
            
            # Create feed events for recent listings
            if listing.created_at > datetime.utcnow() - timedelta(days=2):
                event = FeedEvent.create_listing_event(
                    listing_id=str(listing.id),
                    user_id=str(user.user_id),
                    h3_index=listing.h3_index,
                    title=listing.title,
                    brand=listing.brand,
                    price=float(listing.price) if listing.price else None,
                    condition=listing.condition,
                    image_url=listing.images[0] if listing.images else None,
                    trade_intent=listing.trade_intent
                )
                db.add(event)
                events_created += 1
            
            if (i + 1) % 25 == 0:
                print(f"  Created {i + 1}/{num_listings}...")
        
        db.commit()
        print(f"✅ Created {listings_created} listings, {events_created} feed events")
        
        # Create User Wishlists
        print("✨ Creating user wishlists...")
        wishlists_created = 0
        for user in users:
            # Create 1-3 wishlist items for each user
            for _ in range(random.randint(1, 3)):
                wanted = random.choice(SNEAKER_INVENTORY)
                size = random.choices(SIZES_MENS, weights=SIZE_WEIGHTS)[0]
                
                wishlist = UserWishlist(
                    user_id=user.user_id,
                    sku=wanted["sku"],
                    brand=wanted["brand"],
                    model=f"{wanted['model']} {wanted['colorway']}",
                    size=size,
                    size_type='MENS',
                    size_flexible=random.choice([True, False]),
                    max_price=wanted["retail"] * random.uniform(1.1, 1.5),
                    min_condition=random.choice(['GOOD', 'EXCELLENT', 'VNDS']),
                    priority=random.randint(1, 10)
                )
                db.add(wishlist)
                wishlists_created += 1
        
        db.commit()
        print(f"✅ Created {wishlists_created} wishlist items")

        # Create Trade Matches
        print("🤝 Generating trade matches...")
        matches_created = 0
        
        # Fetch all listings to create pairs
        all_listings = db.query(Listing).filter(Listing.status == 'ACTIVE').all()
        if len(all_listings) >= 2:
            # Create random 2-way matches
            for _ in range(min(20, len(all_listings) // 2)):
                listing_a = random.choice(all_listings)
                listing_b = random.choice(all_listings)
                
                if listing_a.user_id == listing_b.user_id:
                    continue
                
                # Simulate a match scenario
                match = TradeMatch.create_two_way(
                    user_a_id=str(listing_a.user_id),
                    user_b_id=str(listing_b.user_id),
                    listing_a_id=str(listing_a.id),
                    listing_b_id=str(listing_b.id),
                    listing_a_title=listing_a.title,
                    listing_b_title=listing_b.title,
                    locality_score=random.randint(50, 100),
                    max_distance=random.uniform(0.5, 5.0)
                )
                
                # Randomize status
                status_choice = random.choices(
                    [MatchStatus.SUGGESTED, MatchStatus.VIEWED, MatchStatus.PENDING], 
                    weights=[50, 30, 20]
                )[0]
                match.status = status_choice
                
                # Calculate fake match score
                match.match_score = random.uniform(70.0, 99.0)
                match.value_balance = random.uniform(0.8, 1.2)
                
                db.add(match)
                matches_created += 1
        
        db.commit()
        print(f"✅ Created {matches_created} trade matches")

        # Update heat indexes
        print("🔥 Updating heat indexes...")
        update_heat_indexes(db)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def update_heat_indexes(db: Session):
    """Update heat indexes based on listings."""
    h3_indexes = db.query(Listing.h3_index).filter(
        Listing.status == 'ACTIVE'
    ).distinct().all()
    
    for (h3_index,) in h3_indexes:
        heat_index = NeighborhoodHeatIndex.get_or_create(db, h3_index)
        
        listing_count = db.query(func.count(Listing.id)).filter(
            Listing.h3_index == h3_index, Listing.status == 'ACTIVE'
        ).scalar()
        
        heat_index.active_listings = listing_count
        heat_index.listing_velocity = listing_count / 24
        
        avg_price = db.query(func.avg(Listing.price)).filter(
            Listing.h3_index == h3_index, Listing.status == 'ACTIVE'
        ).scalar()
        heat_index.avg_listing_price = float(avg_price) if avg_price else None
        
        brand_counts = db.query(Listing.brand, func.count(Listing.id)).filter(
            Listing.h3_index == h3_index, Listing.status == 'ACTIVE'
        ).group_by(Listing.brand).order_by(func.count(Listing.id).desc()).limit(3).all()
        
        heat_index.trending_brands = [{"brand": b, "score": c * 10} for b, c in brand_counts]
        heat_index.compute_heat_score()
    
    db.commit()
    print(f"  Updated {len(h3_indexes)} heat indexes")


def clear_listings():
    """Clear all listings data."""
    print("🧹 Clearing listings...")
    db: Session = SessionLocal()
    try:
        db.query(FeedEvent).delete()
        db.query(Listing).delete()
        db.query(NeighborhoodHeatIndex).delete()
        db.commit()
        print("✅ Cleared")
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        clear_listings()
    else:
        num = int(sys.argv[1]) if len(sys.argv) > 1 else 100
        seed_listings(num)

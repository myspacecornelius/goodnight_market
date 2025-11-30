"""
Listing Model - Marketplace item listings for the hyperlocal feed.
Supports sale, trade, or both with authenticity tracking and engagement metrics.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, 
    Text, DECIMAL, Index, CheckConstraint, Enum, Float
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from services.database import Base


class ListingCondition:
    """Condition constants for sneakers/items"""
    DS = 'DS'           # Deadstock (brand new, never worn)
    VNDS = 'VNDS'       # Very Near Deadstock (tried on only)
    EXCELLENT = 'EXCELLENT'  # Worn 1-3 times, minimal signs
    GOOD = 'GOOD'       # Light wear, minor creasing
    FAIR = 'FAIR'       # Moderate wear, visible signs
    BEAT = 'BEAT'       # Heavy wear, for beaters


class ListingIntent:
    """Trade intent constants"""
    SALE = 'SALE'       # For sale only
    TRADE = 'TRADE'     # For trade only
    BOTH = 'BOTH'       # Open to sale or trade


class ListingStatus:
    """Listing status constants"""
    ACTIVE = 'ACTIVE'       # Live and available
    PENDING = 'PENDING'     # Transaction in progress
    SOLD = 'SOLD'           # Sold
    TRADED = 'TRADED'       # Traded
    EXPIRED = 'EXPIRED'     # Auto-expired
    DELETED = 'DELETED'     # User deleted


class Listing(Base):
    __tablename__ = 'listings'
    
    # Core identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Product information
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    brand = Column(String(100), nullable=False, index=True)
    sku = Column(String(100), nullable=True, index=True)  # Style code (e.g., DZ5485-612)
    colorway = Column(String(200), nullable=True)
    size = Column(String(20), nullable=False, index=True)
    size_type = Column(
        Enum('MENS', 'WOMENS', 'GS', 'PS', 'TD', 'UNISEX', name='size_type_enum'),
        nullable=False, default='MENS'
    )
    
    # Condition and authenticity
    condition = Column(
        Enum('DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR', 'BEAT', name='condition_enum'),
        nullable=False, index=True
    )
    condition_notes = Column(Text, nullable=True)
    has_box = Column(Boolean, default=True, nullable=False)
    has_extras = Column(Boolean, default=False, nullable=False)  # Extra laces, etc.
    
    # Media
    images = Column(ARRAY(String), nullable=False)  # Required: at least 1 image
    authenticity_photos = Column(ARRAY(String), nullable=True)  # Tag, receipt, etc.
    
    # Authenticity scoring (0-100)
    authenticity_score = Column(Integer, default=0, nullable=False)
    authenticity_notes = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)  # Staff verified
    
    # Pricing and trade intent
    price = Column(DECIMAL(10, 2), nullable=True)  # Null if trade-only
    original_price = Column(DECIMAL(10, 2), nullable=True)  # Track price drops
    trade_intent = Column(
        Enum('SALE', 'TRADE', 'BOTH', name='trade_intent_enum'),
        nullable=False, default='SALE'
    )
    trade_interests = Column(ARRAY(String), nullable=True)  # SKUs/brands wanted
    trade_notes = Column(Text, nullable=True)  # "Looking for Jordan 1s size 10"
    
    # Location - H3 indexed for hyperlocal queries
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id', ondelete='SET NULL'), nullable=True)
    h3_index = Column(String(15), nullable=False, index=True)  # Resolution 9 (~0.25mi)
    h3_index_r8 = Column(String(15), nullable=True, index=True)  # Resolution 8 (~1mi) for broader queries
    h3_index_r7 = Column(String(15), nullable=True, index=True)  # Resolution 7 (~3mi)
    
    # Engagement metrics
    view_count = Column(Integer, default=0, nullable=False)
    save_count = Column(Integer, default=0, nullable=False)
    message_count = Column(Integer, default=0, nullable=False)
    share_count = Column(Integer, default=0, nullable=False)
    
    # Ranking score (computed by worker)
    rank_score = Column(Float, default=0.0, nullable=False)
    demand_score = Column(Float, default=0.0, nullable=False)  # From heat index
    
    # Status and lifecycle
    status = Column(
        Enum('ACTIVE', 'PENDING', 'SOLD', 'TRADED', 'EXPIRED', 'DELETED', name='listing_status_enum'),
        nullable=False, default='ACTIVE', index=True
    )
    
    # Visibility
    visibility = Column(
        Enum('public', 'local', 'followers', 'private', name='listing_visibility_enum'),
        nullable=False, default='public'
    )
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Auto-expire after 30 days
    sold_at = Column(DateTime(timezone=True), nullable=True)
    
    # External references
    drop_id = Column(UUID(as_uuid=True), ForeignKey('drops.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="listings")
    location = relationship("Location")
    drop = relationship("Drop")
    saves = relationship("ListingSave", back_populates="listing", cascade="all, delete-orphan")
    
    # Indexes and constraints
    __table_args__ = (
        # H3 spatial indexes for hyperlocal queries
        Index('ix_listings_h3_status', h3_index, status),
        Index('ix_listings_h3_r8_status', h3_index_r8, status),
        Index('ix_listings_h3_r7_status', h3_index_r7, status),
        
        # Feed ranking indexes
        Index('ix_listings_rank_score', rank_score.desc()),
        Index('ix_listings_status_created', status, created_at.desc()),
        Index('ix_listings_brand_status', brand, status),
        Index('ix_listings_size_status', size, status),
        
        # Trade matching indexes
        Index('ix_listings_trade_intent', trade_intent, status),
        Index('ix_listings_sku_status', sku, status),
        
        # Price filtering
        Index('ix_listings_price_status', price, status),
        
        # User listings
        Index('ix_listings_user_status', user_id, status, created_at.desc()),
        
        # Engagement
        Index('ix_listings_save_count', save_count.desc()),
        
        # Data quality constraints
        CheckConstraint('view_count >= 0', name='positive_view_count'),
        CheckConstraint('save_count >= 0', name='positive_save_count'),
        CheckConstraint('message_count >= 0', name='positive_message_count'),
        CheckConstraint('authenticity_score >= 0 AND authenticity_score <= 100', name='valid_authenticity_score'),
        CheckConstraint('price >= 0 OR price IS NULL', name='positive_price'),
        CheckConstraint("array_length(images, 1) >= 1", name='at_least_one_image'),
    )
    
    def set_h3_indexes(self, lat: float, lng: float):
        """Set H3 indexes at multiple resolutions from coordinates"""
        import h3
        self.h3_index = h3.geo_to_h3(lat, lng, 9)    # ~0.25mi
        self.h3_index_r8 = h3.geo_to_h3(lat, lng, 8)  # ~1mi
        self.h3_index_r7 = h3.geo_to_h3(lat, lng, 7)  # ~3mi
    
    def record_view(self):
        """Increment view count"""
        self.view_count += 1
    
    def record_save(self):
        """Increment save count"""
        self.save_count += 1
        self.demand_score += 1
    
    def record_message(self):
        """Increment message count"""
        self.message_count += 1
        self.demand_score += 2  # DMs indicate higher intent
    
    def drop_price(self, new_price: float):
        """Record a price drop"""
        if self.price and new_price < float(self.price):
            if not self.original_price:
                self.original_price = self.price
            self.price = new_price
            return True
        return False
    
    def mark_sold(self):
        """Mark listing as sold"""
        self.status = ListingStatus.SOLD
        self.sold_at = datetime.utcnow()
    
    def mark_traded(self):
        """Mark listing as traded"""
        self.status = ListingStatus.TRADED
        self.sold_at = datetime.utcnow()
    
    def is_active(self) -> bool:
        """Check if listing is active and not expired"""
        if self.status != ListingStatus.ACTIVE:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True
    
    def get_price_drop_percent(self) -> float:
        """Get percentage price drop from original"""
        if not self.original_price or not self.price:
            return 0.0
        return ((float(self.original_price) - float(self.price)) / float(self.original_price)) * 100
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "title": self.title,
            "description": self.description,
            "brand": self.brand,
            "sku": self.sku,
            "colorway": self.colorway,
            "size": self.size,
            "size_type": self.size_type,
            "condition": self.condition,
            "condition_notes": self.condition_notes,
            "has_box": self.has_box,
            "has_extras": self.has_extras,
            "images": self.images,
            "authenticity_score": self.authenticity_score,
            "is_verified": self.is_verified,
            "price": float(self.price) if self.price else None,
            "original_price": float(self.original_price) if self.original_price else None,
            "price_drop_percent": self.get_price_drop_percent(),
            "trade_intent": self.trade_intent,
            "trade_interests": self.trade_interests,
            "trade_notes": self.trade_notes,
            "h3_index": self.h3_index,
            "view_count": self.view_count,
            "save_count": self.save_count,
            "message_count": self.message_count,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def to_feed_item(self, distance_miles: float = None) -> dict:
        """Convert to feed item format with distance"""
        base = self.to_dict()
        base["distance_miles"] = distance_miles
        base["rank_score"] = self.rank_score
        base["demand_score"] = self.demand_score
        return base


class ListingSave(Base):
    """Track user saves/bookmarks on listings"""
    __tablename__ = 'listing_saves'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey('listings.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    listing = relationship("Listing", back_populates="saves")
    
    __table_args__ = (
        Index('ix_listing_saves_user', user_id),
        Index('ix_listing_saves_listing', listing_id),
        # Unique constraint: user can only save a listing once
        Index('ix_listing_saves_unique', user_id, listing_id, unique=True),
    )

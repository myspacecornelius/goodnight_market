"""
FeedEvent Model - Event-driven feed engine.
Every action becomes a feed event for real-time updates without heavy recomputing.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Index, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
from services.database import Base


class FeedEventType:
    """Feed event type constants"""
    NEW_LISTING = 'NEW_LISTING'           # New item posted
    PRICE_DROP = 'PRICE_DROP'             # Price reduced
    ITEM_SOLD = 'ITEM_SOLD'               # Item sold nearby
    ITEM_TRADED = 'ITEM_TRADED'           # Trade completed
    TRADE_REQUEST = 'TRADE_REQUEST'       # New trade request
    SHOP_BROADCAST = 'SHOP_BROADCAST'     # Shop announcement
    SHOP_RESTOCK = 'SHOP_RESTOCK'         # Shop restock alert
    FLASH_SALE = 'FLASH_SALE'             # Flash sale started
    DROP_LIVE = 'DROP_LIVE'               # Drop went live
    DROP_SOLD_OUT = 'DROP_SOLD_OUT'       # Drop sold out
    USER_PICKUP = 'USER_PICKUP'           # User picked up release
    MEETUP_COMPLETED = 'MEETUP_COMPLETED' # Local exchange completed


class FeedEvent(Base):
    """
    Event-driven feed engine.
    
    Every significant action creates a FeedEvent that can be:
    1. Pushed to WebSocket subscribers in real-time
    2. Queried for the activity ribbon
    3. Used to invalidate/update feed caches
    """
    __tablename__ = 'feed_events'
    
    # Core identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event classification
    event_type = Column(
        Enum(
            'NEW_LISTING', 'PRICE_DROP', 'ITEM_SOLD', 'ITEM_TRADED',
            'TRADE_REQUEST', 'SHOP_BROADCAST', 'SHOP_RESTOCK', 'FLASH_SALE',
            'DROP_LIVE', 'DROP_SOLD_OUT', 'USER_PICKUP', 'MEETUP_COMPLETED',
            name='feed_event_type_enum'
        ),
        nullable=False, index=True
    )
    
    # Entity reference (polymorphic)
    entity_type = Column(String(50), nullable=False, index=True)  # 'listing', 'drop', 'store', 'meetup'
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Actor (user who triggered event, if applicable)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Location - H3 indexed for geographic filtering
    h3_index = Column(String(15), nullable=False, index=True)  # Resolution 9
    h3_index_r8 = Column(String(15), nullable=True, index=True)  # Resolution 8
    h3_index_r7 = Column(String(15), nullable=True, index=True)  # Resolution 7
    
    # Event payload (flexible JSON for event-specific data)
    payload = Column(JSON, nullable=False, default=dict)
    """
    Payload examples by event type:
    
    NEW_LISTING:
        {
            "title": "Jordan 4 Bred",
            "brand": "Jordan",
            "price": 250,
            "condition": "DS",
            "image_url": "...",
            "trade_intent": "BOTH"
        }
    
    PRICE_DROP:
        {
            "title": "...",
            "old_price": 300,
            "new_price": 250,
            "drop_percent": 16.7,
            "image_url": "..."
        }
    
    ITEM_SOLD:
        {
            "title": "...",
            "brand": "...",
            "price": 250,
            "image_url": "..."
        }
    
    SHOP_RESTOCK:
        {
            "store_name": "Foot Locker Downtown",
            "product_name": "Jordan 4 Bred",
            "sku": "DH6927-061",
            "sizes_available": ["9", "10", "11"]
        }
    
    DROP_LIVE:
        {
            "drop_name": "...",
            "brand": "...",
            "retail_price": 200,
            "image_url": "...",
            "purchase_url": "..."
        }
    """
    
    # Display text (pre-computed for activity ribbon)
    display_text = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # For time-limited events
    
    # Indexes for efficient querying
    __table_args__ = (
        # Primary feed query: events in area, sorted by time
        Index('ix_feed_events_h3_time', h3_index, created_at.desc()),
        Index('ix_feed_events_h3_r8_time', h3_index_r8, created_at.desc()),
        Index('ix_feed_events_h3_r7_time', h3_index_r7, created_at.desc()),
        
        # Type-specific queries
        Index('ix_feed_events_type_time', event_type, created_at.desc()),
        Index('ix_feed_events_h3_type', h3_index, event_type, created_at.desc()),
        
        # Entity lookup
        Index('ix_feed_events_entity', entity_type, entity_id),
        
        # User activity
        Index('ix_feed_events_user_time', user_id, created_at.desc()),
        
        # Cleanup: expired events
        Index('ix_feed_events_expires', expires_at),
    )
    
    def set_h3_indexes(self, lat: float, lng: float):
        """Set H3 indexes at multiple resolutions from coordinates"""
        import h3
        self.h3_index = h3.geo_to_h3(lat, lng, 9)
        self.h3_index_r8 = h3.geo_to_h3(lat, lng, 8)
        self.h3_index_r7 = h3.geo_to_h3(lat, lng, 7)
    
    def is_expired(self) -> bool:
        """Check if event has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def to_ribbon_item(self) -> dict:
        """Convert to activity ribbon display format"""
        return {
            "id": str(self.id),
            "type": self.event_type,
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id),
            "display_text": self.display_text,
            "payload": self.payload,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_dict(self) -> dict:
        """Convert to full dictionary for API responses"""
        return {
            "id": str(self.id),
            "event_type": self.event_type,
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id),
            "user_id": str(self.user_id) if self.user_id else None,
            "h3_index": self.h3_index,
            "payload": self.payload,
            "display_text": self.display_text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
    
    @classmethod
    def create_listing_event(
        cls,
        listing_id: str,
        user_id: str,
        h3_index: str,
        title: str,
        brand: str,
        price: float,
        condition: str,
        image_url: str,
        trade_intent: str
    ) -> "FeedEvent":
        """Factory method for new listing events"""
        import h3 as h3_lib
        lat, lng = h3_lib.h3_to_geo(h3_index)
        
        event = cls(
            event_type=FeedEventType.NEW_LISTING,
            entity_type='listing',
            entity_id=listing_id,
            user_id=user_id,
            h3_index=h3_index,
            payload={
                "title": title,
                "brand": brand,
                "price": price,
                "condition": condition,
                "image_url": image_url,
                "trade_intent": trade_intent
            },
            display_text=f"New listing: {title} - ${price}" if price else f"New listing: {title} (Trade)"
        )
        event.set_h3_indexes(lat, lng)
        return event
    
    @classmethod
    def create_price_drop_event(
        cls,
        listing_id: str,
        user_id: str,
        h3_index: str,
        title: str,
        old_price: float,
        new_price: float,
        image_url: str
    ) -> "FeedEvent":
        """Factory method for price drop events"""
        import h3 as h3_lib
        lat, lng = h3_lib.h3_to_geo(h3_index)
        
        drop_percent = ((old_price - new_price) / old_price) * 100
        
        event = cls(
            event_type=FeedEventType.PRICE_DROP,
            entity_type='listing',
            entity_id=listing_id,
            user_id=user_id,
            h3_index=h3_index,
            payload={
                "title": title,
                "old_price": old_price,
                "new_price": new_price,
                "drop_percent": round(drop_percent, 1),
                "image_url": image_url
            },
            display_text=f"Price drop: {title} ${old_price} → ${new_price} ({drop_percent:.0f}% off)"
        )
        event.set_h3_indexes(lat, lng)
        return event
    
    @classmethod
    def create_sold_event(
        cls,
        listing_id: str,
        h3_index: str,
        title: str,
        brand: str,
        price: float,
        image_url: str
    ) -> "FeedEvent":
        """Factory method for item sold events"""
        import h3 as h3_lib
        lat, lng = h3_lib.h3_to_geo(h3_index)
        
        event = cls(
            event_type=FeedEventType.ITEM_SOLD,
            entity_type='listing',
            entity_id=listing_id,
            h3_index=h3_index,
            payload={
                "title": title,
                "brand": brand,
                "price": price,
                "image_url": image_url
            },
            display_text=f"Just sold nearby: {title}"
        )
        event.set_h3_indexes(lat, lng)
        return event

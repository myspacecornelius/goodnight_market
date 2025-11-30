"""
TradeMatch Model - Trade opportunity matching system.
Surfaces two-way and three-way trade loops based on user inventory and wishlists.
"""

import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Float, Index, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.sql import func
from services.database import Base


class MatchType:
    """Trade match type constants"""
    TWO_WAY = 'TWO_WAY'       # Direct swap: A wants B's item, B wants A's item
    THREE_WAY = 'THREE_WAY'   # Triangle: A→B→C→A


class MatchStatus:
    """Trade match status constants"""
    SUGGESTED = 'SUGGESTED'   # System suggested, not yet viewed
    VIEWED = 'VIEWED'         # User has seen the suggestion
    PENDING = 'PENDING'       # One party has initiated
    ACCEPTED = 'ACCEPTED'     # All parties accepted
    COMPLETED = 'COMPLETED'   # Trade completed
    DECLINED = 'DECLINED'     # One party declined
    EXPIRED = 'EXPIRED'       # Timed out


class TradeMatch(Base):
    """
    Trade opportunity matching.
    
    The system analyzes:
    1. User's active listings (what they have)
    2. User's saved listings (what they want)
    3. Trade interests on listings (explicit wants)
    
    Then finds local matches to reduce friction.
    """
    __tablename__ = 'trade_matches'
    
    # Core identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Match classification
    match_type = Column(
        Enum('TWO_WAY', 'THREE_WAY', name='match_type_enum'),
        nullable=False, index=True
    )
    
    # Participants and their roles
    participants = Column(JSON, nullable=False)
    """
    Two-way example:
    [
        {
            "user_id": "uuid-1",
            "offers_listing_id": "listing-a",
            "wants_listing_id": "listing-b",
            "offers_title": "Jordan 4 Bred Size 10",
            "wants_title": "Dunk Low Panda Size 10"
        },
        {
            "user_id": "uuid-2", 
            "offers_listing_id": "listing-b",
            "wants_listing_id": "listing-a",
            "offers_title": "Dunk Low Panda Size 10",
            "wants_title": "Jordan 4 Bred Size 10"
        }
    ]
    
    Three-way example:
    [
        {"user_id": "uuid-1", "offers_listing_id": "a", "wants_listing_id": "b"},
        {"user_id": "uuid-2", "offers_listing_id": "b", "wants_listing_id": "c"},
        {"user_id": "uuid-3", "offers_listing_id": "c", "wants_listing_id": "a"}
    ]
    """
    
    # All user IDs involved (for efficient querying)
    user_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    
    # All listing IDs involved
    listing_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    
    # Location - common area for all participants
    h3_common = Column(String(15), nullable=True, index=True)  # Shared hex (if any)
    locality_score = Column(Integer, default=0, nullable=False)  # 0-100, higher = more local
    max_distance_miles = Column(Float, nullable=True)  # Max distance between any two participants
    
    # Match quality scoring
    match_score = Column(Float, default=0.0, nullable=False)  # Overall match quality
    value_balance = Column(Float, default=0.0, nullable=False)  # How balanced the trade values are
    
    # Status tracking
    status = Column(
        Enum('SUGGESTED', 'VIEWED', 'PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED', 'EXPIRED',
             name='match_status_enum'),
        nullable=False, default='SUGGESTED', index=True
    )
    
    # Acceptance tracking (for multi-party)
    acceptances = Column(JSON, nullable=True)
    """
    {
        "uuid-1": {"accepted": true, "at": "2024-01-15T10:30:00Z"},
        "uuid-2": {"accepted": false, "at": null}
    }
    """
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resulting meetup (if trade proceeds)
    meetup_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        # User's matches
        Index('ix_trade_matches_users', user_ids, postgresql_using='gin'),
        Index('ix_trade_matches_listings', listing_ids, postgresql_using='gin'),
        
        # Status queries
        Index('ix_trade_matches_status_created', status, created_at.desc()),
        
        # Location-based
        Index('ix_trade_matches_h3_status', h3_common, status),
        
        # Score ranking
        Index('ix_trade_matches_score', match_score.desc()),
        
        # Cleanup
        Index('ix_trade_matches_expires', expires_at),
    )
    
    def is_expired(self) -> bool:
        """Check if match has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def record_view(self, user_id: str):
        """Record that a user viewed this match"""
        if self.status == MatchStatus.SUGGESTED:
            self.status = MatchStatus.VIEWED
    
    def record_acceptance(self, user_id: str):
        """Record a user's acceptance of the trade"""
        if not self.acceptances:
            self.acceptances = {}
        
        self.acceptances[user_id] = {
            "accepted": True,
            "at": datetime.utcnow().isoformat()
        }
        
        # Check if all parties have accepted
        all_accepted = all(
            self.acceptances.get(str(uid), {}).get("accepted", False)
            for uid in self.user_ids
        )
        
        if all_accepted:
            self.status = MatchStatus.ACCEPTED
        elif self.status in [MatchStatus.SUGGESTED, MatchStatus.VIEWED]:
            self.status = MatchStatus.PENDING
    
    def record_decline(self, user_id: str):
        """Record a user's decline of the trade"""
        if not self.acceptances:
            self.acceptances = {}
        
        self.acceptances[user_id] = {
            "accepted": False,
            "declined": True,
            "at": datetime.utcnow().isoformat()
        }
        
        self.status = MatchStatus.DECLINED
    
    def complete(self):
        """Mark trade as completed"""
        self.status = MatchStatus.COMPLETED
        self.completed_at = datetime.utcnow()
    
    def get_user_role(self, user_id: str) -> dict:
        """Get a specific user's role in the trade"""
        for participant in self.participants:
            if participant.get("user_id") == user_id:
                return participant
        return None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "match_type": self.match_type,
            "participants": self.participants,
            "locality_score": self.locality_score,
            "max_distance_miles": self.max_distance_miles,
            "match_score": round(self.match_score, 2),
            "value_balance": round(self.value_balance, 2),
            "status": self.status,
            "acceptances": self.acceptances,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
    
    def to_user_view(self, user_id: str) -> dict:
        """Convert to user-specific view (what they give/get)"""
        user_role = self.get_user_role(user_id)
        
        if not user_role:
            return self.to_dict()
        
        # Find what user gets
        other_participants = [p for p in self.participants if p.get("user_id") != user_id]
        
        return {
            "id": str(self.id),
            "match_type": self.match_type,
            "you_offer": {
                "listing_id": user_role.get("offers_listing_id"),
                "title": user_role.get("offers_title"),
            },
            "you_receive": {
                "listing_id": user_role.get("wants_listing_id"),
                "title": user_role.get("wants_title"),
            },
            "other_parties": len(other_participants),
            "locality_score": self.locality_score,
            "match_score": round(self.match_score, 2),
            "status": self.status,
            "your_acceptance": self.acceptances.get(user_id) if self.acceptances else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    @classmethod
    def create_two_way(
        cls,
        user_a_id: str,
        user_b_id: str,
        listing_a_id: str,
        listing_b_id: str,
        listing_a_title: str,
        listing_b_title: str,
        h3_common: str = None,
        locality_score: int = 0,
        max_distance: float = None
    ) -> "TradeMatch":
        """Factory method for two-way trade matches"""
        return cls(
            match_type=MatchType.TWO_WAY,
            participants=[
                {
                    "user_id": user_a_id,
                    "offers_listing_id": listing_a_id,
                    "wants_listing_id": listing_b_id,
                    "offers_title": listing_a_title,
                    "wants_title": listing_b_title,
                },
                {
                    "user_id": user_b_id,
                    "offers_listing_id": listing_b_id,
                    "wants_listing_id": listing_a_id,
                    "offers_title": listing_b_title,
                    "wants_title": listing_a_title,
                }
            ],
            user_ids=[user_a_id, user_b_id],
            listing_ids=[listing_a_id, listing_b_id],
            h3_common=h3_common,
            locality_score=locality_score,
            max_distance_miles=max_distance,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )


class UserWishlist(Base):
    """
    User wishlist items for trade matching.
    Can be specific SKUs or general interests.
    """
    __tablename__ = 'user_wishlists'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    
    # What they want (at least one required)
    sku = Column(String(100), nullable=True, index=True)  # Specific style code
    brand = Column(String(100), nullable=True, index=True)  # Or just a brand
    model = Column(String(200), nullable=True)  # Or a model name
    
    # Size requirements
    size = Column(String(20), nullable=True)
    size_type = Column(String(20), nullable=True)  # MENS, WOMENS, etc.
    size_flexible = Column(Boolean, default=False)  # Accept nearby sizes
    
    # Price range
    max_price = Column(Float, nullable=True)
    
    # Condition requirements
    min_condition = Column(String(20), nullable=True)  # Minimum acceptable condition
    
    # Priority
    priority = Column(Integer, default=5, nullable=False)  # 1-10, higher = more wanted
    
    # Notifications
    notify_on_match = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('ix_wishlist_user', user_id),
        Index('ix_wishlist_sku', sku),
        Index('ix_wishlist_brand', brand),
        Index('ix_wishlist_priority', user_id, priority.desc()),
    )
    
    def matches_listing(self, listing) -> bool:
        """Check if a listing matches this wishlist item"""
        # SKU match (exact)
        if self.sku and listing.sku:
            if self.sku.upper() != listing.sku.upper():
                return False
        
        # Brand match
        if self.brand and listing.brand:
            if self.brand.upper() != listing.brand.upper():
                return False
        
        # Size match
        if self.size and listing.size:
            if not self.size_flexible:
                if self.size != listing.size:
                    return False
            else:
                # Allow half size difference
                try:
                    want_size = float(self.size)
                    have_size = float(listing.size)
                    if abs(want_size - have_size) > 0.5:
                        return False
                except ValueError:
                    if self.size != listing.size:
                        return False
        
        # Price check
        if self.max_price and listing.price:
            if float(listing.price) > self.max_price:
                return False
        
        # Condition check
        if self.min_condition and listing.condition:
            condition_order = ['DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR', 'BEAT']
            try:
                min_idx = condition_order.index(self.min_condition)
                listing_idx = condition_order.index(listing.condition)
                if listing_idx > min_idx:  # Worse condition
                    return False
            except ValueError:
                pass
        
        return True
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "sku": self.sku,
            "brand": self.brand,
            "model": self.model,
            "size": self.size,
            "size_type": self.size_type,
            "size_flexible": self.size_flexible,
            "max_price": self.max_price,
            "min_condition": self.min_condition,
            "priority": self.priority,
            "notify_on_match": self.notify_on_match,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

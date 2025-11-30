"""
NeighborhoodHeatIndex Model - Rolling demand indicators for micro-zones.
Tracks what's driving demand in immediate areas based on engagement signals.
"""

import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, DateTime, Float, Index
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.sql import func
from services.database import Base


class NeighborhoodHeatIndex(Base):
    """
    Rolling indicator of demand in a micro-zone (~0.25 mile hex).
    
    Updated periodically by Celery worker based on:
    - Saves on listings
    - Direct messages sent
    - Trade requests
    - Search volume
    - Recent listings
    
    Allows users to see "what's moving" around them in real time.
    """
    __tablename__ = 'neighborhood_heat_index'
    
    # Core identity - one record per H3 hex
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    h3_index = Column(String(15), unique=True, nullable=False, index=True)  # Resolution 9
    
    # Parent hexes for aggregation queries
    h3_index_r8 = Column(String(15), nullable=True, index=True)
    h3_index_r7 = Column(String(15), nullable=True, index=True)
    
    # Velocity metrics (activity per hour, rolling window)
    save_velocity = Column(Float, default=0.0, nullable=False)
    dm_velocity = Column(Float, default=0.0, nullable=False)
    trade_request_velocity = Column(Float, default=0.0, nullable=False)
    listing_velocity = Column(Float, default=0.0, nullable=False)
    view_velocity = Column(Float, default=0.0, nullable=False)
    
    # Volume metrics (absolute counts in window)
    search_volume = Column(Integer, default=0, nullable=False)
    active_listings = Column(Integer, default=0, nullable=False)
    active_users = Column(Integer, default=0, nullable=False)
    
    # Composite heat score (0-100, computed from velocities)
    heat_score = Column(Float, default=0.0, nullable=False)
    heat_level = Column(String(20), default='cold', nullable=False)  # cold, warm, hot, fire
    
    # Trending data (top items driving demand)
    trending_brands = Column(JSON, nullable=True)
    """
    Example:
    [
        {"brand": "Nike", "score": 85, "change": 12},
        {"brand": "Jordan", "score": 72, "change": -3},
        {"brand": "New Balance", "score": 45, "change": 8}
    ]
    """
    
    trending_skus = Column(JSON, nullable=True)
    """
    Example:
    [
        {"sku": "DH6927-061", "name": "Jordan 4 Bred", "score": 92},
        {"sku": "FQ8060-121", "name": "Air Max 1 Patta", "score": 78}
    ]
    """
    
    trending_sizes = Column(JSON, nullable=True)
    """
    Example:
    [
        {"size": "10", "demand_ratio": 1.8},
        {"size": "9.5", "demand_ratio": 1.5}
    ]
    """
    
    hot_searches = Column(ARRAY(String), nullable=True)
    """Top search terms in this zone: ["bred 4", "panda dunk", "travis scott"]"""
    
    # Price trends
    avg_listing_price = Column(Float, nullable=True)
    price_trend = Column(String(20), nullable=True)  # 'rising', 'falling', 'stable'
    price_change_percent = Column(Float, nullable=True)
    
    # Time window tracking
    window_hours = Column(Integer, default=24, nullable=False)  # Rolling window size
    window_start = Column(DateTime(timezone=True), nullable=True)
    window_end = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('ix_heat_index_score', heat_score.desc()),
        Index('ix_heat_index_level', heat_level),
        Index('ix_heat_index_r8', h3_index_r8),
        Index('ix_heat_index_r7', h3_index_r7),
        Index('ix_heat_index_updated', updated_at.desc()),
    )
    
    def set_h3_indexes(self, lat: float = None, lng: float = None):
        """Set parent H3 indexes from the primary index or coordinates"""
        import h3
        
        if lat is not None and lng is not None:
            self.h3_index = h3.geo_to_h3(lat, lng, 9)
        
        if self.h3_index:
            self.h3_index_r8 = h3.h3_to_parent(self.h3_index, 8)
            self.h3_index_r7 = h3.h3_to_parent(self.h3_index, 7)
    
    def compute_heat_score(self):
        """
        Compute composite heat score from velocity metrics.
        Weights can be tuned based on what best predicts demand.
        """
        # Weighted sum of velocities (handle None values)
        score = (
            (self.save_velocity or 0) * 25 +      # Saves are strong intent signal
            (self.dm_velocity or 0) * 30 +         # DMs are highest intent
            (self.trade_request_velocity or 0) * 20 +
            (self.listing_velocity or 0) * 15 +    # New supply
            (self.view_velocity or 0) * 10         # Views are weakest signal
        )
        
        # Normalize to 0-100 scale (cap at 100)
        self.heat_score = min(100.0, score)
        
        # Set heat level
        if self.heat_score >= 80:
            self.heat_level = 'fire'
        elif self.heat_score >= 60:
            self.heat_level = 'hot'
        elif self.heat_score >= 30:
            self.heat_level = 'warm'
        else:
            self.heat_level = 'cold'
    
    def get_center_coords(self) -> tuple:
        """Get center coordinates of this hex"""
        import h3
        return h3.h3_to_geo(self.h3_index)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        lat, lng = self.get_center_coords()
        
        return {
            "h3_index": self.h3_index,
            "lat": lat,
            "lng": lng,
            "heat_score": round(self.heat_score, 1),
            "heat_level": self.heat_level,
            "velocities": {
                "saves": round(self.save_velocity, 2),
                "dms": round(self.dm_velocity, 2),
                "trade_requests": round(self.trade_request_velocity, 2),
                "listings": round(self.listing_velocity, 2),
                "views": round(self.view_velocity, 2),
            },
            "volume": {
                "searches": self.search_volume,
                "active_listings": self.active_listings,
                "active_users": self.active_users,
            },
            "trending": {
                "brands": self.trending_brands or [],
                "skus": self.trending_skus or [],
                "sizes": self.trending_sizes or [],
                "searches": self.hot_searches or [],
            },
            "price": {
                "average": self.avg_listing_price,
                "trend": self.price_trend,
                "change_percent": self.price_change_percent,
            },
            "window_hours": self.window_hours,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def to_map_feature(self) -> dict:
        """Convert to GeoJSON feature for map rendering"""
        import h3
        
        boundary = h3.h3_to_geo_boundary(self.h3_index, geo_json=True)
        lat, lng = h3.h3_to_geo(self.h3_index)
        
        return {
            "type": "Feature",
            "properties": {
                "h3_index": self.h3_index,
                "heat_score": self.heat_score,
                "heat_level": self.heat_level,
                "active_listings": self.active_listings,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [boundary]
            }
        }
    
    @classmethod
    def get_or_create(cls, db, h3_index: str) -> "NeighborhoodHeatIndex":
        """Get existing heat index or create new one for hex"""
        import h3
        
        existing = db.query(cls).filter(cls.h3_index == h3_index).first()
        if existing:
            return existing
        
        # Create new
        lat, lng = h3.h3_to_geo(h3_index)
        new_index = cls(h3_index=h3_index)
        new_index.set_h3_indexes(lat, lng)
        new_index.window_start = datetime.utcnow() - timedelta(hours=24)
        new_index.window_end = datetime.utcnow()
        
        db.add(new_index)
        return new_index

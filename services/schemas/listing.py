"""
Pydantic schemas for Listing API endpoints.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class ConditionEnum(str, Enum):
    DS = 'DS'
    VNDS = 'VNDS'
    EXCELLENT = 'EXCELLENT'
    GOOD = 'GOOD'
    FAIR = 'FAIR'
    BEAT = 'BEAT'


class SizeTypeEnum(str, Enum):
    MENS = 'MENS'
    WOMENS = 'WOMENS'
    GS = 'GS'
    PS = 'PS'
    TD = 'TD'
    UNISEX = 'UNISEX'


class TradeIntentEnum(str, Enum):
    SALE = 'SALE'
    TRADE = 'TRADE'
    BOTH = 'BOTH'


class ListingStatusEnum(str, Enum):
    ACTIVE = 'ACTIVE'
    PENDING = 'PENDING'
    SOLD = 'SOLD'
    TRADED = 'TRADED'
    EXPIRED = 'EXPIRED'
    DELETED = 'DELETED'


class VisibilityEnum(str, Enum):
    public = 'public'
    local = 'local'
    followers = 'followers'
    private = 'private'


# Request schemas
class ListingCreate(BaseModel):
    """Schema for creating a new listing"""
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    brand: str = Field(..., min_length=1, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    colorway: Optional[str] = Field(None, max_length=200)
    size: str = Field(..., max_length=20)
    size_type: SizeTypeEnum = SizeTypeEnum.MENS
    
    condition: ConditionEnum
    condition_notes: Optional[str] = Field(None, max_length=500)
    has_box: bool = True
    has_extras: bool = False
    
    images: List[str] = Field(..., min_items=1, max_items=10)
    authenticity_photos: Optional[List[str]] = Field(None, max_items=5)
    
    price: Optional[float] = Field(None, ge=0)
    trade_intent: TradeIntentEnum = TradeIntentEnum.SALE
    trade_interests: Optional[List[str]] = Field(None, max_items=10)
    trade_notes: Optional[str] = Field(None, max_length=500)
    
    # Location (required for hyperlocal)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    
    visibility: VisibilityEnum = VisibilityEnum.public
    
    @validator('price')
    def validate_price_for_intent(cls, v, values):
        intent = values.get('trade_intent')
        if intent == TradeIntentEnum.SALE and v is None:
            raise ValueError('Price is required for sale listings')
        return v
    
    @validator('trade_interests')
    def validate_trade_interests(cls, v, values):
        intent = values.get('trade_intent')
        if intent in [TradeIntentEnum.TRADE, TradeIntentEnum.BOTH] and not v:
            # Trade interests are recommended but not required
            pass
        return v


class ListingUpdate(BaseModel):
    """Schema for updating a listing"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    condition_notes: Optional[str] = Field(None, max_length=500)
    
    images: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    authenticity_photos: Optional[List[str]] = Field(None, max_items=5)
    
    price: Optional[float] = Field(None, ge=0)
    trade_intent: Optional[TradeIntentEnum] = None
    trade_interests: Optional[List[str]] = Field(None, max_items=10)
    trade_notes: Optional[str] = Field(None, max_length=500)
    
    visibility: Optional[VisibilityEnum] = None


class PriceDropRequest(BaseModel):
    """Schema for dropping price"""
    new_price: float = Field(..., ge=0)


# Response schemas
class ListingResponse(BaseModel):
    """Full listing response"""
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    brand: str
    sku: Optional[str]
    colorway: Optional[str]
    size: str
    size_type: str
    
    condition: str
    condition_notes: Optional[str]
    has_box: bool
    has_extras: bool
    
    images: List[str]
    authenticity_photos: Optional[List[str]]
    authenticity_score: int
    is_verified: bool
    
    price: Optional[float]
    original_price: Optional[float]
    price_drop_percent: float
    trade_intent: str
    trade_interests: Optional[List[str]]
    trade_notes: Optional[str]
    
    h3_index: str
    view_count: int
    save_count: int
    message_count: int
    
    status: str
    visibility: str
    
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ListingFeedItem(BaseModel):
    """Listing in feed context with distance"""
    id: UUID
    user_id: UUID
    title: str
    brand: str
    sku: Optional[str]
    size: str
    condition: str
    
    images: List[str]
    authenticity_score: int
    is_verified: bool
    
    price: Optional[float]
    original_price: Optional[float]
    price_drop_percent: float
    trade_intent: str
    
    distance_miles: Optional[float]
    rank_score: float
    demand_score: float
    
    view_count: int
    save_count: int
    
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class HyperlocalFeedResponse(BaseModel):
    """Response for hyperlocal feed endpoint"""
    listings: List[ListingFeedItem]
    total_count: int
    radius_miles: float
    center_h3: str
    heat_level: str
    
    class Config:
        from_attributes = True


# Heat Index schemas
class HeatIndexResponse(BaseModel):
    """Neighborhood heat index response"""
    h3_index: str
    lat: float
    lng: float
    heat_score: float
    heat_level: str
    
    velocities: dict
    volume: dict
    trending: dict
    price: dict
    
    window_hours: int
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Activity Ribbon schemas
class ActivityRibbonItem(BaseModel):
    """Single item in activity ribbon"""
    id: UUID
    type: str
    entity_type: str
    entity_id: UUID
    display_text: Optional[str]
    payload: dict
    created_at: datetime
    
    class Config:
        from_attributes = True


class ActivityRibbonResponse(BaseModel):
    """Response for activity ribbon endpoint"""
    events: List[ActivityRibbonItem]
    has_more: bool
    
    class Config:
        from_attributes = True


# Trade Match schemas
class TradeMatchResponse(BaseModel):
    """Trade match response"""
    id: UUID
    match_type: str
    you_offer: dict
    you_receive: dict
    other_parties: int
    locality_score: int
    match_score: float
    status: str
    your_acceptance: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class TradeMatchListResponse(BaseModel):
    """List of trade matches"""
    matches: List[TradeMatchResponse]
    total_count: int
    
    class Config:
        from_attributes = True

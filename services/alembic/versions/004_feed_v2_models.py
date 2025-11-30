"""Feed V2 Models - Hyperlocal marketplace feed

Revision ID: 004_feed_v2
Revises: 0c591489b784
Create Date: 2024-01-15

Creates tables for:
- listings: Marketplace item listings
- listing_saves: User saves/bookmarks
- feed_events: Event-driven feed engine
- neighborhood_heat_index: Demand metrics per H3 hex
- trade_matches: Trade opportunity matching
- user_wishlists: User wishlist items
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004_feed_v2'
down_revision = '0c591489b784'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE condition_enum AS ENUM ('DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR', 'BEAT');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE size_type_enum AS ENUM ('MENS', 'WOMENS', 'GS', 'PS', 'TD', 'UNISEX');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE trade_intent_enum AS ENUM ('SALE', 'TRADE', 'BOTH');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE listing_status_enum AS ENUM ('ACTIVE', 'PENDING', 'SOLD', 'TRADED', 'EXPIRED', 'DELETED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE listing_visibility_enum AS ENUM ('public', 'local', 'followers', 'private');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE feed_event_type_enum AS ENUM (
                'NEW_LISTING', 'PRICE_DROP', 'ITEM_SOLD', 'ITEM_TRADED',
                'TRADE_REQUEST', 'SHOP_BROADCAST', 'SHOP_RESTOCK', 'FLASH_SALE',
                'DROP_LIVE', 'DROP_SOLD_OUT', 'USER_PICKUP', 'MEETUP_COMPLETED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE match_type_enum AS ENUM ('TWO_WAY', 'THREE_WAY');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE match_status_enum AS ENUM (
                'SUGGESTED', 'VIEWED', 'PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED', 'EXPIRED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create listings table
    op.create_table(
        'listings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        
        # Product info
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('brand', sa.String(100), nullable=False),
        sa.Column('sku', sa.String(100), nullable=True),
        sa.Column('colorway', sa.String(200), nullable=True),
        sa.Column('size', sa.String(20), nullable=False),
        sa.Column('size_type', postgresql.ENUM('MENS', 'WOMENS', 'GS', 'PS', 'TD', 'UNISEX', name='size_type_enum', create_type=False), nullable=False, server_default='MENS'),
        
        # Condition
        sa.Column('condition', postgresql.ENUM('DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR', 'BEAT', name='condition_enum', create_type=False), nullable=False),
        sa.Column('condition_notes', sa.Text, nullable=True),
        sa.Column('has_box', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('has_extras', sa.Boolean, nullable=False, server_default='false'),
        
        # Media
        sa.Column('images', postgresql.ARRAY(sa.String), nullable=False),
        sa.Column('authenticity_photos', postgresql.ARRAY(sa.String), nullable=True),
        
        # Authenticity
        sa.Column('authenticity_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('authenticity_notes', sa.Text, nullable=True),
        sa.Column('is_verified', sa.Boolean, nullable=False, server_default='false'),
        
        # Pricing
        sa.Column('price', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('original_price', sa.DECIMAL(10, 2), nullable=True),
        sa.Column('trade_intent', postgresql.ENUM('SALE', 'TRADE', 'BOTH', name='trade_intent_enum', create_type=False), nullable=False, server_default='SALE'),
        sa.Column('trade_interests', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('trade_notes', sa.Text, nullable=True),
        
        # Location
        sa.Column('location_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('h3_index', sa.String(15), nullable=False),
        sa.Column('h3_index_r8', sa.String(15), nullable=True),
        sa.Column('h3_index_r7', sa.String(15), nullable=True),
        
        # Engagement
        sa.Column('view_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('save_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('message_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('share_count', sa.Integer, nullable=False, server_default='0'),
        
        # Ranking
        sa.Column('rank_score', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('demand_score', sa.Float, nullable=False, server_default='0.0'),
        
        # Status
        sa.Column('status', postgresql.ENUM('ACTIVE', 'PENDING', 'SOLD', 'TRADED', 'EXPIRED', 'DELETED', name='listing_status_enum', create_type=False), nullable=False, server_default='ACTIVE'),
        sa.Column('visibility', postgresql.ENUM('public', 'local', 'followers', 'private', name='listing_visibility_enum', create_type=False), nullable=False, server_default='public'),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sold_at', sa.DateTime(timezone=True), nullable=True),
        
        # References
        sa.Column('drop_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('drops.id', ondelete='SET NULL'), nullable=True),
    )
    
    # Listings indexes
    op.create_index('ix_listings_user_id', 'listings', ['user_id'])
    op.create_index('ix_listings_brand', 'listings', ['brand'])
    op.create_index('ix_listings_sku', 'listings', ['sku'])
    op.create_index('ix_listings_size', 'listings', ['size'])
    op.create_index('ix_listings_condition', 'listings', ['condition'])
    op.create_index('ix_listings_h3_index', 'listings', ['h3_index'])
    op.create_index('ix_listings_h3_index_r8', 'listings', ['h3_index_r8'])
    op.create_index('ix_listings_h3_index_r7', 'listings', ['h3_index_r7'])
    op.create_index('ix_listings_status', 'listings', ['status'])
    op.create_index('ix_listings_h3_status', 'listings', ['h3_index', 'status'])
    op.create_index('ix_listings_h3_r8_status', 'listings', ['h3_index_r8', 'status'])
    op.create_index('ix_listings_h3_r7_status', 'listings', ['h3_index_r7', 'status'])
    op.create_index('ix_listings_rank_score', 'listings', [sa.text('rank_score DESC')])
    op.create_index('ix_listings_status_created', 'listings', ['status', sa.text('created_at DESC')])
    op.create_index('ix_listings_brand_status', 'listings', ['brand', 'status'])
    op.create_index('ix_listings_size_status', 'listings', ['size', 'status'])
    op.create_index('ix_listings_trade_intent', 'listings', ['trade_intent', 'status'])
    op.create_index('ix_listings_sku_status', 'listings', ['sku', 'status'])
    op.create_index('ix_listings_price_status', 'listings', ['price', 'status'])
    op.create_index('ix_listings_user_status', 'listings', ['user_id', 'status', sa.text('created_at DESC')])
    op.create_index('ix_listings_save_count', 'listings', [sa.text('save_count DESC')])
    
    # Create listing_saves table
    op.create_table(
        'listing_saves',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('listing_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    op.create_index('ix_listing_saves_user', 'listing_saves', ['user_id'])
    op.create_index('ix_listing_saves_listing', 'listing_saves', ['listing_id'])
    op.create_index('ix_listing_saves_unique', 'listing_saves', ['user_id', 'listing_id'], unique=True)
    
    # Create feed_events table
    op.create_table(
        'feed_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', postgresql.ENUM(
            'NEW_LISTING', 'PRICE_DROP', 'ITEM_SOLD', 'ITEM_TRADED',
            'TRADE_REQUEST', 'SHOP_BROADCAST', 'SHOP_RESTOCK', 'FLASH_SALE',
            'DROP_LIVE', 'DROP_SOLD_OUT', 'USER_PICKUP', 'MEETUP_COMPLETED',
            name='feed_event_type_enum', create_type=False
        ), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('h3_index', sa.String(15), nullable=False),
        sa.Column('h3_index_r8', sa.String(15), nullable=True),
        sa.Column('h3_index_r7', sa.String(15), nullable=True),
        sa.Column('payload', postgresql.JSON, nullable=False, server_default='{}'),
        sa.Column('display_text', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_index('ix_feed_events_h3_time', 'feed_events', ['h3_index', sa.text('created_at DESC')])
    op.create_index('ix_feed_events_h3_r8_time', 'feed_events', ['h3_index_r8', sa.text('created_at DESC')])
    op.create_index('ix_feed_events_h3_r7_time', 'feed_events', ['h3_index_r7', sa.text('created_at DESC')])
    op.create_index('ix_feed_events_type_time', 'feed_events', ['event_type', sa.text('created_at DESC')])
    op.create_index('ix_feed_events_h3_type', 'feed_events', ['h3_index', 'event_type', sa.text('created_at DESC')])
    op.create_index('ix_feed_events_entity', 'feed_events', ['entity_type', 'entity_id'])
    op.create_index('ix_feed_events_user_time', 'feed_events', ['user_id', sa.text('created_at DESC')])
    op.create_index('ix_feed_events_expires', 'feed_events', ['expires_at'])
    
    # Create neighborhood_heat_index table
    op.create_table(
        'neighborhood_heat_index',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('h3_index', sa.String(15), unique=True, nullable=False),
        sa.Column('h3_index_r8', sa.String(15), nullable=True),
        sa.Column('h3_index_r7', sa.String(15), nullable=True),
        
        # Velocity metrics
        sa.Column('save_velocity', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('dm_velocity', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('trade_request_velocity', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('listing_velocity', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('view_velocity', sa.Float, nullable=False, server_default='0.0'),
        
        # Volume metrics
        sa.Column('search_volume', sa.Integer, nullable=False, server_default='0'),
        sa.Column('active_listings', sa.Integer, nullable=False, server_default='0'),
        sa.Column('active_users', sa.Integer, nullable=False, server_default='0'),
        
        # Heat score
        sa.Column('heat_score', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('heat_level', sa.String(20), nullable=False, server_default='cold'),
        
        # Trending data
        sa.Column('trending_brands', postgresql.JSON, nullable=True),
        sa.Column('trending_skus', postgresql.JSON, nullable=True),
        sa.Column('trending_sizes', postgresql.JSON, nullable=True),
        sa.Column('hot_searches', postgresql.ARRAY(sa.String), nullable=True),
        
        # Price trends
        sa.Column('avg_listing_price', sa.Float, nullable=True),
        sa.Column('price_trend', sa.String(20), nullable=True),
        sa.Column('price_change_percent', sa.Float, nullable=True),
        
        # Time window
        sa.Column('window_hours', sa.Integer, nullable=False, server_default='24'),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('window_end', sa.DateTime(timezone=True), nullable=True),
        
        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    op.create_index('ix_heat_index_h3', 'neighborhood_heat_index', ['h3_index'])
    op.create_index('ix_heat_index_score', 'neighborhood_heat_index', [sa.text('heat_score DESC')])
    op.create_index('ix_heat_index_level', 'neighborhood_heat_index', ['heat_level'])
    op.create_index('ix_heat_index_r8', 'neighborhood_heat_index', ['h3_index_r8'])
    op.create_index('ix_heat_index_r7', 'neighborhood_heat_index', ['h3_index_r7'])
    op.create_index('ix_heat_index_updated', 'neighborhood_heat_index', [sa.text('updated_at DESC')])
    
    # Create trade_matches table
    op.create_table(
        'trade_matches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('match_type', postgresql.ENUM('TWO_WAY', 'THREE_WAY', name='match_type_enum', create_type=False), nullable=False),
        sa.Column('participants', postgresql.JSON, nullable=False),
        sa.Column('user_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False),
        sa.Column('listing_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=False),
        sa.Column('h3_common', sa.String(15), nullable=True),
        sa.Column('locality_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('max_distance_miles', sa.Float, nullable=True),
        sa.Column('match_score', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('value_balance', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('status', postgresql.ENUM(
            'SUGGESTED', 'VIEWED', 'PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED', 'EXPIRED',
            name='match_status_enum', create_type=False
        ), nullable=False, server_default='SUGGESTED'),
        sa.Column('acceptances', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('meetup_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    
    op.create_index('ix_trade_matches_users', 'trade_matches', ['user_ids'], postgresql_using='gin')
    op.create_index('ix_trade_matches_listings', 'trade_matches', ['listing_ids'], postgresql_using='gin')
    op.create_index('ix_trade_matches_status_created', 'trade_matches', ['status', sa.text('created_at DESC')])
    op.create_index('ix_trade_matches_h3_status', 'trade_matches', ['h3_common', 'status'])
    op.create_index('ix_trade_matches_score', 'trade_matches', [sa.text('match_score DESC')])
    op.create_index('ix_trade_matches_expires', 'trade_matches', ['expires_at'])
    
    # Create user_wishlists table
    op.create_table(
        'user_wishlists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('sku', sa.String(100), nullable=True),
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('model', sa.String(200), nullable=True),
        sa.Column('size', sa.String(20), nullable=True),
        sa.Column('size_type', sa.String(20), nullable=True),
        sa.Column('size_flexible', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('max_price', sa.Float, nullable=True),
        sa.Column('min_condition', sa.String(20), nullable=True),
        sa.Column('priority', sa.Integer, nullable=False, server_default='5'),
        sa.Column('notify_on_match', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    op.create_index('ix_wishlist_user', 'user_wishlists', ['user_id'])
    op.create_index('ix_wishlist_sku', 'user_wishlists', ['sku'])
    op.create_index('ix_wishlist_brand', 'user_wishlists', ['brand'])
    op.create_index('ix_wishlist_priority', 'user_wishlists', ['user_id', sa.text('priority DESC')])


def downgrade():
    # Drop tables
    op.drop_table('user_wishlists')
    op.drop_table('trade_matches')
    op.drop_table('neighborhood_heat_index')
    op.drop_table('feed_events')
    op.drop_table('listing_saves')
    op.drop_table('listings')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS match_status_enum')
    op.execute('DROP TYPE IF EXISTS match_type_enum')
    op.execute('DROP TYPE IF EXISTS feed_event_type_enum')
    op.execute('DROP TYPE IF EXISTS listing_visibility_enum')
    op.execute('DROP TYPE IF EXISTS listing_status_enum')
    op.execute('DROP TYPE IF EXISTS trade_intent_enum')
    op.execute('DROP TYPE IF EXISTS size_type_enum')
    op.execute('DROP TYPE IF EXISTS condition_enum')

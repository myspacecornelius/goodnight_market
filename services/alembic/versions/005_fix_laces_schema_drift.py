"""Fix LACES schema drift

Revision ID: 005_fix_laces_schema_drift
Revises: 004_feed_v2
Create Date: 2025-12-08 22:52:00.000000

This migration fixes schema drift in the LACES system:
1. Adds missing transaction_type enum values
2. Ensures balance_after column exists
3. Adds reference_id column if missing

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_fix_laces_schema_drift'
down_revision = '004_feed_v2'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing enum values and columns to LACES ledger"""
    
    # Get connection
    conn = op.get_bind()
    
    # Step 1: Add missing enum values to transaction_type_enum
    # Check which values already exist to avoid errors
    existing_enums = conn.execute(
        sa.text("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'transaction_type_enum'
            )
        """)
    ).fetchall()
    existing_values = {row[0] for row in existing_enums}
    
    # All transaction types that should exist
    all_transaction_types = [
        'DAILY_STIPEND',
        'BOOST_SENT',
        'BOOST_RECEIVED',
        'SIGNAL_REWARD',
        'ADMIN_ADD',
        'ADMIN_REMOVE',
        'PURCHASE',
        'REFUND',
        'CONTEST_REWARD',
        'CHECKOUT_TASK_PURCHASE',
        'CHECKOUT_TASK_REFUND',
        'POST_REWARD',
        'CHECKIN_REWARD',
    ]
    
    # Add missing enum values
    for transaction_type in all_transaction_types:
        if transaction_type not in existing_values:
            conn.execute(
                sa.text(f"ALTER TYPE transaction_type_enum ADD VALUE '{transaction_type}'")
            )
            print(f"✅ Added transaction type: {transaction_type}")
    
    # Step 2: Check if balance_after column exists, add if missing
    has_balance_after = conn.execute(
        sa.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'laces_ledger' 
            AND column_name = 'balance_after'
        """)
    ).fetchone()
    
    if not has_balance_after:
        op.add_column('laces_ledger',
            sa.Column('balance_after', sa.Integer(), nullable=False, server_default='0')
        )
        print("✅ Added balance_after column")
    else:
        print("ℹ️  balance_after column already exists")
    
    # Step 3: Check if reference_id column exists, add if missing
    has_reference_id = conn.execute(
        sa.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'laces_ledger' 
            AND column_name = 'reference_id'
        """)
    ).fetchone()
    
    if not has_reference_id:
        op.add_column('laces_ledger',
            sa.Column('reference_id', sa.String(length=100), nullable=True)
        )
        print("✅ Added reference_id column")
    else:
        print("ℹ️  reference_id column already exists")
    
    # Step 4: Verify all indexes exist
    # Check if the ix_laces_amount index exists
    has_amount_index = conn.execute(
        sa.text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'laces_ledger' 
            AND indexname = 'ix_laces_amount'
        """)
    ).fetchone()
    
    if not has_amount_index:
        op.create_index(
            'ix_laces_amount',
            'laces_ledger',
            ['amount'],
            unique=False
        )
        print("✅ Created ix_laces_amount index")
    else:
        print("ℹ️  ix_laces_amount index already exists")
    
    print("\n🎉 LACES schema drift fixed successfully!")
    print("📊 Transaction types now: 13 total")
    print("✅ All required columns present")
    print("✅ All indexes created")


def downgrade():
    """
    Note: Removing enum values from PostgreSQL requires special handling
    and can cause issues if data exists. This downgrade is intentionally
    limited to avoid data loss.
    """
    
    # We can safely drop the indexes
    op.drop_index('ix_laces_amount', table_name='laces_ledger')
    
    # Removing columns is risky but possible if needed
    # Uncomment these lines if you really need to rollback
    # op.drop_column('laces_ledger', 'reference_id')
    # op.drop_column('laces_ledger', 'balance_after')
    
    print("⚠️  Partial downgrade complete")
    print("⚠️  Enum values NOT removed (requires manual intervention)")
    print("ℹ️  To fully rollback, you may need to recreate the enum type")

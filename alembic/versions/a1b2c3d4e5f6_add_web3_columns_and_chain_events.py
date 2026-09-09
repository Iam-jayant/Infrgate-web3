"""add web3 columns and chain_events table

Revision ID: a1b2c3d4e5f6
Revises: 300167f02bfa
Create Date: 2026-09-09 13:30:00.000000

Phase 2 of the Web3 MVP: adds BOT Chain subscription columns to the
tenants table and creates the chain_events idempotency table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '300167f02bfa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Add Web3 columns to tenants ───────────────────────────────────────
    op.add_column(
        'tenants',
        sa.Column(
            'wallet_address',
            sa.String(42),
            nullable=True,
            unique=True,
            comment='Checksummed EVM wallet address (0x + 40 hex chars)',
        ),
    )
    op.add_column(
        'tenants',
        sa.Column(
            'subscription_tx_hash',
            sa.String(66),
            nullable=True,
            comment='On-chain tx hash that created/renewed this subscription',
        ),
    )
    op.add_column(
        'tenants',
        sa.Column(
            'subscription_expires_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='When the current on-chain subscription period ends',
        ),
    )
    op.add_column(
        'tenants',
        sa.Column(
            'token_quota',
            sa.BigInteger(),
            nullable=True,
            comment='Total inference tokens allowed this billing period (from contract)',
        ),
    )

    # Index on wallet_address for O(1) lookups by the chain listener
    op.create_index(
        'ix_tenants_wallet_address',
        'tenants',
        ['wallet_address'],
        unique=True,
    )

    # ── Create chain_events idempotency table ─────────────────────────────
    op.create_table(
        'chain_events',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column(
            'tx_hash',
            sa.String(66),
            nullable=False,
            comment='Transaction hash (0x + 64 hex chars)',
        ),
        sa.Column(
            'log_index',
            sa.Integer(),
            nullable=False,
            comment='Index of the log within the transaction',
        ),
        sa.Column(
            'block_number',
            sa.BigInteger(),
            nullable=False,
            comment='Block number where the event was emitted',
        ),
        sa.Column(
            'event_type',
            sa.String(50),
            nullable=False,
            comment="Event name, e.g. 'Subscribed'",
        ),
        sa.Column(
            'wallet_address',
            sa.String(42),
            nullable=False,
            comment='Subscriber wallet address from the event',
        ),
        sa.Column(
            'raw_data',
            sa.String(2000),
            nullable=True,
            comment='JSON-encoded event data for audit/debugging',
        ),
        sa.Column(
            'processed_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        # Constraints
        sa.UniqueConstraint('tx_hash', 'log_index', name='uq_chain_event_tx_log'),
    )

    op.create_index('idx_chain_events_block', 'chain_events', ['block_number'])
    op.create_index('idx_chain_events_wallet', 'chain_events', ['wallet_address'])


def downgrade() -> None:
    # ── Drop chain_events table ───────────────────────────────────────────
    op.drop_index('idx_chain_events_wallet', table_name='chain_events')
    op.drop_index('idx_chain_events_block', table_name='chain_events')
    op.drop_table('chain_events')

    # ── Remove Web3 columns from tenants ──────────────────────────────────
    op.drop_index('ix_tenants_wallet_address', table_name='tenants')
    op.drop_column('tenants', 'token_quota')
    op.drop_column('tenants', 'subscription_expires_at')
    op.drop_column('tenants', 'subscription_tx_hash')
    op.drop_column('tenants', 'wallet_address')

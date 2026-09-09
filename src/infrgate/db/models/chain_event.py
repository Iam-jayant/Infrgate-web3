"""
Chain Event model — idempotency table for processed on-chain events.

Prevents double-processing of blockchain events by tracking each
(tx_hash, log_index) pair. The chain listener inserts a row before
calling the provisioning webhook; if the insert conflicts, the event
is skipped.

Used by: src/infrgate/chain_listener/listener.py
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from infrgate.db.models import Base, UUIDPrimaryKeyMixin


class ChainEvent(Base, UUIDPrimaryKeyMixin):
    """Tracks processed on-chain events to prevent double-processing."""

    __tablename__ = "chain_events"

    tx_hash: Mapped[str] = mapped_column(
        String(66), nullable=False,
        comment="Transaction hash (0x + 64 hex chars)",
    )
    log_index: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Index of the log within the transaction",
    )
    block_number: Mapped[int] = mapped_column(
        BigInteger, nullable=False,
        comment="Block number where the event was emitted",
    )
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Event name, e.g. 'Subscribed'",
    )
    wallet_address: Mapped[str] = mapped_column(
        String(42), nullable=False,
        comment="Subscriber wallet address from the event",
    )
    raw_data: Mapped[str | None] = mapped_column(
        String(2000), nullable=True,
        comment="JSON-encoded event data for audit/debugging",
    )
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Constraints & Indexes ─────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("tx_hash", "log_index", name="uq_chain_event_tx_log"),
        Index("idx_chain_events_block", "block_number"),
        Index("idx_chain_events_wallet", "wallet_address"),
    )

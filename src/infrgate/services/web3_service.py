"""
Web3 Subscription Service.

Handles provisioning of tenants and API keys from on-chain Subscribed events,
as well as querying subscription status.

Spec reference: MVP Implementation Plan (Phase 3)
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from infrgate.db.models.tenant import Tenant
from infrgate.db.models.chain_event import ChainEvent
from infrgate.schemas.web3 import Web3ProvisionRequest, Web3ProvisionResponse, Web3SubscriptionStatus
from infrgate.services.api_key_service import create_api_key

logger = structlog.get_logger()


async def provision_subscription(
    db: AsyncSession,
    request: Web3ProvisionRequest,
) -> Web3ProvisionResponse | None:
    """
    Provision a tenant based on an on-chain Subscribed event.
    Returns None if the event was already processed (idempotency).
    """
    # 1. Idempotency Check & Record insertion
    stmt = insert(ChainEvent).values(
        tx_hash=request.tx_hash,
        log_index=request.log_index,
        block_number=request.block_number,
        event_type="Subscribed",
        wallet_address=request.wallet_address,
    ).on_conflict_do_nothing(
        constraint="uq_chain_event_tx_log"
    ).returning(ChainEvent.id)

    result = await db.execute(stmt)
    event_id = result.scalar_one_or_none()

    if not event_id:
        logger.info("web3_event_already_processed", tx_hash=request.tx_hash, log_index=request.log_index)
        return None  # Already processed

    # 2. Find or create Tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.wallet_address == request.wallet_address)
    )
    tenant = tenant_result.scalar_one_or_none()

    is_new_tenant = False
    api_key_secret: str | None = None
    api_key_prefix: str = ""

    if tenant is None:
        # Create new tenant
        tenant = Tenant(
            name=f"Web3 Wallet {request.wallet_address[:8]}",
            plan=request.tier,
            status="active",
            wallet_address=request.wallet_address,
            subscription_tx_hash=request.tx_hash,
            subscription_expires_at=request.expires_at,
            token_quota=request.token_quota,
        )
        db.add(tenant)
        await db.flush()  # To get tenant.id

        # Generate the first API key
        api_key, full_key = await create_api_key(db, tenant.id, name="Default Web3 Key")
        api_key_secret = full_key
        api_key_prefix = api_key.prefix
        is_new_tenant = True
        logger.info("web3_tenant_created", tenant_id=str(tenant.id), wallet=request.wallet_address)
    else:
        # Upgrade/renew existing tenant
        tenant.plan = request.tier
        tenant.status = "active"
        tenant.subscription_tx_hash = request.tx_hash
        tenant.subscription_expires_at = request.expires_at
        tenant.token_quota = request.token_quota
        
        # Reset current spend since it's a new billing period/quota
        tenant.current_spend_cents = 0

        # We need the existing API key prefix for the response, but we don't return a new secret
        # Just grab the first active key's prefix (if any)
        from infrgate.db.models.api_key import ApiKey
        key_result = await db.execute(
            select(ApiKey).where(ApiKey.tenant_id == tenant.id).limit(1)
        )
        first_key = key_result.scalar_one_or_none()
        if first_key:
            api_key_prefix = first_key.prefix

        logger.info("web3_tenant_renewed", tenant_id=str(tenant.id), wallet=request.wallet_address)

    await db.commit()

    return Web3ProvisionResponse(
        tenant_id=str(tenant.id),
        wallet_address=tenant.wallet_address,
        plan=tenant.plan,
        api_key_prefix=api_key_prefix,
        api_key_secret=api_key_secret,
        expires_at=tenant.subscription_expires_at,
        token_quota=tenant.token_quota,
        is_new_tenant=is_new_tenant,
    )


async def get_subscription_status(
    db: AsyncSession,
    wallet_address: str,
) -> Web3SubscriptionStatus | None:
    """
    Get the subscription status for a wallet address.
    Returns None if the wallet is not known to the system.
    """
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.wallet_address == wallet_address)
    )
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        return None

    is_active = tenant.status == "active"
    if tenant.subscription_expires_at:
        if datetime.now(timezone.utc) > tenant.subscription_expires_at:
            is_active = False

    # Get prefix
    api_key_prefix = None
    from infrgate.db.models.api_key import ApiKey
    key_result = await db.execute(
        select(ApiKey).where(ApiKey.tenant_id == tenant.id).order_by(ApiKey.created_at.desc()).limit(1)
    )
    first_key = key_result.scalar_one_or_none()
    if first_key:
        api_key_prefix = first_key.prefix

    return Web3SubscriptionStatus(
        wallet_address=tenant.wallet_address,
        plan=tenant.plan,
        is_active=is_active,
        api_key_prefix=api_key_prefix,
        expires_at=tenant.subscription_expires_at,
        token_quota=tenant.token_quota,
        current_spend_cents=tenant.current_spend_cents,
    )

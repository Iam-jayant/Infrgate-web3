"""
Admin API router for Web3 provisioning.

This internal endpoint is called by the Python chain listener whenever
it detects a Subscribed event on BOT Chain. It is protected by a
shared secret rather than standard admin auth, because it is called
server-to-server.
"""

from __future__ import annotations

import secrets
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from infrgate.config import get_settings
from infrgate.db.engine import get_db
from infrgate.schemas.web3 import Web3ProvisionRequest, Web3ProvisionResponse
from infrgate.services.web3_service import provision_subscription

logger = structlog.get_logger()
router = APIRouter(tags=["web3-admin"])


@router.post("/web3/provision", response_model=Web3ProvisionResponse)
async def provision_web3_subscription(
    request: Web3ProvisionRequest,
    authorization: str = Header(..., description="Bearer <WEB3_PROVISION_SECRET>"),
    db: AsyncSession = Depends(get_db),
):
    """
    Internal webhook called by the chain listener.
    Provisions a new tenant + API key, or renews an existing tenant.
    """
    settings = get_settings()
    expected_token = f"Bearer {settings.WEB3_PROVISION_SECRET}"

    # Use constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(authorization, expected_token):
        logger.warning("web3_provision_auth_failed", wallet=request.wallet_address)
        raise HTTPException(status_code=401, detail="Invalid provisioning secret")

    response = await provision_subscription(db, request)
    
    if response is None:
        # Event was already processed
        # Return 200 OK so the listener stops retrying, but maybe a specific code
        # We can return 208 Already Reported
        raise HTTPException(status_code=208, detail="Event already processed")

    return response

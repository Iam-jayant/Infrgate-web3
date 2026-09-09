"""
Public API router for Web3 subscription status.

Allows agents and frontends to query their subscription state,
remaining quota, and active plan using their wallet address.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from infrgate.db.engine import get_db
from infrgate.schemas.web3 import Web3SubscriptionStatus
from infrgate.services.web3_service import get_subscription_status

router = APIRouter(tags=["web3-public"])


@router.get("/web3/subscription/{wallet_address}", response_model=Web3SubscriptionStatus)
async def get_subscription(
    wallet_address: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the subscription status for a given EVM wallet address.
    """
    status = await get_subscription_status(db, wallet_address)
    
    if status is None:
        raise HTTPException(status_code=404, detail="No subscription found for this wallet")
        
    return status

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class Web3ProvisionRequest(BaseModel):
    """
    Internal request payload sent by the chain listener
    when a Subscribed event is detected on-chain.
    """
    wallet_address: str = Field(..., description="Checksummed EVM wallet address")
    tier: str = Field(..., description="Subscription tier: 'standard' or 'enterprise'")
    tx_hash: str = Field(..., description="Transaction hash of the on-chain subscription")
    log_index: int = Field(..., description="Log index of the event")
    block_number: int = Field(..., description="Block number of the event")
    expires_at: datetime = Field(..., description="When the subscription expires")
    token_quota: int = Field(..., description="Tokens allowed for this billing period")


class Web3ProvisionResponse(BaseModel):
    """Response returned to the chain listener after provisioning."""
    tenant_id: str
    wallet_address: str
    plan: str
    api_key_prefix: str
    api_key_secret: str | None = Field(
        default=None,
        description="The full API key secret. Only returned on initial creation, never on renewals."
    )
    expires_at: datetime
    token_quota: int
    is_new_tenant: bool

    model_config = ConfigDict(from_attributes=True)


class Web3SubscriptionStatus(BaseModel):
    """Public status payload returned to the frontend/agent."""
    wallet_address: str
    plan: str
    is_active: bool
    api_key_prefix: str | None = None
    expires_at: datetime | None = None
    token_quota: int | None = None
    current_spend_cents: int = 0

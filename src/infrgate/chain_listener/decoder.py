"""
ABI decoder for the InfrgateSubscription smart contract events.

Uses `eth_abi` to parse raw EVM logs into Python dictionaries.
"""

from __future__ import annotations

from typing import Any
from eth_abi import decode
from eth_utils import keccak, to_checksum_address

# The Solidity event signature
# event Subscribed(address indexed subscriber, Tier tier, PayToken payToken, uint256 amount, uint256 expiresAt, uint256 tokenQuota)
# Note: Enums are encoded as uint8.
SUBSCRIBED_SIGNATURE = "Subscribed(address,uint8,uint8,uint256,uint256,uint256)"
SUBSCRIBED_TOPIC0 = "0x" + keccak(text=SUBSCRIBED_SIGNATURE).hex()

# Tier enum mapping
TIER_MAP = {
    0: "free",
    1: "standard",
    2: "enterprise"
}


def decode_subscribed_event(log: dict[str, Any]) -> dict[str, Any] | None:
    """
    Decodes an eth_getLogs raw dictionary for the Subscribed event.
    Returns a dict with the parsed fields or None if the log doesn't match.
    """
    topics = log.get("topics", [])
    if not topics or topics[0] != SUBSCRIBED_TOPIC0:
        return None

    if len(topics) < 2:
        return None

    # topic[1] is the indexed subscriber address (padded to 32 bytes)
    # The last 20 bytes (40 hex chars) represent the address.
    raw_address = topics[1][-40:]
    subscriber_address = to_checksum_address(f"0x{raw_address}")

    # The data field contains the non-indexed parameters:
    # tier (uint8), payToken (uint8), amount (uint256), expiresAt (uint256), tokenQuota (uint256)
    data_hex = log.get("data", "0x")
    if data_hex.startswith("0x"):
        data_hex = data_hex[2:]
        
    try:
        data_bytes = bytes.fromhex(data_hex)
        decoded = decode(
            ["uint8", "uint8", "uint256", "uint256", "uint256"],
            data_bytes
        )
        
        tier_uint, pay_token_uint, amount, expires_at, token_quota = decoded
        
        return {
            "tx_hash": log.get("transactionHash"),
            "log_index": int(log.get("logIndex", "0x0"), 16),
            "block_number": int(log.get("blockNumber", "0x0"), 16),
            "subscriber": subscriber_address,
            "tier": TIER_MAP.get(tier_uint, "free"),
            "pay_token": "USDT" if pay_token_uint == 1 else "BOT",
            "amount": amount,
            "expires_at": expires_at,
            "token_quota": token_quota,
        }
    except Exception:
        return None

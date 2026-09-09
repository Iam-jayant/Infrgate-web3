"""
Core polling loop for the BOT Chain Web3 listener.

Polls the RPC endpoint for `Subscribed` events, decodes them, and calls
the backend provisioning webhook. Uses Redis to persist the last processed
block to survive restarts.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import httpx
import structlog
from redis.asyncio import Redis

from infrgate.config import Settings, get_settings
from infrgate.chain_listener.decoder import SUBSCRIBED_TOPIC0, decode_subscribed_event

logger = structlog.get_logger()


class ChainListener:
    def __init__(self, settings: Settings, redis: Redis):
        self.settings = settings
        self.redis = redis
        self.rpc_url = settings.BOTCHAIN_RPC_URL
        self.contract_address = settings.BOTCHAIN_CONTRACT_ADDRESS
        
        # Determine internal webhook URL based on environment
        # In docker-compose, the gateway is usually accessible at "http://gateway:8000"
        self.webhook_url = "http://gateway:8000/admin/web3/provision"
        
        self.client = httpx.AsyncClient(timeout=10.0)
        self.redis_key = "infrgate:chain_listener:last_block"

    async def get_last_processed_block(self) -> int:
        """Get the last processed block from Redis, or the start block from config."""
        val = await self.redis.get(self.redis_key)
        if val:
            return int(val)
        return self.settings.BOTCHAIN_START_BLOCK

    async def set_last_processed_block(self, block: int) -> None:
        """Persist the last processed block to Redis."""
        await self.redis.set(self.redis_key, str(block))

    async def rpc_call(self, method: str, params: list) -> dict:
        """Make a JSON-RPC call to the BOT Chain node."""
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1,
        }
        response = await self.client.post(self.rpc_url, json=payload)
        response.raise_for_status()
        result = response.json()
        if "error" in result:
            raise RuntimeError(f"RPC Error: {result['error']}")
        return result["result"]

    async def poll_loop(self):
        """Main infinite polling loop."""
        if not self.contract_address:
            logger.warning("chain_listener_disabled", reason="BOTCHAIN_CONTRACT_ADDRESS is empty")
            return

        logger.info("chain_listener_started", rpc=self.rpc_url, contract=self.contract_address)
        
        while True:
            try:
                # 1. Get latest block
                latest_hex = await self.rpc_call("eth_blockNumber", [])
                latest_block = int(latest_hex, 16)
                
                # 2. Calculate safe target block (wait for confirmations)
                safe_target = latest_block - self.settings.BOTCHAIN_CONFIRMATIONS
                
                # 3. Get last processed block
                last_processed = await self.get_last_processed_block()
                from_block = last_processed + 1

                if safe_target >= from_block:
                    logger.debug("fetching_logs", from_block=from_block, to_block=safe_target)
                    
                    logs = await self.rpc_call("eth_getLogs", [{
                        "fromBlock": hex(from_block),
                        "toBlock": hex(safe_target),
                        "address": self.contract_address,
                        "topics": [SUBSCRIBED_TOPIC0],
                    }])
                    
                    for log in logs:
                        await self.process_log(log)
                    
                    await self.set_last_processed_block(safe_target)
                    
            except Exception as e:
                logger.error("chain_listener_error", error=str(e))
                
            await asyncio.sleep(self.settings.BOTCHAIN_LISTENER_POLL_INTERVAL)

    async def process_log(self, log: dict):
        """Decode a log and trigger the webhook."""
        event = decode_subscribed_event(log)
        if not event:
            return
            
        logger.info("subscribed_event_detected", **event)
        
        # Convert JS timestamp (seconds) to ISO-8601
        expires_at_dt = datetime.fromtimestamp(event["expires_at"], tz=timezone.utc)
        
        payload = {
            "wallet_address": event["subscriber"],
            "tier": event["tier"],
            "tx_hash": event["tx_hash"],
            "log_index": event["log_index"],
            "block_number": event["block_number"],
            "expires_at": expires_at_dt.isoformat(),
            "token_quota": event["token_quota"],
        }
        
        headers = {
            "Authorization": f"Bearer {self.settings.WEB3_PROVISION_SECRET}"
        }
        
        try:
            resp = await self.client.post(self.webhook_url, json=payload, headers=headers)
            if resp.status_code == 208:
                logger.info("event_already_processed", tx_hash=event["tx_hash"])
            elif resp.status_code != 200:
                logger.error("webhook_failed", status=resp.status_code, text=resp.text)
                # Note: if the webhook fails (e.g. 500), we probably want to halt or retry.
                # In a robust setup, we'd raise an exception so the from_block doesn't advance.
                resp.raise_for_status()
            else:
                data = resp.json()
                logger.info("provisioning_successful", tenant_id=data.get("tenant_id"))
        except Exception as e:
            logger.error("webhook_request_failed", error=str(e))
            raise  # Bubble up so we don't advance the block cursor

    async def close(self):
        await self.client.aclose()

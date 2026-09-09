"""
Entry point for the standalone chain listener service.
Run with: python -m infrgate.chain_listener
"""

from __future__ import annotations

import asyncio
import sys

import structlog
from redis.asyncio import Redis

from infrgate.config import get_settings
from infrgate.chain_listener.listener import ChainListener
from infrgate.logging import configure_logging

logger = structlog.get_logger()

async def main():
    settings = get_settings()
    configure_logging(settings.LOG_LEVEL)
    
    logger.info("starting_chain_listener")
    
    redis_client = Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    
    listener = ChainListener(settings=settings, redis=redis_client)
    
    try:
        await listener.poll_loop()
    except asyncio.CancelledError:
        logger.info("chain_listener_shutting_down")
    finally:
        await listener.close()
        await redis_client.aclose()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)

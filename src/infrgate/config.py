"""
Application configuration loaded from environment variables.

All settings are defined here and resolved via Pydantic BaseSettings.
Configuration precedence: environment variables > .env file > defaults.

Spec reference: 01-system-overview.md §8.3
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """InfrGate application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Database (PostgreSQL) ─────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://infrgate:infrgate@localhost:5432/infrgate"

    # ── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Provider Keys ─────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""

    # ── Admin Authentication ──────────────────────────────────────────────
    ADMIN_API_KEY: str = ""

    # ── Server ────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # ── Rate Limiting (system-wide defaults) ──────────────────────────────
    DEFAULT_RPM: int = 60
    DEFAULT_TPM: int = 100_000

    # ── BOT Chain / Web3 ──────────────────────────────────────────────────
    BOTCHAIN_RPC_URL: str = "https://rpc.botchain.ai"
    BOTCHAIN_WSS_URL: str = "wss://ws-rpc.botchain.ai"
    BOTCHAIN_CHAIN_ID: int = 677
    BOTCHAIN_CONTRACT_ADDRESS: str = ""
    BOTCHAIN_USDT_ADDRESS: str = "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"
    BOTCHAIN_LISTENER_POLL_INTERVAL: int = 5  # seconds between eth_getLogs polls
    BOTCHAIN_START_BLOCK: int = 0  # block number to start scanning from
    BOTCHAIN_CONFIRMATIONS: int = 3  # blocks to wait before processing events
    WEB3_PROVISION_SECRET: str = ""  # shared secret for chain_listener → API auth
    GATEWAY_WEBHOOK_URL: str = "http://gateway:8000/admin/web3/provision"


# ── Plan defaults ─────────────────────────────────────────────────────────
# Spec reference: 04-authentication-tenancy.md §5.1

PLAN_DEFAULTS: dict[str, dict] = {
    "free": {
        "rpm": 10,
        "tpm": 10_000,
        "spend_cap_cents": 1000,  # $10
        "models": [
            "gpt-4o-mini",
            "gemini-2.5-flash",
            "Qwen/Qwen2.5-72B-Instruct",
        ],
    },
    "standard": {
        "rpm": 60,
        "tpm": 100_000,
        "spend_cap_cents": 5000,  # $50
        "models": [
            "gpt-4o-mini",
            "gemini-2.5-flash",
            "Qwen/Qwen2.5-72B-Instruct",
        ],
    },
    "enterprise": {
        "rpm": 600,
        "tpm": 1_000_000,
        "spend_cap_cents": None,  # Unlimited
        "models": [
            "gemini-2.5-flash",
        ],
    },
}




@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()

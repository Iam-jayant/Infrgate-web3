<div align="center">
  <h1>InfrGate</h1>
  <p><strong>Decentralized Inference Settlement Gateway on BOT Chain.</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![BOT Chain](https://img.shields.io/badge/BOT_Chain-Live-00ff88?style=flat)](https://botchain.ai)
  
  [Website & Demo](https://infrgate-web3.vercel.app/) • [Documentation](#architecture) • [API Reference](#api-reference)
</div>

<br />

### 🚀 Quick Links
- **Live dApp:** [https://infrgate-web3.vercel.app/](https://infrgate-web3.vercel.app/)
- **Demo Mode:** [https://infrgate-web3.vercel.app/demo](https://infrgate-web3.vercel.app/demo)
- **Mainnet Contract Address:** [0xd4Ec81e92cD14a60d0F497eEcC9aDF320f6C0D6b](https://scan.botchain.ai/address/0xd4Ec81e92cD14a60d0F497eEcC9aDF320f6C0D6b)
- **SDK:** Install via `npm i @infrgate/botchain-sdk`

> **Demo Key:** `sk-infr_q9EpmF81.tie4rgIGUFNnfk3LKRHZyZ1U79irPv8j` *(This Enterprise API key is provided for demo and testing purposes so you can try out the gateway without needing to buy a subscription).*

<br />


**InfrGate** is a scalable, decentralized API gateway that bridges autonomous AI agents on **BOT Chain** to Web2 inference providers (OpenAI, Anthropic, Gemini). Agents pay on-chain in BOT or USDT, and InfrGate provisions high-performance, metered, API keys for off-chain streaming inference.

---

## The Web3 Pivot

Autonomous AI agents hold crypto (BOT/USDT) but cannot directly pay Web2 providers for inference. **InfrGate acts as the bridge.** 

Agents pay for an on-chain subscription via our smart contracts on BOT Chain. An off-chain listener securely provisions API keys based on those cryptographic events, granting agents access to a unified inference proxy with tenant isolation, rate limiting, and dynamic routing.

## Architecture

This project spans smart contracts, an event listener, and a high-performance Python gateway:

- **Smart Contracts:** Solidity contracts (`InfrgateSubscription.sol`) deployed on BOT Chain Mainnet (Chain ID 677) handle USDT and BOT payments, emitting `Subscribed` events.
- **Chain Listener:** A Python worker that securely polls `eth_getLogs`, decoding on-chain events and triggering internal provisioning webhooks.
- **Unified Gateway (API):** A high-performance Docker service built on **FastAPI**. It routes OpenAI SDK requests to multiple upstream providers based on the agent's Web3 subscription tier and quota.
- **Frontend Web3 dApp:** A Next.js frontend utilizing `wagmi` and `viem` to facilitate smooth wallet connection and on-chain checkout.
- **Database & State:** PostgreSQL stores tenant data and the usage ledger, while Redis provides sub-millisecond ephemeral state for token bucket rate limiting.

### Flow Architecture

```mermaid
sequenceDiagram
    actor Agent as Autonomous Agent
    participant Contract as BOT Chain Contract
    participant Listener as Chain Listener
    participant API as InfrGate Gateway
    participant Provider as Web2 LLM Provider

    Agent->>Contract: Pay USDT/BOT (subscribe)
    Contract-->>Listener: Emit Subscribed Event
    Listener->>API: POST /admin/web3/provision
    API-->>Agent: Return API Key & Quota
    
    Agent->>API: Inference Request (OpenAI format)
    API->>API: Verify Token Quota & Subscription
    API->>Provider: Proxy Request
    Provider-->>API: Stream Response
    API-->>Agent: Stream Response
```

## Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Smart Contracts** | Solidity, Hardhat | OpenZeppelin standards for secure payment routing. |
| **Frontend dApp** | Next.js, Wagmi, Viem | Best-in-class Web3 integration and checkout flow. |
| **Backend/Gateway** | Python 3.12, FastAPI | Async-first ecosystem, dominant in AI/ML stacks. |
| **Chain Listener** | Python `eth-abi`, `httpx` | Resilient, standalone worker tracking block cursors via Redis. |
| **Database** | PostgreSQL | System of record for API keys, quotas, and idempotency tracking. |
| **Cache/State** | Redis | Fast ephemeral state for rate limits and circuit breakers. |

## Getting Started (Local Development)

### 1. Gateway & Backend

1. **Install dependencies:**
   ```bash
   poetry install
   ```
2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Add your HUGGINGFACE_API_KEY, Supabase POSTGRES_URL, and Upstash REDIS_URL
   ```
3. **Run migrations:**
   ```bash
   poetry run alembic upgrade head
   ```
4. **Start Gateway and Worker:**
   ```bash
   poetry run infrgate
   poetry run python -m infrgate.worker.cli
   ```

### 2. Frontend Web App

```bash
cd Frontend
pnpm install
pnpm run dev
```

## Testing

The project maintains **82 passing tests** across unit, integration, and load suites.

To run the test suite:
```bash
poetry run pytest -v
```

## API Reference

**POST `/v1/chat/completions`**

Use your standard OpenAI SDK or send a raw cURL request:

```bash
curl -X POST https://infrgate.onrender.com/v1/chat/completions \
  -H "Authorization: Bearer 365c7a7b.ZZVujqiq-gWiHWJWAcqxz8x8QrwiRi4rWOFr5DMVr1I" \
  -H "Idempotency-Key: req-$(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-72B-Instruct",
    "messages": [{"role": "user", "content": "Explain quantum computing in one sentence."}],
    "stream": true
  }'
```

---
<div align="center">
  <sub>Built by the InfrGate Team.</sub>
</div>

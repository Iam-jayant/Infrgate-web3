# @infrgate/botchain-sdk

The official TypeScript/JavaScript SDK for **InfrGate** — the decentralized Web3 AI Agent Gateway built for BOT Chain.

This SDK allows you to easily connect to your InfrGate AI Proxy and perform streaming LLM inference (e.g. Google Gemini, OpenAI, Anthropic) using your Web3-provisioned API keys.

## Installation

```bash
npm install @infrgate/botchain-sdk
```

## Quick Start

```typescript
import { Infrgate } from "@infrgate/botchain-sdk";

// Initialize the SDK. 
// By default, this connects to the InfrGate production cluster.
const ai = new Infrgate({
    apiKey: "sk-infr_YOUR_API_KEY", // Get this from the InfrGate dApp after subscribing
});

async function main() {
    // Standard OpenAI-compatible Chat Completions
    const response = await ai.chat.completions.create({
        model: "Qwen/Qwen2.5-72B-Instruct", // Or any supported model
        messages: [{ role: "user", content: "What is BOT Chain?" }],
        stream: false,
    });

    console.log(response.choices[0].message.content);
}

main();
```

## Features
- **OpenAI Compatible:** The SDK interface is 100% compatible with the official OpenAI SDK structure, making migration completely seamless.
- **Streaming Support:** Fully supports SSE (Server-Sent Events) for real-time text streaming.
- **Web3 Native:** Connects to the decentralized InfrGate infrastructure, where token limits are strictly enforced by your on-chain BOT Chain subscription.

## Support
For issues or feature requests, please visit the [InfrGate GitHub Repository](https://github.com/Iam-jayant/Infrgate-web3) or access the dApp at [infrgate-web3.vercel.app](https://infrgate-web3.vercel.app/).

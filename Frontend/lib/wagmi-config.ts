import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, injectedWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { defineChain } from 'viem';
import { mainnet } from 'viem/chains';
import { createConfig, http } from 'wagmi';

// --- BOT Chain Mainnet (677) ---
export const botchain = defineChain({
  id: 677,
  name: 'BOT Chain',
  network: 'botchain',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
    public: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BOT Scan', url: 'https://scan.botchain.ai' },
  },
});

// --- BOT Chain Testnet (968) ---
export const botchainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet',
  network: 'botchain-testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
    public: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'BOT Scan Testnet', url: 'https://scan.bohr.life' },
  },
});

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, walletConnectWallet, injectedWallet],
    },
  ],
  {
    appName: 'InfrGate',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c0316b251a3f64de58514e8c15a31a1a',
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [mainnet, botchainTestnet, botchain],
  transports: {
    [mainnet.id]: http(),
    [botchainTestnet.id]: http(),
    [botchain.id]: http(),
  },
  ssr: true,
});

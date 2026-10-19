/**
 * wagmi & RainbowKit configuration — Madhu Chai Wala
 * Universal multi-wallet & Brave Browser compatibility
 */

import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  braveWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Custom Arc Testnet Definition with Fallback RPCs
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.testnet.arc.io',
        'https://arc-testnet-rpc.publicnode.com',
        'https://rpc.testnet.arc.network',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

const WC_PROJECT_ID = 'b56e18d47c27ab683b10814fe9495694';

// RainbowKit Wallet Connectors List
const connectors = connectorsForWallets(
  [
    {
      group: 'Recommended',
      wallets: [
        braveWallet({ projectId: WC_PROJECT_ID }),
        injectedWallet,
        metaMaskWallet({ projectId: WC_PROJECT_ID }),
        rainbowWallet({ projectId: WC_PROJECT_ID }),
        coinbaseWallet({ appName: 'Madhu Chai Wala' }),
        walletConnectWallet({ projectId: WC_PROJECT_ID }),
      ],
    },
  ],
  {
    appName: 'Madhu Chai Wala',
    projectId: WC_PROJECT_ID,
  }
);

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors,
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.io'),
    [mainnet.id]: http(),
  },
});

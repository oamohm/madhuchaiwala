/**
 * wagmi & ConnectKit configuration — Madhu Chai Wala
 * Universal wallet support with Arc Testnet multi-RPC fallback
 */

import { http, createConfig, fallback } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors';

// Arc Testnet custom chain setup with stable RPC endpoints
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

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask(),
    coinbaseWallet({ appName: 'Madhu Chai Wala' }),
    walletConnect({ projectId: WC_PROJECT_ID }),
  ],
  transports: {
    [arcTestnet.id]: fallback([
      http('https://rpc.testnet.arc.io'),
      http('https://arc-testnet-rpc.publicnode.com'),
      http('https://rpc.testnet.arc.network'),
    ]),
    [mainnet.id]: http(),
  },
});

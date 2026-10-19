/**
 * wagmi configuration — Madhu Chai Wala
 * Optimized for direct injected and reliable mobile connection
 */

import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { arcTestnet } from 'viem/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { registerChain } from './tracing';

try {
  registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0]);
} catch (e) {}

const WC_PROJECT_ID = 'b56e18d47c27ab683b10814fe9495694';

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId: WC_PROJECT_ID }),
  ],
  transports: {
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
});

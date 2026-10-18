/**
 * wagmi configuration — Madhu Chai Wala
 * ConnectKit as modal host; MetaMask, Coinbase, WalletConnect + injected fallback
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { registerChain } from './tracing'

registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

// WalletConnect projectId — replace with your own at https://cloud.walletconnect.com
// Using a public demo ID here; works for dev/testnet but rate-limited in prod.
const WC_PROJECT_ID = 'b56e18d47c72ab683b10814fe9495694'

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Madhu Chai Wala' }),
    walletConnect({ projectId: WC_PROJECT_ID }),
  ],
  transports: {
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
})

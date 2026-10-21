/**
 * Madhu Chai Wala — माधु चाय वाला
 * Arc Testnet × Circle USDC × Indian Roadside Tapri
 * Full Responsive Layout with Active Desktop Widgets
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useConnect,
  useDisconnect,
} from 'wagmi'
import { erc20Abi } from 'viem'
import { toast } from 'sonner'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { parseAmount, usdcDecimalsFor } from '@/onchain-money'
import { TokenUSDC } from '@web3icons/react'
import './ChaiChainStyle.css'

const TARGET_CHAIN_ID = 5042002 // Arc Testnet
const usdcFact = getUsdc(TARGET_CHAIN_ID)
const USDC_ADDRESS = (usdcFact?.address ?? '0x3600000000000000000000000000000000000000') as `0x${string}`
const CHANDA_JAR_ADDR = '0x000000000000000000000000000000000000dEaD' as `0x${string}`

const fmt = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`
const fmtUSDC = (raw: bigint): string =>
  (Number(raw) / 10 ** usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)

const MENU_ITEMS = [
  { id: 'cutting',  label: 'Cutting Chai',  hindiLabel: 'कटिंग चाय',    price: 0.25, emoji: '🫖', fillColor: '#a86030', fillH: '55%' },
  { id: 'kulhad',   label: 'Kulhad Chai',   hindiLabel: 'कुल्हड़ चाय',  price: 0.50, emoji: '🍵', fillColor: '#c47840', fillH: '50%' },
  { id: 'masala',   label: 'Masala Chai',   hindiLabel: 'मसाला चाय',    price: 0.60, emoji: '🌶️', fillColor: '#b85030', fillH: '58%' },
  { id: 'samosa',   label: 'Samosa',        hindiLabel: 'समोसा',        price: 0.40, emoji: '🥟', fillColor: '#d4a030', fillH: '65%' },
  { id: 'kachori',  label: 'Kachori',       hindiLabel: 'कचोरी',        price: 0.35, emoji: '🫓', fillColor: '#c89020', fillH: '60%' },
  { id: 'lassi',    label: 'Sweet Lassi',   hindiLabel: 'मीठी लस्सी',   price: 0.75, emoji: '🥛', fillColor: '#e8d8b0', fillH: '70%' },
  { id: 'paratha',  label: 'Aloo Paratha',  hindiLabel: 'आलू पराठा',   price: 1.00, emoji: '🫓', fillColor: '#b87820', fillH: '65%' },
  { id: 'biscuit',  label: 'Parle-G',       hindiLabel: 'पारले-जी',     price: 0.15, emoji: '🍪', fillColor: '#d4a855', fillH: '70%' },
] as const

type MenuId = typeof MENU_ITEMS[number]['id']
type Cart = Record<MenuId, number>

const EMPTY_CART: Cart = {
  cutting: 0, kulhad: 0, masala: 0, samosa: 0,
  kachori: 0, lassi: 0, paratha: 0, biscuit: 0,
}

const LEDGER_SEED = [
  { addr: '0xaBcD…1234', amount: '2.50', time: '2 min ago' },
  { addr: '0xDeF0…5678', amount: '1.00', time: '8 min ago' },
  { addr: '0x9876…ABcD', amount: '0.50', time: '14 min ago' },
]

const GARLAND = ['🌸','🌼','🌻','🌺','🌸','🌼','🌻','🌺','🌸','🌼','🌻','🌺']
const SHELF_ITEMS = [
  { icon: '🍪', label: 'Parle-G' },
  { icon: '🌿', label: 'Elaichi' },
  { icon: '🫖', label: 'Kettle'  },
  { icon: '🫚', label: 'Adrak'   },
  { icon: '🧂', label: 'Kurkure'},
  { icon: '🥛', label: 'A2 Milk' },
  { icon: '🫙', label: 'Murabba'},
]

function GarlandStrip() {
  return (
    <div className="garland-strip">
      <div className="garland-flowers">
        {GARLAND.map((f, i) => (
          <span key={i} className="garland-flower">{f}</span>
        ))}
      </div>
      <div className="garland-string" />
    </div>
  )
}

function ShelfDecor() {
  return (
    <div className="snack-strip">
      {SHELF_ITEMS.map((p) => (
        <div key={p.label} className={`snack-pouch${p.label === 'Kettle' ? ' kettle-item' : ''}`}>
          <span className="snack-pouch-icon">{p.icon}</span>
          {p.label === 'Kettle' && (
            <span className="kettle-steam">
              <span className="ks-line" /><span className="ks-line" /><span className="ks-line" />
            </span>
          )}
          {p.label}
        </div>
      ))}
    </div>
  )
}

function KulhadArt({ fillColor, fillH, selected }: { fillColor: string; fillH: string; selected: boolean }) {
  return (
    <div className={`kulhad-item-wrap${selected ? ' kulhad-selected' : ''}`}>
      <div className="kulhad-item-steam">
        <div className="kulhad-steam-line" /><div className="kulhad-steam-line" /><div className="kulhad-steam-line" />
      </div>
      <div className="kulhad-item-rim" />
      <div className="kulhad-item-body">
        <div className="kulhad-item-fill" style={{ height: fillH, background: `linear-gradient(180deg,${fillColor}99,${fillColor})` }} />
        <div className="kulhad-item-shine" />
      </div>
    </div>
  )
}

function MadhuWalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = () => {
    if (typeof window !== 'undefined' && (window as unknown as { ethereum?: unknown }).ethereum) {
      const injectedConn = connectors.find(c => c.id === 'injected' || c.type === 'injected')
      if (injectedConn) {
        connect({ connector: injectedConn })
        return
      }
    }
    if (connectors.length > 0) {
      connect({ connector: connectors[0] })
    } else {
      toast.error('कोई वॉलेट नहीं मिला!')
    }
  }

  if (isConnected && address) {
    return (
      <button 
        className="btn-secondary" 
        style={{ borderRadius: '10px', fontSize: '12px', padding: '8px 14px', background: '#2a160c', color: '#f5d78e', border: '1px solid #78350f' }}
        onClick={() => disconnect()}
      >
        {fmt(address)} (Disconnect)
      </button>
    )
  }

  return (
    <button 
      className="btn-primary" 
      style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 16px', background: '#C86D3B', color: '#fff', border: 'none', cursor: 'pointer' }}
      onClick={handleConnect}
      disabled={isPending}
    >
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
}

function MenuTab({ address, balance: _balance, chainId }: { address?: `0x${string}`; balance?: bigint; chainId?: number }) {
  const [cart, setCart] = useState<Cart>({ ...EMPTY_CART })
  const [receiptNo] = useState(() => Math.floor(1000 + Math.random() * 8999))
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { switchChain } = useSwitchChain()
  const handledRef = useRef<string | undefined>(undefined)

  const cartTotal = MENU_ITEMS.reduce((s, i) => s + i.price * (cart[i.id] ?? 0), 0)
  const cartItems = MENU_ITEMS.filter((i) => cart[i.id] > 0)

  const inc = (id: MenuId) => setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
  const dec = (id: MenuId) => setCart((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) - 1) }))

  const handlePay = useCallback(() => {
    if (!address) { toast.error('पहले wallet connect करें'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (cartTotal <= 0) { toast.error('कुछ तो ऑर्डर करो!'); return }
    const parsed = parseAmount(TARGET_CHAIN_ID, cartTotal.toFixed(2))
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [address, parsed.raw],
    })
  }, [address, chainId, cartTotal, switchChain, writeContract])

  useEffect(() => {
    if (isSuccess && hash && handledRef.current !== hash) {
      handledRef.current = hash
      toast.success('शुक्रिया! भुगतान सफल रहा ✅', {
        description: fmt(hash),
        action: { label: 'View', onClick: () => window.open(buildTxExplorerUrl(TARGET_CHAIN_ID, hash), '_blank') },
        duration: 5000,
      })
      setCart({ ...EMPTY_CART })
    }
  }, [isSuccess, hash])

  useEffect(() => {
    if (isError && error) {
      if (!error.message.toLowerCase().includes('user rejected')) toast.error('Payment failed')
    }
  }, [isError, error])

  return (
    <div>
      <div className="shelf-section">
        <div className="shelf-plank">
          <div className="shelf-grain" />
          <span className="shelf-title">🍵 आज का मेनू — Madhu Menu</span>
          <span className="shelf-subtitle">Tap + to add</span>
        </div>

        <div className="menu-grid">
          {MENU_ITEMS.map((item) => {
            const qty = cart[item.id] ?? 0
            return (
              <div key={item.id} className={`menu-card${qty > 0 ? ' in-cart' : ''}`}>
                <div className="menu-card-visual">
                  {item.id === 'cutting' || item.id === 'kulhad' || item.id === 'masala' ? (
                    <KulhadArt fillColor={item.fillColor} fillH={item.fillH} selected={qty > 0} />
                  ) : (
                    <div className="menu-card-emoji">{item.emoji}</div>
                  )}
                </div>
                <div className="menu-card-info">
                  <div className="menu-card-hindi">{item.hindiLabel}</div>
                  <div className="menu-card-label">{item.label}</div>
                  <div className="menu-card-price">${item.price.toFixed(2)}</div>
                </div>
                <div className="menu-card-controls">
                  {qty > 0 ? (
                    <>
                      <button className="qty-btn dec" onClick={() => dec(item.id)}>−</button>
                      <span className="qty-count">{qty}</span>
                      <button className="qty-btn inc" onClick={() => inc(item.id)}>+</button>
                    </>
                  ) : (
                    <button className="qty-btn add" onClick={() => inc(item.id)}>+</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {cartItems.length > 0 && (
          <div className="ticket-receipt" style={{ marginTop: '16px' }}>
            <div className="ticket-top">
              <span className="ticket-header-text">मधु चाय वाला — Receipt</span>
              <span className="ticket-stamp">#{receiptNo}</span>
            </div>
            <div className="ticket-body">
              {cartItems.map((item) => (
                <div className="ticket-row" key={item.id}>
                  <span className="ticket-row-name">{item.emoji} {item.label}</span>
                  <span className="ticket-row-qty">×{cart[item.id]}</span>
                  <span className="ticket-row-price">${(item.price * (cart[item.id] ?? 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="ticket-total-row">
              <span className="ticket-total-label">कुल (Total)</span>
              <span className="ticket-total-amount">${cartTotal.toFixed(2)} USDC</span>
            </div>
          </div>
        )}

        <div style={{ padding: '14px 12px' }}>
          {!address ? (
            <div className="connect-prompt">
              <span className="connect-prompt-sub">☝️ Wallet connect करें, फिर चाय ऑर्डर करें</span>
            </div>
          ) : cartTotal > 0 ? (
            <button className="btn-primary" onClick={handlePay} disabled={isPending || isConfirming}>
              <TokenUSDC variant="branded" size={17} />
              {isPending ? 'Confirming…' : isConfirming ? 'Processing…' : `Pay $${cartTotal.toFixed(2)} USDC`}
            </button>
          ) : (
            <div className="status-banner info">
              <span>ऊपर + tap करके आइटम जोड़ें।</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActiveSidePanel({ address, chainId }: { address?: `0x${string}`; chainId?: number }) {
  const [tipAmt, setTipAmt] = useState('0.50')
  const { writeContract, isPending } = useWriteContract()
  const { switchChain } = useSwitchChain()

  const handleQuickTip = () => {
    if (!address) { toast.error('पहले वॉलेट कनेक्ट करें'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [CHANDA_JAR_ADDR, parseAmount(TARGET_CHAIN_ID, tipAmt).raw],
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Widget 1: Arc Stats */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">⚡</div>
          <div>
            <div className="card-title">Arc Testnet Metrics</div>
            <div className="card-subtitle">लाइव ऑन-चेन स्थिति</div>
          </div>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#120905', padding: '10px', borderRadius: '8px', border: '1px solid #3d1c0e' }}>
            <div style={{ fontSize: '10px', color: '#a88060' }}>Speed</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f5d78e' }}>Sub-second</div>
          </div>
          <div style={{ background: '#120905', padding: '10px', borderRadius: '8px', border: '1px solid #3d1c0e' }}>
            <div style={{ fontSize: '10px', color: '#a88060' }}>Currency</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2775CA' }}>USDC Native</div>
          </div>
        </div>
      </div>

      {/* Widget 2: Live Quick Tip */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🪙</div>
          <div>
            <div className="card-title">त्वरित चंदा (Quick Tip)</div>
            <div className="card-subtitle">दुकानदार को सपोर्ट करें</div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {['0.25', '0.50', '1.00'].map((amt) => (
              <button
                key={amt}
                onClick={() => setTipAmt(amt)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  border: '1px solid #78350f',
                  background: tipAmt === amt ? '#C86D3B' : '#1a0d07',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ${amt}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={handleQuickTip} disabled={isPending} style={{ width: '100%' }}>
            {isPending ? 'Sending…' : `Send $${tipAmt} USDC Tip`}
          </button>
        </div>
      </div>

      {/* Widget 3: Live Ledger Feed */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">📜</div>
          <div>
            <div className="card-title">हाल की खरीदारी</div>
            <div className="card-subtitle">Public On-Chain Ledger</div>
          </div>
        </div>
        <div className="card-body">
          {LEDGER_SEED.map((row, i) => (
            <div className="ledger-row" key={i}>
              <span className="ledger-addr">{row.addr}</span>
              <span className="ledger-amount">${row.amount}</span>
              <span className="ledger-time">{row.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChandaJar({ fillPct = 55 }: { fillPct?: number }) {
  return (
    <div className="chanda-jar-wrap">
      <div className="chanda-jar">
        <div className="chanda-jar-lid" />
        <div className="chanda-jar-body">
          <div className="chanda-jar-fill" style={{ height: `${fillPct}%` }} />
          <div className="chanda-jar-label">चंदा<br />JAR</div>
        </div>
        <div className="chanda-jar-base" />
      </div>
      <div className="chanda-jar-info">
        <div className="chanda-jar-total">₿ USDC</div>
        <div className="chanda-jar-sub">Arc Testnet · टेस्ट टोकन</div>
        <div className="chanda-jar-sub" style={{ marginTop: 4 }}>मधु जी के लिए चंदा दें 🙏</div>
      </div>
    </div>
  )
}

function FaucetTab({ address, chainId }: { address?: `0x${string}`; chainId?: number }) {
  const [mode, setMode] = useState<'claim' | 'donate'>('claim')
  const [claimAmt] = useState('1.00')
  const { writeContract: writeClaim, data: claimHash, isPending: claimPending } = useWriteContract()
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash })
  const { switchChain } = useSwitchChain()

  const handleClaim = useCallback(() => {
    if (!address) { toast.error('पहले वॉलेट कनेक्ट करें'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    writeClaim({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [address, parseAmount(TARGET_CHAIN_ID, claimAmt).raw],
    })
  }, [address, chainId, claimAmt, switchChain, writeClaim])

  const handleDonate = useCallback(() => {
    if (!address) { toast.error('पहले वॉलेट कनेक्ट करें'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    writeClaim({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [CHANDA_JAR_ADDR, parseAmount(TARGET_CHAIN_ID, '0.50').raw],
    })
  }, [address, chainId, switchChain, writeClaim])

  useEffect(() => {
    if (claimSuccess) {
      if (mode === 'claim') toast.success('1.00 USDC मिल गया! 🎉', { description: 'Test tokens claimed successfully' })
      else toast.success('शुक्रिया! 🙏 Donation received')
    }
  }, [claimSuccess, mode])

  return (
    <div className="chai-card blue-accent" style={{ position: 'relative' }}>
      <div className="faucet-glow" />
      <div className="card-header">
        <div className="card-icon blue">💧</div>
        <div>
          <div className="card-title">
            Madhu Welfare Faucet
            <span className="tag-welfare">FREE</span>
          </div>
          <div className="card-subtitle">चंदा जार — टेस्ट टोकन फ्री</div>
        </div>
      </div>
      <div className="card-body">
        {/* Chanda Jar Visual */}
        <ChandaJar fillPct={55} />

        {/* Mode Toggle */}
        <div className="faucet-toggle" style={{ marginBottom: 14 }}>
          <button
            className={`faucet-toggle-btn${mode === 'claim' ? ' active' : ''}`}
            onClick={() => setMode('claim')}
          >
            💧 Claim Token<br />
            <span style={{ fontSize: 10, opacity: 0.7 }}>टोकन लो</span>
          </button>
          <button
            className={`faucet-toggle-btn${mode === 'donate' ? ' active' : ''}`}
            onClick={() => setMode('donate')}
          >
            🪙 Donate<br />
            <span style={{ fontSize: 10, opacity: 0.7 }}>चंदा दो</span>
          </button>
        </div>

        {!address ? (
          <div className="status-banner info">
            <span>☝️ Wallet connect करें पहले</span>
          </div>
        ) : mode === 'claim' ? (
          <button className="btn-faucet" onClick={handleClaim} disabled={claimPending || claimConfirming}>
            💧 {claimPending ? 'Confirming…' : claimConfirming ? 'Processing…' : 'Claim 1.00 USDC Test Token'}
          </button>
        ) : (
          <button className="btn-terra" onClick={handleDonate} disabled={claimPending || claimConfirming}>
            🪙 {claimPending ? 'Sending…' : 'Donate $0.50 to Madhu Ji 🙏'}
          </button>
        )}
      </div>
    </div>
  )
}

const DAIRY_BATCHES = [
  { id: 'गाय-BTH-4421', vol: '140 L', fat: '4.2%', status: 'verified', badge: 'badge-green', label: 'Verified ✓', time: 'आज सुबह' },
  { id: 'गाय-BTH-4420', vol: '120 L', fat: '4.0%', status: 'transit',  badge: 'badge-yellow', label: 'In Transit', time: 'कल शाम' },
  { id: 'गाय-BTH-4419', vol: '155 L', fat: '4.5%', status: 'delivered', badge: 'badge-green', label: 'Delivered', time: '2 दिन पहले' },
]

function DairyTab() {
  return (
    <div className="chai-card">
      <div className="card-header">
        <div className="card-icon">🐄</div>
        <div>
          <div className="card-title">
            A2 Village Dairy Ledger
            <span className="tag-new">LIVE</span>
          </div>
          <div className="card-subtitle">शुद्ध गाय का दूध — ऑन-चेन ट्रैकिंग</div>
        </div>
      </div>
      <div className="card-body">
        {/* Stat Row */}
        <div className="dairy-stat-row">
          <div className="dairy-stat">
            <span className="dairy-stat-val">415 L</span>
            <span className="dairy-stat-label">कुल दूध</span>
          </div>
          <div className="dairy-stat">
            <span className="dairy-stat-val">4.2%</span>
            <span className="dairy-stat-label">Avg Fat</span>
          </div>
          <div className="dairy-stat">
            <span className="dairy-stat-val">3</span>
            <span className="dairy-stat-label">Batches</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-lo)', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          हाल के बैच — Recent Batches
        </div>

        {DAIRY_BATCHES.map((b) => (
          <div className="dairy-batch" key={b.id}>
            <span className={`dairy-badge ${b.badge}`}>{b.label}</span>
            <div className="dairy-batch-info">
              <div className="dairy-batch-id">{b.id}</div>
              <div className="dairy-batch-vol">{b.vol} — Fat: {b.fat}</div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-lo)', flexShrink: 0 }}>{b.time}</span>
          </div>
        ))}

        <div className="status-banner success" style={{ marginTop: 10, marginBottom: 0 }}>
          <span>✅ A2 प्रमाणित — Onchain verified supply chain</span>
        </div>
      </div>
    </div>
  )
}

function VaultRing({ pct }: { pct: number }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="vault-ring-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke="#60CDFF"
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(0,210,255,0.5))' }}
        />
      </svg>
      <div className="vault-ring-center">
        <span className="vault-pct">{pct}%</span>
        <span className="vault-label">locked</span>
      </div>
    </div>
  )
}

function VaultTab() {
  const locked = 14.88
  const target = 50.00
  const pct = Math.round((locked / target) * 100)

  return (
    <div className="chai-card">
      <div className="card-header">
        <div className="card-icon">🏺</div>
        <div>
          <div className="card-title">Gullak Vault</div>
          <div className="card-subtitle">गुल्लक ट्रेजरी — Madhu Ji Savings</div>
        </div>
      </div>
      <div className="card-body">
        {/* Ring chart */}
        <VaultRing pct={pct} />

        <div className="vault-balance">
          <div className="vault-bal-amount">{locked.toFixed(2)} USDC</div>
          <div className="vault-bal-label">
            Locked onchain · लक्ष्य: ${target.toFixed(0)} USDC
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-lo)' }}>जमा हुआ (Saved)</span>
            <span style={{ fontSize: 10, color: 'var(--text-lo)' }}>बाकी (Remaining): ${(target - locked).toFixed(2)}</span>
          </div>
          <div className="split-bar">
            <div className="split-segment" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#2775CA,#60CDFF)' }} />
          </div>
        </div>

        {/* Sig chips — mock multisig signers */}
        <div style={{ fontSize: 10, color: 'var(--text-lo)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Multisig दस्तखत — Signers
        </div>
        <div className="vault-sigs">
          <div className="sig-chip signed">✅ 0xAbCd…1234</div>
          <div className="sig-chip signed">✅ 0x9876…FFee</div>
          <div className="sig-chip unsigned">⏳ 0xDEF0…5678</div>
        </div>
      </div>
    </div>
  )
}

const KARMA_REQUESTS = [
  { icon: '👩‍🍳', name: 'Savitri Devi', nameHindi: 'सावित्री देवी', reason: 'बच्चों की फीस — School fees', ask: '2.00', votes: 14 },
  { icon: '👴', name: 'Ramu Kaka',   nameHindi: 'रामू काका',   reason: 'दवाई — Medical support',  ask: '1.50', votes: 9  },
  { icon: '🧑‍🌾', name: 'Kiran Bai',  nameHindi: 'किरण बाई',  reason: 'खेती बीज — Seeds for farm', ask: '3.00', votes: 21 },
]

function KarmaTab({ address, chainId }: { address?: `0x${string}`; chainId?: number }) {
  const [tipAmt, setTipAmt] = useState('1.00')
  const { writeContract, isPending } = useWriteContract()
  const { switchChain } = useSwitchChain()
  const [voted, setVoted] = useState<Set<string>>(new Set())

  const handleTip = useCallback(() => {
    if (!address) { toast.error('पहले वॉलेट कनेक्ट करें'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    writeContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer', args: [CHANDA_JAR_ADDR, parseAmount(TARGET_CHAIN_ID, tipAmt).raw] })
  }, [address, chainId, switchChain, tipAmt, writeContract])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Artisan Story Card */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🪙</div>
          <div>
            <div className="card-title">Chai Ka Chanda</div>
            <div className="card-subtitle">कर्म पूल — Tip Jar for Madhu Ji</div>
          </div>
        </div>
        <div className="card-body">
          <div className="artisan-story">
            <div className="artisan-avatar">👨‍🍳</div>
            <div className="artisan-text">
              <div className="artisan-name">Madhu Ji — मधु जी</div>
              <div className="artisan-village">🏡 Varanasi, Uttar Pradesh</div>
              <div className="artisan-desc">
                20 साल से चाय बना रहे हैं। हर कप में प्यार है, हर घूंट में जिंदगी।
                Running his tapri for 20 years — every cup made with heart.
              </div>
            </div>
          </div>

          {/* Tip amount chips */}
          <div className="tip-amounts" style={{ marginTop: 14 }}>
            {['0.25', '0.50', '1.00'].map((a) => (
              <button
                key={a}
                className={`tip-chip${tipAmt === a ? ' active' : ''}`}
                onClick={() => setTipAmt(a)}
              >
                ${a}
              </button>
            ))}
          </div>

          <button className="btn-primary" onClick={handleTip} disabled={isPending || !address}>
            🫶 {isPending ? 'Sending…' : `Send $${tipAmt} USDC Tip`}
          </button>
        </div>
      </div>

      {/* Community Karma Requests */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🌺</div>
          <div>
            <div className="card-title">सामुदायिक मदद</div>
            <div className="card-subtitle">Community Help Requests</div>
          </div>
        </div>
        <div className="card-body">
          {KARMA_REQUESTS.map((req) => (
            <div className="karma-request" key={req.name}>
              <div className="karma-req-icon">{req.icon}</div>
              <div className="karma-req-info">
                <div className="karma-req-name">{req.nameHindi} · {req.name}</div>
                <div className="karma-req-reason">{req.reason}</div>
                <div style={{ fontSize: 10, color: 'var(--usdc-cyan)', marginTop: 2 }}>
                  ${req.ask} USDC · {req.votes + (voted.has(req.name) ? 1 : 0)} votes
                </div>
              </div>
              {voted.has(req.name) ? (
                <button className="karma-vote-btn yes" disabled>✅ Voted</button>
              ) : (
                <button
                  className="karma-vote-btn yes"
                  onClick={() => setVoted((p) => new Set([...p, req.name]))}
                >
                  🫶 Yes
                </button>
              )}
            </div>
          ))}
          <div className="status-banner info" style={{ marginTop: 10, marginBottom: 0 }}>
            <span>वोट करें, खिलाएं — Vote to fund community needs</span>
          </div>
        </div>
      </div>
    </div>
  )
}

type Tab = 'menu' | 'faucet' | 'dairy' | 'vault' | 'karma'
const NAV_ITEMS: { id: Tab; flower: string; label: string; hindi: string }[] = [
  { id: 'menu',   flower: '🌸', label: 'Menu',   hindi: 'मेनू'   },
  { id: 'faucet', flower: '💧', label: 'Chanda', hindi: 'चंदा'   },
  { id: 'dairy',  flower: '🐄', label: 'Dairy',  hindi: 'डेयरी'  },
  { id: 'vault',  flower: '🏺', label: 'Vault',  hindi: 'गुल्लक' },
  { id: 'karma',  flower: '🌺', label: 'Karma',  hindi: 'कर्म'   },
]

export default function MadhuChaiWalaApp() {
  const [tab, setTab] = useState<Tab>('menu')
  const { address, isConnected, chainId } = useAccount()

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address },
  })

  return (
    <div className="chai-root" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px 80px' }}>
      <GarlandStrip />

      <div className="tarpaulin-roof">
        <div className="tarpaulin-row">
          <span style={{ fontSize: 11, color: 'var(--text-lo)', fontFamily: 'var(--font-mono)' }}>Arc Testnet · USDC</span>
          <span style={{ fontSize: 11, color: 'var(--saffron)' }}>माटी की खुशबू ✦ अपनों का प्यार</span>
        </div>
      </div>

      <div className="chai-header">
        <div className="chai-brand">
          <div className="chai-brand-kulhad">
            <div className="brand-kulhad-steam"><div className="brand-steam-line" /><div className="brand-steam-line" /></div>
            <div className="brand-kulhad-body"><div className="brand-kulhad-rim" /></div>
          </div>
          <div className="chai-brand-text">
            <div className="chai-brand-name">Madhu Chai Wala</div>
            <div className="chai-brand-deva">मधु चाय वाला</div>
            <div className="chai-brand-tagline">माटी की खुशबू, अपनों का प्यार</div>
          </div>
        </div>
        <div className="connect-btn-wrap">
          <MadhuWalletConnect />
        </div>
      </div>

      <ShelfDecor />

      {isConnected && address && (
        <div className="balance-banner">
          <div className="balance-banner-inner">
            <span style={{ fontSize: 11, color: 'var(--text-lo)', fontFamily: 'var(--font-mono)' }}>{fmt(address)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {chainId !== TARGET_CHAIN_ID && (
                <span style={{ fontSize: 10, color: '#F1C40F', border: '1px solid #F1C40F44', borderRadius: 6, padding: '2px 7px' }}>Wrong Network</span>
              )}
              <span className="usdc-badge">
                <TokenUSDC variant="branded" size={12} />
                {usdcBalance !== undefined ? fmtUSDC(usdcBalance) : '—'} USDC
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Grid Container */}
      <div className="app-responsive-grid" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div className="main-content-area">
          {tab === 'menu'   && <MenuTab   address={address} balance={usdcBalance} chainId={chainId} />}
          {tab === 'faucet' && <FaucetTab address={address} chainId={chainId} />}
          {tab === 'dairy'  && <DairyTab />}
          {tab === 'vault'  && <VaultTab />}
          {tab === 'karma'  && <KarmaTab  address={address} chainId={chainId} />}
        </div>

        {/* Desktop Active Sidebar Panel */}
        <div className="desktop-only-sidebar">
          <ActiveSidePanel address={address} chainId={chainId} />
        </div>
      </div>

      <nav className="fulwari-nav" aria-label="Tapri Navigation">
        <div className="fulwari-inner">
          <div className="fulwari-bar">
            {NAV_ITEMS.map((n) => (
              <button key={n.id} className={`fulwari-btn${tab === n.id ? ' active' : ''}`} onClick={() => setTab(n.id)}>
                <span className="fulwari-flower">{n.flower}</span>
                <span className="fulwari-label">{n.hindi}</span>
                {tab === n.id && <span className="fulwari-active-dot" />}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}

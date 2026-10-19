/**
 * Madhu Chai Wala — माधु चाय वाला
 * Arc Testnet × Circle USDC × Indian Roadside Tapri
 * Multi-wallet compatibility & Responsive Tapri UI
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

// ─── Chain / USDC config ──────────────────────────────────────
const TARGET_CHAIN_ID = 5042002 // Arc Testnet
const usdcFact = getUsdc(TARGET_CHAIN_ID)
const USDC_ADDRESS = (usdcFact?.address ?? '0x3600000000000000000000000000000000000000') as `0x${string}`
const CHANDA_JAR_ADDR = '0x000000000000000000000000000000000000dEaD' as `0x${string}`

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`
const fmtUSDC = (raw: bigint): string =>
  (Number(raw) / 10 ** usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)

// ─── Menu data ────────────────────────────────────────────────
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

// ─── Static / seed data ───────────────────────────────────────
const LEDGER_SEED = [
  { addr: '0xaBcD…1234', amount: '2.50', time: '2m ago' },
  { addr: '0xDeF0…5678', amount: '1.00', time: '8m ago' },
  { addr: '0x9876…ABcD', amount: '5.00', time: '15m ago' },
]

const ROYALTY_SPLITS = [
  { label: 'Madhu Ji', pct: 60, color: '#C86D3B' },
  { label: 'Dairy',    pct: 20, color: '#2775CA' },
  { label: 'Elaichi',  pct: 12, color: '#F1C40F' },
  { label: 'Gas',      pct:  8, color: '#7A6A55' },
]

const DAIRY_BATCHES = [
  { id: 'गाय-BTH-4421', status: 'verified',   vol: '140 L', fat: '4.2%' },
  { id: 'गाय-BTH-4420', status: 'in-transit', vol: '120 L', fat: '3.9%' },
  { id: 'गाय-BTH-4419', status: 'expired',    vol: '95 L',  fat: '3.5%' },
]

const KHATA_ENTRIES = [
  { name: 'Ramesh Ji', due: 'आज देना',   amount: 4.50, status: 'overdue' as const },
  { name: 'Sita Devi', due: '3 दिन में', amount: 2.25, status: 'current' as const },
  { name: 'Mohan Lal', due: 'चुकाया',    amount: 8.75, status: 'paid'    as const },
]

const KARMA_REQUESTS = [
  { id: 1, name: 'Ajay',  reason: 'चाय-वाला घायल — मदद चाहिए',  votes: 12, icon: '🏥' },
  { id: 2, name: 'Priya', reason: 'स्टॉल चोरी हुआ, पुनर्निर्माण', votes:  7, icon: '🔧' },
]

const VAULT_SIGNERS = [
  { addr: '0xAB12…', signed: true  },
  { addr: '0xCD34…', signed: true  },
  { addr: '0xEF56…', signed: false },
]

const GARLAND = ['🌸','🌼','🌻','🌺','🌸','🌼','🌻','🌺','🌸','🌼','🌻','🌺',
                 '🌸','🌼','🌻','🌺','🌸','🌼','🌻','🌺','🌸','🌼','🌻','🌺']

const SHELF_ITEMS = [
  { icon: '🍪', label: 'Parle-G'   },
  { icon: '🌿', label: 'Elaichi'   },
  { icon: '🫖', label: 'Kettle'    },
  { icon: '🫚', label: 'Adrak'     },
  { icon: '🧂', label: 'Kurkure'   },
  { icon: '🥛', label: 'A2 Milk'   },
  { icon: '🫙', label: 'Murabba'   },
]

// =====================================================================
// SMALL DECORATIVE COMPONENTS
// =====================================================================

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
              <span className="ks-line" />
              <span className="ks-line" />
              <span className="ks-line" />
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
        <div className="kulhad-steam-line" />
        <div className="kulhad-steam-line" />
        <div className="kulhad-steam-line" />
      </div>
      <div className="kulhad-item-rim" />
      <div className="kulhad-item-body">
        <div className="kulhad-item-fill"
          style={{ height: fillH, background: `linear-gradient(180deg,${fillColor}99,${fillColor})` }} />
        <div className="kulhad-item-shine" />
      </div>
    </div>
  )
}

function RingChart({ pct, size, color, stroke }: { pct: number; size: number; color: string; stroke: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

// Custom Stable Direct Wallet Connection Button
function UniversalConnectControl() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

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
    <div style={{ position: 'relative' }}>
      <button 
        className="btn-primary" 
        style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 16px', background: '#C86D3B', color: '#fff', border: 'none', cursor: 'pointer' }}
        onClick={() => {
          const injectedConn = connectors.find(c => c.id === 'injected' || c.name.toLowerCase().includes('brave') || c.name.toLowerCase().includes('metamask'))
          if (injectedConn) {
            connect({ connector: injectedConn })
          } else if (connectors[0]) {
            connect({ connector: connectors[0] })
          } else {
            setOpen(!open)
          }
        }}
      >
        Connect Wallet
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', padding: '20px' }}>
            <h4 style={{ color: '#F5D78E', marginBottom: '12px', textAlign: 'center' }}>Select Wallet</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {connectors.map((c) => (
                <button
                  key={c.id}
                  className="btn-secondary"
                  style={{ width: '100%', textAlign: 'left', padding: '10px' }}
                  onClick={() => {
                    connect({ connector: c })
                    setOpen(false)
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// MENU TAB — stateful +/- cart, expanded items, USDC pay
// =====================================================================
function MenuTab({
  address, balance, chainId,
}: { address?: `0x${string}`; balance?: bigint; chainId?: number }) {
  const [cart, setCart] = useState<Cart>({ ...EMPTY_CART })
  const [receiptNo] = useState(() => Math.floor(1000 + Math.random() * 8999))
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { switchChain } = useSwitchChain()
  const handledRef = useRef<string | undefined>(undefined)

  const cartTotal = MENU_ITEMS.reduce((s, i) => s + i.price * (cart[i.id] ?? 0), 0)
  const cartItems = MENU_ITEMS.filter((i) => cart[i.id] > 0)

  const inc = (id: MenuId) => {
    setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
    const item = MENU_ITEMS.find((i) => i.id === id)!
    toast.success(`${item.emoji} ${item.hindiLabel} added`, { duration: 1400 })
  }
  const dec = (id: MenuId) => setCart((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) - 1) }))

  const handlePay = useCallback(() => {
    if (!address) { toast.error('पहले wallet connect करें'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (cartTotal <= 0) { toast.error('कुछ तो ऑर्डर करो! Cart is empty'); return }
    const parsed = parseAmount(TARGET_CHAIN_ID, cartTotal.toFixed(2))
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [address, parsed.raw],
    })
  }, [address, chainId, cartTotal, switchChain, writeContract])

  useEffect(() => {
    if (isSuccess && hash && handledRef.current !== hash) {
      handledRef.current = hash
      toast.success('Shukriya! भुगतान हो गया ✅', {
        description: fmt(hash),
        action: { label: 'View', onClick: () => window.open(buildTxExplorerUrl(TARGET_CHAIN_ID, hash), '_blank') },
        duration: 5000,
      })
      setCart({ ...EMPTY_CART })
    }
  }, [isSuccess, hash])

  useEffect(() => {
    if (isError) {
      const msg = (error as Error)?.message?.toLowerCase() ?? ''
      if (!msg.includes('user rejected')) toast.error('Payment failed — try again')
    }
  }, [isError, error])

  return (
    <div>
      <div className="shelf-section">
        <div className="shelf-plank">
          <div className="shelf-grain" />
          <span className="shelf-title">🍵 आज का मेनू — Today's Menu</span>
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
                      <button className="qty-btn dec" onClick={() => dec(item.id)} aria-label="Remove one">−</button>
                      <span className="qty-count">{qty}</span>
                      <button className="qty-btn inc" onClick={() => inc(item.id)} aria-label="Add one">+</button>
                    </>
                  ) : (
                    <button className="qty-btn add" onClick={() => inc(item.id)} aria-label={`Add ${item.label}`}>+</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {cartItems.length > 0 && (
          <div className="ticket-receipt">
            <div className="ticket-top">
              <span className="ticket-header-text">Madhu Chai Wala — Receipt</span>
              <span className="ticket-stamp">#{receiptNo}</span>
            </div>
            <div className="ticket-perforation">
              {Array.from({ length: 24 }).map((_, i) => <div key={i} className="ticket-perf-dot" />)}
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

        <div style={{ padding: '0 12px 14px' }}>
          {!address ? (
            <div className="connect-prompt">
              <span className="connect-prompt-sub">☝️ Wallet connect करें, फिर chai order करें</span>
            </div>
          ) : cartTotal > 0 ? (
            <>
              {chainId !== TARGET_CHAIN_ID && (
                <div className="status-banner warning" style={{ marginBottom: 8 }}>
                  Switch to Arc Testnet to pay
                </div>
              )}

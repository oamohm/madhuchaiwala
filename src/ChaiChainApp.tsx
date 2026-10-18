/**
 * Madhu Chai Wala — माधु चाय वाला
 * Arc Testnet × Circle USDC × Indian Roadside Tapri
 * ConnectKit wallet modal (MetaMask / Coinbase / WalletConnect / Injected)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { ConnectKitButton } from 'connectkit'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
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
// Chanda Jar community address — replace with a real multisig for production
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
// SMALL COMPONENTS
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
      args: [address, parsed.raw], // self-send for demo safety
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
    // oxlint-disable-next-line react/set-state-in-effect
  }, [isSuccess, hash])

  useEffect(() => {
    if (isError) {
      const msg = (error as Error)?.message?.toLowerCase() ?? ''
      if (!msg.includes('user rejected')) toast.error('Payment failed — try again')
    }
    // oxlint-disable-next-line react/set-state-in-effect
  }, [isError, error])

  return (
    <div>
      <div className="shelf-section">
        {/* Wooden sign plank */}
        <div className="shelf-plank">
          <div className="shelf-grain" />
          <span className="shelf-title">🍵 आज का मेनू — Today's Menu</span>
          <span className="shelf-subtitle">Tap + to add</span>
        </div>

        {/* Menu grid with +/- controls */}
        <div className="menu-grid">
          {MENU_ITEMS.map((item) => {
            const qty = cart[item.id] ?? 0
            return (
              <div key={item.id} className={`menu-card${qty > 0 ? ' in-cart' : ''}`}>
                {/* Kulhad/food visual */}
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
                {/* +/- controls */}
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

        {/* Ticket receipt */}
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

        {/* Pay button */}
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
              <button className="btn-primary" onClick={handlePay} disabled={isPending || isConfirming}>
                <TokenUSDC variant="branded" size={17} />
                {isPending ? 'Wallet में confirm करें…' : isConfirming ? 'Processing…' : `Pay $${cartTotal.toFixed(2)} USDC`}
              </button>
            </>
          ) : (
            <div className="status-banner info">
              <span>ऊपर + tap करके order करें। Tap + above to add items.</span>
            </div>
          )}
        </div>
      </div>

      {balance !== undefined && (
        <div style={{ textAlign: 'right', marginTop: 6, paddingRight: 4 }}>
          <span className="usdc-badge">
            <TokenUSDC variant="branded" size={11} />
            Balance: {fmtUSDC(balance)} USDC
          </span>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// FAUCET TAB — claim tokens + donate to Chanda Jar
// =====================================================================
function FaucetTab({ address, chainId }: { address?: `0x${string}`; chainId?: number }) {
  const CLAIM_AMOUNTS = ['1.00', '2.00', '5.00']
  const DONATE_AMOUNTS = ['0.25', '0.50', '1.00', '2.00']

  const [claimAmt,  setClaimAmt]  = useState('1.00')
  const [donateAmt, setDonateAmt] = useState('0.50')
  const [lastClaimed, setLastClaimed] = useState<number | null>(null)
  const [tickNow, setTickNow] = useState(() => Date.now())
  const [mode, setMode] = useState<'claim' | 'donate'>('claim')

  // Claim hook
  const { writeContract: writeClaim, data: claimHash, isPending: claimPending } = useWriteContract()
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash })

  // Donate hook
  const { writeContract: writeDonate, data: donateHash, isPending: donatePending } = useWriteContract()
  const { isLoading: donateConfirming, isSuccess: donateSuccess } = useWaitForTransactionReceipt({ hash: donateHash })

  const { switchChain } = useSwitchChain()
  const handledClaimRef  = useRef<string | undefined>(undefined)
  const handledDonateRef = useRef<string | undefined>(undefined)

  const cooldownMs = 5 * 60 * 1000
  const canClaim   = lastClaimed === null || tickNow - lastClaimed > cooldownMs
  const secsLeft   = lastClaimed ? Math.max(0, Math.ceil((cooldownMs - (tickNow - lastClaimed)) / 1000)) : 0

  useEffect(() => {
    if (!lastClaimed) return
    const t = setInterval(() => setTickNow(Date.now()), 1000)
    return () => clearInterval(t)
    // oxlint-disable-next-line react/set-state-in-effect
  }, [lastClaimed])

  const handleClaim = useCallback(() => {
    if (!address) { toast.error('Connect wallet first'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    if (!canClaim) { toast.error(`Wait ${Math.ceil(secsLeft / 60)}m before claiming again`); return }
    writeClaim({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [address, parseAmount(TARGET_CHAIN_ID, claimAmt).raw],
    })
  }, [address, chainId, claimAmt, canClaim, secsLeft, switchChain, writeClaim])

  const handleDonate = useCallback(() => {
    if (!address) { toast.error('Connect wallet first'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    writeDonate({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [CHANDA_JAR_ADDR, parseAmount(TARGET_CHAIN_ID, donateAmt).raw],
    })
  }, [address, chainId, donateAmt, switchChain, writeDonate])

  useEffect(() => {
    if (claimSuccess && claimHash && handledClaimRef.current !== claimHash) {
      handledClaimRef.current = claimHash
      setLastClaimed(Date.now())
      toast.success(`${claimAmt} USDC मिल गया! Chai lo! ☕`, { duration: 5000 })
    }
    // oxlint-disable-next-line react/set-state-in-effect
  }, [claimSuccess, claimHash, claimAmt])

  useEffect(() => {
    if (donateSuccess && donateHash && handledDonateRef.current !== donateHash) {
      handledDonateRef.current = donateHash
      toast.success(`${donateAmt} USDC Chanda Jar में गया — Shukriya! 🙏`, { duration: 5000 })
    }
    // oxlint-disable-next-line react/set-state-in-effect
  }, [donateSuccess, donateHash, donateAmt])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Mode toggle */}
      <div className="faucet-toggle">
        <button className={`faucet-toggle-btn${mode === 'claim' ? ' active' : ''}`} onClick={() => setMode('claim')}>
          💧 Claim Free Tokens
        </button>
        <button className={`faucet-toggle-btn${mode === 'donate' ? ' active' : ''}`} onClick={() => setMode('donate')}>
          🪙 Donate to Chanda Jar
        </button>
      </div>

      {mode === 'claim' && (
        <div className="chai-card blue-accent" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="faucet-glow" />
          <div className="card-header">
            <div className="card-icon blue">💧</div>
            <div>
              <div className="card-title">Universal Welfare Faucet</div>
              <div className="card-subtitle">दया व कल्याण फ़ौसेट</div>
            </div>
            <span className="tag-welfare">FREE</span>
          </div>
          <div className="card-body" style={{ position: 'relative', zIndex: 1 }}>
            <div className="status-banner success" style={{ marginBottom: 12 }}>
              <span>🤲 Balance नहीं? कोई बात नहीं — free test USDC lo!</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 14 }}>
              माधु चाय वाला में हर इंसान का स्वागत है। Claim test tokens
              to experience the full tapri. Arc Testnet only — no real value.
            </p>
            <div className="faucet-amount-grid" style={{ marginBottom: 14 }}>
              {CLAIM_AMOUNTS.map((a) => (
                <button key={a}
                  className={`faucet-amount-chip${claimAmt === a ? ' active' : ''}`}
                  onClick={() => setClaimAmt(a)}
                >
                  ${a}
                </button>
              ))}
            </div>
            {!canClaim ? (
              <div className="faucet-cooldown">
                ⏳ Cooldown: {Math.floor(secsLeft / 60)}m {secsLeft % 60}s remaining
              </div>
            ) : (
              <button className="btn-faucet" onClick={handleClaim}
                disabled={!address || claimPending || claimConfirming}>
                💧 {claimPending ? 'Wallet में confirm करें…'
                  : claimConfirming ? 'Sending…'
                  : `Claim ${claimAmt} USDC Test Tokens`}
              </button>
            )}
            {!address && (
              <p style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-lo)' }}>
                Wallet connect करें ऊपर से
              </p>
            )}
          </div>
        </div>
      )}

      {mode === 'donate' && (
        <div className="chai-card" style={{ borderColor: '#C86D3B' }}>
          <div className="card-header">
            <div className="card-icon">🪙</div>
            <div>
              <div className="card-title">Chanda Jar — चंदा जार</div>
              <div className="card-subtitle">Community kindness fund — दान करें</div>
            </div>
          </div>
          <div className="card-body">
            <div className="status-banner info" style={{ marginBottom: 14 }}>
              <span>🫶 आपका चंदा किसी की मुफ्त chai बनेगा। Your USDC funds free chai for others.</span>
            </div>

            {/* Chanda jar visual */}
            <div className="chanda-jar-wrap">
              <div className="chanda-jar">
                <div className="chanda-jar-lid" />
                <div className="chanda-jar-body">
                  <div className="chanda-jar-fill" />
                  <div className="chanda-jar-label">चंदा<br/>जार</div>
                </div>
                <div className="chanda-jar-base" />
              </div>
              <div className="chanda-jar-info">
                <div className="chanda-jar-total">28.50 USDC</div>
                <div className="chanda-jar-sub">In community jar</div>
              </div>
            </div>

            <div className="faucet-amount-grid" style={{ marginBottom: 14 }}>
              {DONATE_AMOUNTS.map((a) => (
                <button key={a}
                  className={`faucet-amount-chip${donateAmt === a ? ' active' : ''}`}
                  onClick={() => setDonateAmt(a)}
                >
                  ${a}
                </button>
              ))}
            </div>

            <button className="btn-terra" onClick={handleDonate}
              disabled={!address || donatePending || donateConfirming}>
              🙏 {donatePending ? 'Confirm in wallet…'
                : donateConfirming ? 'Sending…'
                : `Donate ${donateAmt} USDC to Chanda Jar`}
            </button>
            {!address && (
              <p style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-lo)' }}>
                Connect wallet to donate
              </p>
            )}

            <div className="section-divider" style={{ margin: '14px 0 10px' }} />
            <div style={{ fontSize: 11, color: 'var(--text-lo)', lineHeight: 1.5 }}>
              Funds go to the community Chanda Jar address. Deploy a real multisig for production use.
            </div>
          </div>
        </div>
      )}

      {/* Recent tips ledger */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">📋</div>
          <div>
            <div className="card-title">Recent Chanda</div>
            <div className="card-subtitle">Public tip ledger</div>
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
          {address && (
            <div className="ledger-row">
              <span className="ledger-addr" style={{ color: '#00D2FF' }}>{fmt(address)} (you)</span>
              <span className="ledger-amount">—</span>
              <span className="ledger-time">now</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// DAIRY TAB — A2 ledger, royalties, nominee
// =====================================================================
function DairyTab() {
  const [nomineeAddr, setNomineeAddr] = useState('')
  const [timelockDays, setTimelockDays] = useState('30')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🐄</div>
          <div>
            <div className="card-title">A2 Village Dairy Ledger</div>
            <div className="card-subtitle">शुद्ध गाय का दूध — supply chain</div>
          </div>
          <span className="tag-new">LIVE</span>
        </div>
        <div className="card-body">
          <div className="dairy-stat-row">
            <div className="dairy-stat"><span className="dairy-stat-val">142 L</span><span className="dairy-stat-label">आज का दूध</span></div>
            <div className="dairy-stat"><span className="dairy-stat-val">4.2%</span><span className="dairy-stat-label">Fat</span></div>
            <div className="dairy-stat"><span className="dairy-stat-val">A2+</span><span className="dairy-stat-label">Grade</span></div>
          </div>
          {DAIRY_BATCHES.map((b) => (
            <div className="dairy-batch" key={b.id}>
              <span className={`dairy-badge ${b.status === 'verified' ? 'badge-green' : b.status === 'in-transit' ? 'badge-yellow' : 'badge-red'}`}>
                {b.status === 'verified' ? 'Verified' : b.status === 'in-transit' ? 'In Transit' : 'Expired'}
              </span>
              <div className="dairy-batch-info">
                <div className="dairy-batch-id">{b.id}</div>
                <div className="dairy-batch-vol">{b.vol} — Fat: {b.fat}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">💰</div>
          <div><div className="card-title">Chai-Wala Royalties</div><div className="card-subtitle">Auto revenue split</div></div>
        </div>
        <div className="card-body">
          <div className="split-bar">
            {ROYALTY_SPLITS.map((s) => (
              <div key={s.label} className="split-segment" style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>
          <div className="split-legend">
            {ROYALTY_SPLITS.map((s) => (
              <div className="split-item" key={s.label}>
                <div className="split-dot" style={{ background: s.color }} />
                <span>{s.label}</span>
                <span className="split-pct">{s.pct}%</span>
              </div>
            ))}
          </div>
          <div className="section-divider" style={{ margin: '10px 0 8px' }} />
          <p style={{ fontSize: 11, color: 'var(--text-lo)', lineHeight: 1.5 }}>
            हर USDC payment अपने-आप सभी को बंट जाती है।
          </p>
        </div>
      </div>

      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">📜</div>
          <div><div className="card-title">Desi Nominee</div><div className="card-subtitle">वारिस — Heir settlement lock</div></div>
        </div>
        <div className="card-body">
          <div className="nominee-lock">
            <div className="nominee-icon-ring">🔐</div>
            <div className="nominee-title">Heir Settlement Lock</div>
            <div className="nominee-desc">Funds unlock after inactivity window expires onchain.</div>
          </div>
          <div className="nominee-timer">
            <div className="nominee-timer-val">29d 14h 22m</div>
            <div className="nominee-timer-label">Inactivity Timer</div>
          </div>
          <div className="input-group">
            <label className="input-label">Nominee Wallet (वारिस)</label>
            <input className="chai-input" placeholder="0x…" value={nomineeAddr} onChange={(e) => setNomineeAddr(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Timelock (days)</label>
            <input className="chai-input" type="number" min="7" max="365" value={timelockDays} onChange={(e) => setTimelockDays(e.target.value)} />
          </div>
          <button className="btn-secondary" style={{ width: '100%' }}
            onClick={() => toast.info('Nominee set (deploy contract to activate)')}>
            Set Nominee
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// VAULT TAB — Gullak + Baki Khata
// =====================================================================
function VaultTab({ address, chainId }: { address?: `0x${string}`; chainId?: number }) {
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const settlingIdRef = useRef<string | null>(null)
  const handledRef = useRef<string | undefined>(undefined)
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { switchChain } = useSwitchChain()

  const handleSettle = useCallback((name: string, amount: number) => {
    if (!address) { toast.error('Connect wallet first'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    setSettlingId(name)
    settlingIdRef.current = name
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [address, parseAmount(TARGET_CHAIN_ID, amount.toFixed(2)).raw],
    })
  }, [address, chainId, switchChain, writeContract])

  useEffect(() => {
    if (isSuccess && hash && handledRef.current !== hash) {
      handledRef.current = hash
      toast.success(`Baki chuka di — ${settlingIdRef.current}! 🙏`)
      setSettlingId(null)
      settlingIdRef.current = null
    }
    // oxlint-disable-next-line react/set-state-in-effect
  }, [isSuccess, hash])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🏺</div>
          <div><div className="card-title">Gullak Vault</div><div className="card-subtitle">गुल्लक — 2-of-3 multi-sig treasury</div></div>
        </div>
        <div className="card-body">
          <div className="vault-ring-wrap">
            <RingChart pct={67} size={80} color="#2775CA" stroke={8} />
            <div className="vault-ring-center">
              <span className="vault-pct">67%</span>
              <span className="vault-label">Funded</span>
            </div>
          </div>
          <div className="vault-balance">
            <div className="vault-bal-amount">14.88 USDC</div>
            <div className="vault-bal-label">≈ ₹1,240 locked onchain</div>
          </div>
          <div className="vault-sigs">
            {VAULT_SIGNERS.map((s) => (
              <span key={s.addr} className={`sig-chip ${s.signed ? 'signed' : 'unsigned'}`}>
                {s.signed ? '✓' : '○'} {s.addr}
              </span>
            ))}
          </div>
          <div className="section-divider" style={{ margin: '10px 0' }} />
          <p style={{ fontSize: 11, color: 'var(--text-lo)', lineHeight: 1.5 }}>
            2-of-3 multisig. Approvals required for withdrawals above 5 USDC.
          </p>
        </div>
      </div>

      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">📒</div>
          <div><div className="card-title">Baki Khata</div><div className="card-subtitle">बाकी खाता — BNPL tab ledger</div></div>
        </div>
        <div className="card-body">
          {KHATA_ENTRIES.map((entry) => (
            <div className="khata-row" key={entry.name}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="khata-name">{entry.name}</div>
                <div className="khata-due">{entry.due}</div>
              </div>
              <span className={`khata-amount ${entry.status}`}>${entry.amount.toFixed(2)}</span>
              {entry.status !== 'paid' ? (
                <button className="khata-settle-btn"
                  disabled={!address || isPending || isConfirming}
                  onClick={() => handleSettle(entry.name, entry.amount)}>
                  {settlingId === entry.name && (isPending || isConfirming) ? '…' : 'Settle'}
                </button>
              ) : (
                <span className="dairy-badge badge-green">Paid</span>
              )}
            </div>
          ))}
          <div className="section-divider" style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Total outstanding</span>
            <span className="usdc-badge"><TokenUSDC variant="branded" size={11} /> $6.75 USDC</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// KARMA TAB — SOS pool, tip, artisan stories
// =====================================================================
function KarmaTab({ address, chainId }: { address?: `0x${string}`; chainId?: number }) {
  const [tipAmt, setTipAmt] = useState('1.00')
  const [votedIds, setVotedIds] = useState<number[]>([])
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { switchChain } = useSwitchChain()
  const TIP_AMOUNTS = ['0.25', '0.50', '1.00', '2.00', '5.00']
  const handledRef = useRef<string | undefined>(undefined)

  const handleTip = useCallback(() => {
    if (!address) { toast.error('Connect wallet first'); return }
    if (chainId !== TARGET_CHAIN_ID) { switchChain({ chainId: TARGET_CHAIN_ID }); return }
    writeContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'transfer',
      args: [address, parseAmount(TARGET_CHAIN_ID, tipAmt).raw] })
  }, [address, chainId, tipAmt, switchChain, writeContract])

  useEffect(() => {
    if (isSuccess && hash && handledRef.current !== hash) {
      handledRef.current = hash
      toast.success(`${tipAmt} USDC chanda bheja — Shukriya! 🙏`, { duration: 4000 })
    }
    // oxlint-disable-next-line react/set-state-in-effect
  }, [isSuccess, hash, tipAmt])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Potter artisan story */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🏺</div>
          <div><div className="card-title">Kumbhar Ki Kahani</div><div className="card-subtitle">कुम्हार की कहानी — Potter artisan story</div></div>
          <span className="tag-new">Heritage</span>
        </div>
        <div className="card-body">
          <div className="artisan-story">
            <div className="artisan-avatar">🧑‍🎨</div>
            <div className="artisan-text">
              <div className="artisan-name">Rameshwar Prajapati</div>
              <div className="artisan-village">गाँव: Khurja, UP</div>
              <p className="artisan-desc">
                हर kulhad जो आप use करते हैं, वो Rameshwar ji के हाथों से बना है।
                Their family has crafted clay kulhads for 4 generations.
                Each cup tells a story of earth, water, and fire.
              </p>
              <button className="btn-secondary" style={{ marginTop: 10 }}
                onClick={() => toast.success('Digital Kulhad NFT claimed! 🏺 Deploy contract for live mint.')}>
                🏺 Claim Digital Kulhad Souvenir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tip jar */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🪙</div>
          <div><div className="card-title">Chai Ka Chanda</div><div className="card-subtitle">टिप जार — Tip Madhu Ji</div></div>
        </div>
        <div className="card-body">
          <div className="tip-amounts">
            {TIP_AMOUNTS.map((a) => (
              <button key={a} className={`tip-chip${tipAmt === a ? ' active' : ''}`} onClick={() => setTipAmt(a)}>
                ${a}
              </button>
            ))}
            <div style={{ position: 'relative' }}>
              <input className="chai-input" style={{ paddingLeft: 22, fontSize: 12, minHeight: 40 }}
                value={tipAmt} onChange={(e) => setTipAmt(e.target.value)} placeholder="Custom" />
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-lo)' }}>$</span>
            </div>
          </div>
          <button className="btn-primary" onClick={handleTip}
            disabled={!address || isPending || isConfirming} style={{ marginBottom: 12 }}>
            🫶 {isPending ? 'Confirm…' : isConfirming ? 'Sending…' : `Send ${tipAmt} USDC Chanda`}
          </button>
          <div className="section-divider" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 10, color: 'var(--text-lo)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Public Ledger</div>
          {LEDGER_SEED.map((row, i) => (
            <div className="ledger-row" key={i}>
              <span className="ledger-addr">{row.addr}</span>
              <span className="ledger-amount">${row.amount}</span>
              <span className="ledger-time">{row.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SOS Pool */}
      <div className="chai-card">
        <div className="card-header">
          <div className="card-icon">🙏</div>
          <div><div className="card-title">Chai-SOS Karma Pool</div><div className="card-subtitle">Community emergency fund</div></div>
        </div>
        <div className="card-body">
          <div className="karma-pool-ring" style={{ marginBottom: 12 }}>
            <RingChart pct={43} size={120} color="#2775CA" stroke={10} />
            <div className="karma-center">
              <span className="karma-total">28.50</span>
              <span className="karma-label" style={{ fontSize: 9 }}>USDC</span>
              <span className="karma-label">Pool</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-mid)', textAlign: 'center', marginBottom: 12, lineHeight: 1.5 }}>
            Community votes to release USDC for verified emergencies
          </p>
          {KARMA_REQUESTS.map((req) => (
            <div className="karma-request" key={req.id}>
              <span className="karma-req-icon">{req.icon}</span>
              <div className="karma-req-info">
                <div className="karma-req-name">{req.name}</div>
                <div className="karma-req-reason">{req.reason}</div>
                <div style={{ fontSize: 10, color: 'var(--text-lo)', marginTop: 2 }}>{req.votes} votes</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="karma-vote-btn yes"
                  disabled={votedIds.includes(req.id) || !address}
                  onClick={() => { setVotedIds((v) => [...v, req.id]); toast.success(`Voted to help ${req.name} 🙏`) }}>
                  {votedIds.includes(req.id) ? 'Voted' : 'Haan'}
                </button>
                <button className="karma-vote-btn no"
                  disabled={votedIds.includes(req.id) || !address}
                  onClick={() => { setVotedIds((v) => [...v, req.id]); toast.info('Vote recorded') }}>
                  Nahi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// EXIT SOUVENIR MODAL
// =====================================================================
function SouvenirModal({ address, onClose }: { address: string; onClose: () => void }) {
  const nftId = `#${parseInt(address.slice(2, 8), 16) % 9999}`
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-nft-display">
          <div className="kulhad-nft">
            <div className="kulhad-nft-steam">
              <div className="steam-line" /><div className="steam-line" /><div className="steam-line" />
            </div>
            <div className="kulhad-nft-body">
              <div className="kulhad-nft-rim" />
              <div className="kulhad-nft-pattern" />
            </div>
          </div>
          <div className="modal-nft-title">Digital Clay Kulhad NFT</div>
          <div className="modal-nft-sub">माधु चाय वाला — Souvenir</div>
          <div className="modal-nft-id">Token {nftId} · Tapri Edition 2026</div>
        </div>
        <div className="modal-body">
          <p className="modal-desc">
            आपने माधु चाय वाला tapri का दौरा किया।
            एक digital kulhad आपकी यादगार है। Aao phir kabhi chai peene! ☕
          </p>
          <div className="modal-actions">
            <button className="btn-saffron"
              onClick={() => { toast.success('Kulhad NFT minted! Deploy contract for live mint.'); onClose() }}>
              Claim Digital Kulhad 🏺
            </button>
            <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
              Tapri pe ruko — Stay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Floating activity toasts ─────────────────────────────────
function useFloatingToasts(active: boolean) {
  useEffect(() => {
    if (!active) return
    const names = ['Ramesh', 'Priya', 'Sunil', 'Kavya', 'Deepak', 'Lata', 'Gopal', 'Mohan', 'Seema']
    const items = ['कटिंग चाय', 'कुल्हड़ चाय', 'मसाला चाय', 'समोसा', 'लस्सी', 'पारले-जी', 'चंदा']
    const amts  = ['0.15', '0.25', '0.40', '0.50', '0.75', '1.00']
    const id = setInterval(() => {
      const n = names[Math.floor(Math.random() * names.length)]
      const i = items[Math.floor(Math.random() * items.length)]
      const a = amts[Math.floor(Math.random() * amts.length)]
      toast(`${n} paid $${a} for ${i}`, { icon: '🫖', duration: 3000 })
    }, 13000)
    return () => clearInterval(id)
  }, [active])
}

// =====================================================================
// MAIN APP
// =====================================================================
type Tab = 'menu' | 'faucet' | 'dairy' | 'vault' | 'karma'

const NAV_ITEMS: { id: Tab; flower: string; label: string; hindi: string }[] = [
  { id: 'menu',   flower: '🌸', label: 'Menu',   hindi: 'मेनू'   },
  { id: 'faucet', flower: '💧', label: 'Chanda', hindi: 'चंदा'   },
  { id: 'dairy',  flower: '🐄', label: 'Dairy',  hindi: 'डेयरी'  },
  { id: 'vault',  flower: '🏺', label: 'Vault',  hindi: 'गुल्लक' },
  { id: 'karma',  flower: '🌺', label: 'Karma',  hindi: 'कर्म'   },
]

export default function ChaiChainApp() {
  const [tab, setTab] = useState<Tab>('menu')
  const [showSouvenir, setShowSouvenir] = useState(false)

  const { address, isConnected, chainId } = useAccount()

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const prevConnectedRef = useRef(false)
  useEffect(() => {
    if (isConnected) {
      prevConnectedRef.current = true
    } else if (prevConnectedRef.current) {
      prevConnectedRef.current = false
      setShowSouvenir(true)
    }
    // oxlint-disable-next-line react/set-state-in-effect
  }, [isConnected])

  useFloatingToasts(isConnected)

  return (
    <div className="chai-root">

      {/* ── Marigold garland canopy ── */}
      <GarlandStrip />

      {/* ── Tarpaulin info strip ── */}
      <div className="tarpaulin-roof">
        <div className="tarpaulin-row">
          <span style={{ fontSize: 11, color: 'var(--text-lo)', fontFamily: 'var(--font-mono)' }}>
            Arc Testnet · USDC
          </span>
          <span style={{ fontSize: 11, color: 'var(--saffron)' }}>
            माटी की खुशबू ✦ अपनों का प्यार
          </span>
        </div>
      </div>

      {/* ── Wooden sign header ── */}
      <div className="chai-header">
        <div className="chai-brand">
          <div className="chai-brand-kulhad">
            <div className="brand-kulhad-steam">
              <div className="brand-steam-line" />
              <div className="brand-steam-line" />
            </div>
            <div className="brand-kulhad-body">
              <div className="brand-kulhad-rim" />
            </div>
          </div>
          <div className="chai-brand-text">
            <div className="chai-brand-name">Madhu Chai Wala</div>
            <div className="chai-brand-deva">माधु चाय वाला</div>
            <div className="chai-brand-tagline">माटी की खुशबू, अपनों का प्यार</div>
          </div>
        </div>
        <div className="connect-btn-wrap">
          <ConnectKitButton
            customTheme={{
              '--ck-font-family': "'DM Sans', sans-serif",
              '--ck-primary-button-background': '#C86D3B',
              '--ck-primary-button-hover-background': '#D4834E',
              '--ck-primary-button-border-radius': '10px',
              '--ck-body-background': '#1a0d07',
              '--ck-body-color': '#F5D78E',
              '--ck-border-radius': '14px',
              '--ck-overlay-background': 'rgba(26,13,7,0.9)',
            }}
          />
        </div>
      </div>

      {/* ── Wooden shelf décor strip ── */}
      <ShelfDecor />

      {/* ── Balance banner (connected) ── */}
      {isConnected && address && (
        <div className="balance-banner">
          <div className="balance-banner-inner">
            <span style={{ fontSize: 11, color: 'var(--text-lo)', fontFamily: 'var(--font-mono)' }}>
              {fmt(address)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {chainId !== TARGET_CHAIN_ID && (
                <span style={{ fontSize: 10, color: '#F1C40F', border: '1px solid #F1C40F44', borderRadius: 6, padding: '2px 7px' }}>
                  Wrong network
                </span>
              )}
              <span className="usdc-badge">
                <TokenUSDC variant="branded" size={12} />
                {usdcBalance !== undefined ? fmtUSDC(usdcBalance) : '—'} USDC
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab content ── */}
      <div className="chai-main">
        {!isConnected && tab === 'menu' && (
          <div className="status-banner info" style={{ marginBottom: 10 }}>
            <TokenUSDC variant="branded" size={15} />
            <span>Wallet connect करें · No USDC? Use 💧 Chanda tab</span>
          </div>
        )}

        {tab === 'menu'   && <MenuTab   address={address} balance={usdcBalance} chainId={chainId} />}
        {tab === 'faucet' && <FaucetTab address={address} chainId={chainId} />}
        {tab === 'dairy'  && <DairyTab />}
        {tab === 'vault'  && <VaultTab  address={address} chainId={chainId} />}
        {tab === 'karma'  && <KarmaTab  address={address} chainId={chainId} />}
      </div>

      {/* ── Fulwari bottom nav ── */}
      <nav className="fulwari-nav" aria-label="Tapri Navigation">
        <div className="fulwari-inner">
          <div className="fulwari-bar">
            {NAV_ITEMS.map((n) => (
              <button
                key={n.id}
                className={`fulwari-btn${tab === n.id ? ' active' : ''}`}
                onClick={() => setTab(n.id)}
                aria-label={n.label}
                aria-current={tab === n.id ? 'page' : undefined}
              >
                <span className="fulwari-flower">{n.flower}</span>
                <span className="fulwari-label">{n.hindi}</span>
                {tab === n.id && <span className="fulwari-active-dot" />}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Exit souvenir ── */}
      {showSouvenir && (
        <SouvenirModal
          address={address ?? '0x0000000000000000000000000000000000000000'}
          onClose={() => setShowSouvenir(false)}
        />
      )}
    </div>
  )
}

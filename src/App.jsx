import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PriceChart }      from './components/PriceChart.jsx'
import { OrderPanel }      from './components/OrderPanel.jsx'
import { PositionsTable }  from './components/PositionsTable.jsx'

const MARKETS = ['SOL-PERP', 'BTC-PERP', 'ETH-PERP']

export function App() {
  const { publicKey } = useWallet()
  const [market, setMarket] = useState('SOL-PERP')
  const [tab, setTab] = useState('TRADE')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState('chart') // 'chart' | 'order'

  const shortKey = publicKey
    ? publicKey.toBase58().slice(0, 4) + '…' + publicKey.toBase58().slice(-4)
    : null

  return (
    <div style={styles.root}>
      <div style={styles.gridBg} />

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.logo}>
          PrivPerps
          <span style={styles.logoBadge}>BETA</span>
        </div>

        <span style={styles.arciumTag}>⬡ ARCIUM MPC</span>

        {/* Desktop nav */}
        <nav style={styles.nav}>
          {['TRADE', 'PORTFOLIO'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...styles.navBtn, ...(tab === t ? styles.navActive : {}) }}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Desktop wallet */}
        <div style={styles.walletWrap}>
          <WalletMultiButton />
          {publicKey && <span style={styles.keyBadge}>◎ {shortKey}</span>}
        </div>

        {/* Mobile: wallet icon + hamburger */}
        <div style={styles.mobileRight}>
          <div style={styles.mobileWallet}>
            <WalletMultiButton />
          </div>
          <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            <span style={styles.hamburgerLine} />
            <span style={styles.hamburgerLine} />
            <span style={styles.hamburgerLine} />
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          {['TRADE', 'PORTFOLIO'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setMenuOpen(false) }}
              style={{ ...styles.mobileMenuItem, ...(tab === t ? styles.mobileMenuActive : {}) }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* MARKET BAR */}
      <div style={styles.marketBar}>
        {MARKETS.map(m => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            style={{ ...styles.marketBtn, ...(market === m ? styles.marketActive : {}) }}
          >
            {m}
          </button>
        ))}
        <div style={styles.encryptedBadge}>
          <span style={styles.encryptedDot} />
          POSITIONS ENCRYPTED
        </div>
      </div>

      {/* Mobile tab toggle: Chart vs Order */}
      <div style={styles.mobilePanelToggle}>
        <button
          style={{ ...styles.mobilePanelBtn, ...(mobilePanel === 'chart' ? styles.mobilePanelActive : {}) }}
          onClick={() => setMobilePanel('chart')}
        >
          Chart
        </button>
        <button
          style={{ ...styles.mobilePanelBtn, ...(mobilePanel === 'order' ? styles.mobilePanelActive : {}) }}
          onClick={() => setMobilePanel('order')}
        >
          Place Order
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.main}>
        <div style={{ ...styles.left, ...(mobilePanel === 'order' ? styles.hiddenMobile : {}) }}>
          <PriceChart market={market} />
          <PositionsTable />
        </div>
        <div style={{ ...(mobilePanel === 'chart' ? styles.hiddenMobile : {}) }}>
          <OrderPanel market={market} />
        </div>
      </div>

      <div style={styles.networkBadge}>
        ◉ DEVNET — switch to mainnet-beta in WalletProvider.jsx when ready
      </div>

      {/* Responsive styles injected */}
      <style>{`
        @media (min-width: 768px) {
          .mobile-only { display: none !important; }
          .desktop-only { display: flex !important; }
          .main-grid { grid-template-columns: 1fr 320px !important; }
          .hidden-mobile { display: flex !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
        .wallet-adapter-button {
          font-size: 12px !important;
          padding: 6px 12px !important;
          height: 34px !important;
        }
      `}</style>
    </div>
  )
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' },
  gridBg: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    backgroundImage:
      'linear-gradient(rgba(91,79,255,0.03) 1px, transparent 1px),' +
      'linear-gradient(90deg, rgba(91,79,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px'
  },
  header: {
    position: 'relative', zIndex: 10, height: 56,
    background: 'rgba(4,5,10,0.9)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)', display: 'flex',
    alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0
  },
  logo: {
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
    letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8
  },
  logoBadge: {
    background: 'var(--accent)', color: '#fff', fontSize: 9,
    fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 3, letterSpacing: 1
  },
  arciumTag: {
    fontSize: 11, color: 'var(--accent2)', letterSpacing: 2,
    border: '1px solid rgba(0,229,192,0.2)', padding: '3px 8px', borderRadius: 3,
    display: isMobile ? 'none' : 'inline'
  },
  nav: { display: isMobile ? 'none' : 'flex', gap: 2, marginLeft: 'auto' },
  navBtn: {
    background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 14px',
    cursor: 'pointer', borderRadius: 4, letterSpacing: 1, transition: 'all 0.15s'
  },
  navActive: { color: 'var(--text)', background: 'var(--surface2)' },
  walletWrap: { display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 8 },
  keyBadge: { fontSize: 11, color: 'var(--accent2)', letterSpacing: 1 },

  // Mobile specific
  mobileRight: {
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center', gap: 8, marginLeft: 'auto'
  },
  mobileWallet: { display: 'flex', alignItems: 'center' },
  hamburger: {
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4, padding: 4
  },
  hamburgerLine: {
    display: 'block', width: 20, height: 2,
    background: 'var(--text)', borderRadius: 2
  },
  mobileMenu: {
    position: 'absolute', top: 56, left: 0, right: 0,
    background: 'rgba(4,5,10,0.97)', borderBottom: '1px solid var(--border)',
    zIndex: 50, display: 'flex', flexDirection: 'column'
  },
  mobileMenuItem: {
    background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 13, padding: '14px 20px',
    cursor: 'pointer', letterSpacing: 1, textAlign: 'left',
    borderBottom: '1px solid var(--border)'
  },
  mobileMenuActive: { color: 'var(--text)', background: 'var(--surface2)' },

  marketBar: {
    position: 'relative', zIndex: 9, display: 'flex', alignItems: 'center',
    gap: 2, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    padding: '0 12px', flexShrink: 0, overflowX: 'auto'
  },
  marketBtn: {
    background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 12, padding: '12px 12px',
    cursor: 'pointer', letterSpacing: 1, borderBottom: '2px solid transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap'
  },
  marketActive: { color: 'var(--text)', borderBottomColor: 'var(--accent)' },
  encryptedBadge: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(91,79,255,0.1)', border: '1px solid rgba(91,79,255,0.3)',
    padding: '5px 10px', borderRadius: 20, fontSize: 10, color: 'var(--accent)',
    whiteSpace: 'nowrap'
  },
  encryptedDot: {
    width: 7, height: 7, background: 'var(--accent2)', borderRadius: '50%',
    display: 'inline-block', animation: 'pulse 2s infinite'
  },

  mobilePanelToggle: {
    display: isMobile ? 'flex' : 'none',
    background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    flexShrink: 0
  },
  mobilePanelBtn: {
    flex: 1, background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px',
    cursor: 'pointer', letterSpacing: 1, borderBottom: '2px solid transparent'
  },
  mobilePanelActive: { color: 'var(--text)', borderBottomColor: 'var(--accent)' },

  main: {
    display: isMobile ? 'flex' : 'grid',
    gridTemplateColumns: '1fr 320px',
    flexDirection: 'column',
    flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1
  },
  left: {
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    borderRight: isMobile ? 'none' : '1px solid var(--border)',
    flex: 1
  },
  hiddenMobile: { display: isMobile ? 'none' : undefined },

  networkBadge: {
    position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
    fontSize: 9, color: 'var(--muted)', letterSpacing: 2,
    background: 'rgba(4,5,10,0.8)', padding: '4px 12px', borderRadius: 10,
    border: '1px solid var(--border)', zIndex: 100, whiteSpace: 'nowrap'
  },
}

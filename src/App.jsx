import React, { useState, useRef, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PriceChart }     from './components/PriceChart.jsx'
import { OrderPanel }     from './components/OrderPanel.jsx'
import { PositionsTable } from './components/PositionsTable.jsx'
import { usePrivPerps }   from './hooks/usePrivPerps.js'

const MARKETS = ['SOL-PERP', 'BTC-PERP', 'ETH-PERP']

export function App() {
  const { publicKey } = useWallet()
  const [market, setMarket]           = useState('SOL-PERP')
  const [tab, setTab]                 = useState('TRADE')
  const [menuOpen, setMenuOpen]       = useState(false)
  const [dropOpen, setDropOpen]       = useState(false)
  const [mobilePanel, setMobilePanel] = useState('chart')
  const dropRef = useRef(null)
  const perps = usePrivPerps()

  const shortKey = publicKey
    ? publicKey.toBase58().slice(0, 4) + '…' + publicKey.toBase58().slice(-4)
    : null

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={styles.root}>
      <div style={styles.gridBg} />
      <style>{`
        .wallet-adapter-button { font-size: 12px !important; padding: 6px 12px !important; height: 34px !important; }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .desktop-wallet { display: none !important; }
          .mobile-right { display: flex !important; }
          .mobile-panel-toggle { display: flex !important; }
          .main-area { display: flex !important; flex-direction: column !important; }
          .arcium-tag { display: none !important; }
        }
        @media (min-width: 768px) {
          .mobile-right { display: none !important; }
          .mobile-panel-toggle { display: none !important; }
          .mobile-menu-dropdown { display: none !important; }
          .main-area { display: grid !important; grid-template-columns: 1fr 320px !important; }
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.logo}>
          PrivPerps<span style={styles.logoBadge}>BETA</span>
        </div>
        <span className="arcium-tag" style={styles.arciumTag}>⬡ ARCIUM MPC</span>

        <div ref={dropRef} style={styles.marketDropWrap}>
          <button style={styles.marketDropBtn} onClick={() => setDropOpen(!dropOpen)}>
            <span style={styles.marketDropLabel}>{market}</span>
            <span style={{ ...styles.marketDropArrow, transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {dropOpen && (
            <div style={styles.marketDropMenu}>
              {MARKETS.map(m => (
                <button key={m}
                  style={{ ...styles.marketDropItem, ...(market === m ? styles.marketDropItemActive : {}) }}
                  onClick={() => { setMarket(m); setDropOpen(false) }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                    background: market === m ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }} />
                  {m}
                  {market === m && <span style={styles.marketCheckmark}>✓</span>}
                </button>
              ))}
              <div style={styles.marketDropDivider} />
              <div style={styles.marketDropHint}>More pairs coming soon</div>
            </div>
          )}
        </div>

        <nav className="desktop-nav" style={styles.nav}>
          {['TRADE', 'PORTFOLIO'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...styles.navBtn, ...(tab === t ? styles.navActive : {}) }}>{t}</button>
          ))}
        </nav>

        <div className="desktop-wallet" style={styles.walletWrap}>
          <WalletMultiButton />
          {publicKey && <span style={styles.keyBadge}>◎ {shortKey}</span>}
        </div>

        <div className="mobile-right" style={styles.mobileRight}>
          <WalletMultiButton />
          <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            <span style={styles.hamburgerLine} />
            <span style={styles.hamburgerLine} />
            <span style={styles.hamburgerLine} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu-dropdown" style={styles.mobileMenu}>
          {['TRADE', 'PORTFOLIO'].map(t => (
            <button key={t} onClick={() => { setTab(t); setMenuOpen(false) }}
              style={{ ...styles.mobileMenuItem, ...(tab === t ? styles.mobileMenuActive : {}) }}>{t}</button>
          ))}
        </div>
      )}

      <div style={styles.marketBar}>
        <div style={styles.encryptedBadge}>
          <span style={styles.encryptedDot} />
          POSITIONS ENCRYPTED
        </div>
      </div>

      <div className="mobile-panel-toggle" style={styles.mobilePanelToggle}>
        <button onClick={() => setMobilePanel('chart')}
          style={{ ...styles.mobilePanelBtn, ...(mobilePanel === 'chart' ? styles.mobilePanelActive : {}) }}>
          Chart
        </button>
        <button onClick={() => setMobilePanel('order')}
          style={{ ...styles.mobilePanelBtn, ...(mobilePanel === 'order' ? styles.mobilePanelActive : {}) }}>
          Place Order
        </button>
      </div>

      <div className="main-area" style={styles.main}>
        <div style={{ ...styles.left, display: mobilePanel === 'order' ? 'none' : 'flex' }}>
          <PriceChart market={market} />
          <PositionsTable positions={perps.positions} closePosition={perps.closePosition} loading={perps.loading} />
        </div>
        <div style={{ display: mobilePanel === 'chart' ? 'none' : 'block', overflow: 'auto' }}>
          <OrderPanel market={market} openPosition={perps.openPosition} loading={perps.loading} txSig={perps.txSig} error={perps.error} />
        </div>
      </div>

      <div style={styles.networkBadge}>
        ◉ DEVNET — switch to mainnet-beta in WalletProvider.jsx when ready
      </div>
    </div>
  )
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' },
  gridBg: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    backgroundImage: 'linear-gradient(rgba(91,79,255,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(91,79,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px' },
  header: { position: 'relative', zIndex: 20, height: 56, background: 'rgba(4,5,10,0.9)',
    backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 },
  logo: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
    letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 },
  logoBadge: { background: 'var(--accent)', color: '#fff', fontSize: 9,
    fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 3, letterSpacing: 1 },
  arciumTag: { fontSize: 11, color: 'var(--accent2)', letterSpacing: 2,
    border: '1px solid rgba(0,229,192,0.2)', padding: '3px 8px', borderRadius: 3 },
  marketDropWrap: { position: 'relative' },
  marketDropBtn: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    background: 'rgba(91,79,255,0.15)', border: '1px solid rgba(91,79,255,0.4)',
    borderRadius: 6, padding: '6px 12px', color: '#fff' },
  marketDropLabel: { fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1 },
  marketDropArrow: { fontSize: 9, color: 'var(--accent)', transition: 'transform 0.2s' },
  marketDropMenu: { position: 'absolute', top: '110%', left: 0, minWidth: 170,
    background: 'rgba(8,9,18,0.98)', border: '1px solid rgba(91,79,255,0.3)',
    borderRadius: 8, overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  marketDropItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px 14px',
    cursor: 'pointer', letterSpacing: 1, textAlign: 'left', transition: 'all 0.1s' },
  marketDropItemActive: { color: '#fff', background: 'rgba(91,79,255,0.15)' },
  marketCheckmark: { marginLeft: 'auto', color: 'var(--accent)', fontSize: 12 },
  marketDropDivider: { height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' },
  marketDropHint: { padding: '8px 14px', fontSize: 10, color: 'rgba(255,255,255,0.3)',
    fontFamily: 'var(--font-mono)', letterSpacing: 1 },
  nav: { display: 'flex', gap: 2, marginLeft: 'auto' },
  navBtn: { background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-mono)',
    fontSize: 12, padding: '6px 14px', cursor: 'pointer', borderRadius: 4, letterSpacing: 1, transition: 'all 0.15s' },
  navActive: { color: 'var(--text)', background: 'var(--surface2)' },
  walletWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  keyBadge: { fontSize: 11, color: 'var(--accent2)', letterSpacing: 1 },
  mobileRight: { alignItems: 'center', gap: 8, marginLeft: 'auto' },
  hamburger: { background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4, padding: 4 },
  hamburgerLine: { display: 'block', width: 20, height: 2, background: 'var(--text)', borderRadius: 2 },
  mobileMenu: { position: 'absolute', top: 56, left: 0, right: 0, zIndex: 50,
    background: 'rgba(4,5,10,0.97)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column' },
  mobileMenuItem: { background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 13, padding: '14px 20px',
    cursor: 'pointer', letterSpacing: 1, textAlign: 'left', borderBottom: '1px solid var(--border)' },
  mobileMenuActive: { color: 'var(--text)', background: 'var(--surface2)' },
  marketBar: { position: 'relative', zIndex: 9, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0, height: 40 },
  encryptedBadge: { display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(91,79,255,0.1)', border: '1px solid rgba(91,79,255,0.3)',
    padding: '5px 10px', borderRadius: 20, fontSize: 10, color: 'var(--accent)', whiteSpace: 'nowrap' },
  encryptedDot: { width: 7, height: 7, background: 'var(--accent2)', borderRadius: '50%',
    display: 'inline-block', animation: 'pulse 2s infinite' },
  mobilePanelToggle: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  mobilePanelBtn: { flex: 1, background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px',
    cursor: 'pointer', letterSpacing: 1, borderBottom: '2px solid transparent' },
  mobilePanelActive: { color: 'var(--text)', borderBottomColor: 'var(--accent)' },
  main: { flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 },
  left: { flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)', flex: 1 },
  networkBadge: { position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
    fontSize: 9, color: 'var(--muted)', letterSpacing: 2, background: 'rgba(4,5,10,0.8)',
    padding: '4px 12px', borderRadius: 10, border: '1px solid var(--border)', zIndex: 100, whiteSpace: 'nowrap' },
}

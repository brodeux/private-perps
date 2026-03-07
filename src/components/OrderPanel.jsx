import React, { useState } from 'react'git add .
git commit -m "ready for deployment"
git push
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { usePrivPerps } from '../hooks/usePrivPerps.js'

export function OrderPanel({ market }) {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { openPosition, loading, txSig, error } = usePrivPerps()

  const [side, setSide] = useState('long')
  const [collateral, setCollateral] = useState('')
  const [leverage, setLeverage] = useState(10)
  const [orderType, setOrderType] = useState('MARKET')
  const [toast, setToast] = useState(null)

  const notional = collateral
    ? (parseFloat(collateral) * leverage).toFixed(2)
    : '0.00'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubmit = async () => {
    if (!publicKey) { setVisible(true); return }
    if (!collateral || parseFloat(collateral) <= 0) {
      showToast('Enter collateral amount', 'error'); return
    }
    const sig = await openPosition({
      collateralUsdc: parseFloat(collateral),
      isLong: side === 'long',
    })
    if (sig) {
      showToast('Order encrypted & submitted!')
      setCollateral('')
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.title}>Place Order</div>
        <div style={styles.subtitle}>⬡ ROUTED THROUGH ARCIUM MPC</div>
      </div>

      <div style={styles.sideRow}>
        {['long', 'short'].map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              ...styles.sideBtn,
              background: side === s
                ? s === 'long' ? 'var(--green)' : 'var(--red)'
                : s === 'long' ? 'rgba(0,229,160,0.08)' : 'rgba(255,79,123,0.08)',
              color: side === s
                ? s === 'long' ? '#000' : '#fff'
                : s === 'long' ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${s === 'long' ? 'rgba(0,229,160,0.3)' : 'rgba(255,79,123,0.3)'}`,
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Order Type</label>
        <select
          value={orderType}
          onChange={e => setOrderType(e.target.value)}
          style={styles.select}
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Collateral (USDC)</label>
        <input
          type="number"
          value={collateral}
          onChange={e => setCollateral(e.target.value)}
          placeholder="0.00"
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Leverage: {leverage}x</label>
        <input
          type="range"
          min={1}
          max={20}
          value={leverage}
          onChange={e => setLeverage(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={styles.summary}>
        <span style={styles.summaryLabel}>Notional Size</span>
        <span style={styles.summaryValue}>${notional} USDC</span>
      </div>

      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
          color: toast.type === 'error' ? '#fff' : '#000',
        }}>
          {toast.msg}
        </div>
      )}

      {txSig && (
        <div style={styles.txSig}>
          ✓ TX: {txSig.slice(0, 16)}...
        </div>
      )}

      {error && (
        <div style={{ ...styles.toast, background: 'var(--red)', color: '#fff' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          ...styles.submitBtn,
          background: side === 'long' ? 'var(--green)' : 'var(--red)',
          color: side === 'long' ? '#000' : '#fff',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Submitting...' : `${side.toUpperCase()} ${market}`}
      </button>
    </div>
  )
}

const styles = {
  panel: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 280,
  },
  header: {
    borderBottom: '1px solid var(--border)',
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
  },
  subtitle: {
    fontSize: 10,
    color: 'var(--muted)',
    marginTop: 4,
    letterSpacing: 1,
  },
  sideRow: {
    display: 'flex',
    gap: 8,
  },
  sideBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: 'var(--muted)',
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: 'var(--bg)',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'var(--muted)',
  },
  summaryValue: {
    fontSize: 12,
    color: 'var(--text)',
    fontWeight: 600,
  },
  submitBtn: {
    padding: '14px 0',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    border: 'none',
    marginTop: 4,
    transition: 'all 0.2s',
  },
  toast: {
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  txSig: {
    padding: '8px 12px',
    background: 'rgba(0,229,160,0.08)',
    border: '1px solid rgba(0,229,160,0.2)',
    borderRadius: 8,
    fontSize: 11,
    color: 'var(--green)',
    fontFamily: 'monospace',
  },
}

import React, { useState } from 'react'

export function PositionsTable({ positions = [], closePosition, loading }) {
  const [closing, setClosing] = useState(null)

  const openPositions = positions.filter(p => p.status === 'open')

  const handleClose = async (id) => {
    setClosing(id)
    await closePosition(id)
    setClosing(null)
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>OPEN POSITIONS</span>
        <span style={s.count}>{openPositions.length}</span>
      </div>

      {openPositions.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>⬡</div>
          <div style={s.emptyText}>No open positions</div>
          <div style={s.emptyHint}>Positions are encrypted end-to-end via Arcium MPC</div>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['ID', 'SIDE', 'COLLATERAL', 'SIZE', 'PnL', 'STATUS', ''].map(col => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openPositions.map(pos => (
                <tr key={pos.id} style={s.tr}>
                  <td style={s.td}>
                    <span style={s.idBadge}>{pos.id}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      ...s.sideBadge,
                      background: pos.market === 'LONG' ? 'rgba(0,229,160,0.12)' : 'rgba(255,79,123,0.12)',
                      color: pos.market === 'LONG' ? 'var(--green)' : 'var(--red)',
                      border: `1px solid ${pos.market === 'LONG' ? 'rgba(0,229,160,0.3)' : 'rgba(255,79,123,0.3)'}`,
                    }}>
                      {pos.market}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.value}>${pos.collateral.toFixed(2)}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.encrypted}>⬡ ENCRYPTED</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.encrypted}>⬡ ENCRYPTED</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.openBadge}>● OPEN</span>
                  </td>
                  <td style={s.td}>
                    <button
                      style={s.closeBtn}
                      onClick={() => handleClose(pos.id)}
                      disabled={closing === pos.id || loading}
                    >
                      {closing === pos.id ? '...' : 'Close'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={s.footer}>
        <span style={s.privacyNote}>
          <span style={s.footerDot} />
          Position size, entry &amp; liquidation price encrypted via Arcium MPC
        </span>
      </div>
    </div>
  )
}

const s = {
  wrap: {
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    maxHeight: 240,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 2,
    color: 'var(--muted)',
  },
  count: {
    background: 'rgba(91,79,255,0.2)',
    color: 'var(--accent)',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    padding: '1px 7px',
    borderRadius: 10,
    border: '1px solid rgba(91,79,255,0.3)',
  },
  tableWrap: {
    overflow: 'auto',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'var(--muted)',
    padding: '6px 16px',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    background: 'var(--surface)',
    position: 'sticky',
    top: 0,
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  td: {
    padding: '8px 16px',
    verticalAlign: 'middle',
  },
  idBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  sideBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 700,
    letterSpacing: 1,
  },
  value: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text)',
  },
  encrypted: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--accent)',
    letterSpacing: 1,
    opacity: 0.7,
  },
  openBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--accent2)',
    letterSpacing: 1,
  },
  closeBtn: {
    background: 'rgba(255,79,123,0.1)',
    border: '1px solid rgba(255,79,123,0.3)',
    color: 'var(--red)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    letterSpacing: 0.5,
    transition: 'all 0.15s',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    gap: 6,
  },
  emptyIcon: {
    fontSize: 22,
    color: 'rgba(91,79,255,0.4)',
  },
  emptyText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--muted)',
    letterSpacing: 1,
  },
  emptyHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footer: {
    padding: '6px 16px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  privacyNote: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: 0.5,
  },
  footerDot: {
    width: 6,
    height: 6,
    background: 'var(--accent2)',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
    animation: 'pulse 2s infinite',
  },
}

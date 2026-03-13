import { useEffect, useRef, useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────

const SYMBOL = {
  'SOL-PERP': 'SOLUSDT',
  'BTC-PERP': 'BTCUSDT',
  'ETH-PERP': 'ETHUSDT',
}

const GECKO = {
  'SOL-PERP': 'solana',
  'BTC-PERP': 'bitcoin',
  'ETH-PERP': 'ethereum',
}

// label → [binance interval, candle limit]
const TF_MAP = {
  '5m':  ['5m',  100],
  '1h':  ['1h',  100],
  '12h': ['12h',  60],
  '1d':  ['1d',   60],
  '1w':  ['1w',   52],
  '1m':  ['1d',   30],   // 1 month  ≈ 30 daily candles
  '6m':  ['3d',   60],   // 6 months ≈ 60 three-day candles
  '1y':  ['1w',   52],   // 1 year   ≈ 52 weekly candles
}

const TF_LABELS = ['5m', '1h', '12h', '1d', '1w', '1m', '6m', '1y']

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—'
  const num = Number(n)
  return num >= 1000
    ? '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$' + num.toFixed(2)
}

// ── Component ──────────────────────────────────────────────────────────────

export function PriceChart({ market }) {
  const canvasRef = useRef(null)
  const dataRef   = useRef([])          // closing prices
  const wsRef     = useRef(null)
  const animRef   = useRef(null)
  const tfRef     = useRef('1d')        // kept in sync for ws closure

  const [timeframe, setTimeframe] = useState('1d')
  const [livePrice, setLivePrice] = useState(null)
  const [change24h, setChange24h] = useState(null)
  const [connected, setConnected] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [stats]                   = useState({ vol: '$842.3M', oi: '$213.7M', funding: '+0.0012%' })

  const sym = SYMBOL[market] || 'SOLUSDT'

  // ── 1. Fetch klines (REST) ─────────────────────────────────────────────
  useEffect(() => {
    const [interval, limit] = TF_MAP[timeframe] || TF_MAP['1d']
    dataRef.current = []
    setLoading(true)

    fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          dataRef.current = rows.map(r => parseFloat(r[4]))  // index 4 = close
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [market, timeframe])

  // ── 2. CoinGecko 24 h change ──────────────────────────────────────────
  useEffect(() => {
    setLivePrice(null)
    setChange24h(null)

    const gecko = GECKO[market] || 'solana'
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${gecko}&vs_currencies=usd&include_24hr_change=true`
    )
      .then(r => r.json())
      .then(d => {
        const price = d[gecko]?.usd
        const chg   = d[gecko]?.usd_24h_change?.toFixed(2)
        if (price) { setLivePrice(price); setChange24h(chg) }
      })
      .catch(() => {})
  }, [market])

  // ── 3. Binance WebSocket — live ticks ─────────────────────────────────
  useEffect(() => { tfRef.current = timeframe }, [timeframe])

  useEffect(() => {
    setConnected(false)
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = e => {
      try {
        const price = parseFloat(JSON.parse(e.data).p)
        if (!price) return
        setLivePrice(price)
        // Only shift the chart on short timeframes — longer ones stay stable
        if (tfRef.current === '5m' || tfRef.current === '1h') {
          const d = dataRef.current
          if (d.length > 0) dataRef.current = [...d.slice(1), price]
        }
      } catch (_) {}
    }

    return () => { ws.close(); wsRef.current = null; setConnected(false) }
  }, [market])

  // ── 4. Canvas draw loop ───────────────────────────────────────────────
  useEffect(() => {
    const draw = () => {
      animRef.current = requestAnimationFrame(draw)

      const canvas = canvasRef.current
      if (!canvas) return
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (!W || !H) return

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W
        canvas.height = H
      }

      const ctx  = canvas.getContext('2d')
      const data = dataRef.current

      ctx.clearRect(0, 0, W, H)

      if (!data || data.length < 2) {
        // Loading placeholder
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.font      = '11px "Space Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Loading chart…', W / 2, H / 2)
        return
      }

      // ── Y-axis scale: real min/max + 2% padding ──
      const lo    = Math.min(...data)
      const hi    = Math.max(...data)
      const range = (hi - lo) || hi * 0.01 || 1
      const pad   = range * 0.02          // 2% padding each side
      const yMin  = lo - pad
      const yMax  = hi + pad
      const toY   = v => H * (1 - (v - yMin) / (yMax - yMin))

      const xStep = W / (data.length - 1)

      // ── Dashed grid + Y labels ──
      ctx.font        = '10px "Space Mono", monospace'
      ctx.textAlign   = 'right'
      ctx.setLineDash([3, 5])
      ctx.lineWidth   = 1
      for (let i = 0; i <= 4; i++) {
        const y   = (H / 4) * i
        const val = yMax - ((yMax - yMin) / 4) * i
        ctx.strokeStyle = 'rgba(30,34,64,0.9)'
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fillText(fmt(val), W - 8, y > 14 ? y - 4 : 14)
      }
      ctx.setLineDash([])

      // ── Area fill ──
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0,    'rgba(91,79,255,0.30)')
      grad.addColorStop(0.65, 'rgba(91,79,255,0.05)')
      grad.addColorStop(1,    'rgba(91,79,255,0.00)')
      ctx.beginPath()
      data.forEach((v, i) => i === 0 ? ctx.moveTo(0, toY(v)) : ctx.lineTo(i * xStep, toY(v)))
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // ── Price line ──
      ctx.beginPath()
      ctx.strokeStyle = '#5b4fff'
      ctx.lineWidth   = 2
      ctx.lineJoin    = 'round'
      ctx.lineCap     = 'round'
      data.forEach((v, i) => i === 0 ? ctx.moveTo(0, toY(v)) : ctx.lineTo(i * xStep, toY(v)))
      ctx.stroke()

      // ── Last-price dot ──
      const lx = (data.length - 1) * xStep
      const ly = toY(data[data.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#5b4fff'; ctx.fill()
      ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(91,79,255,0.25)'; ctx.fill()
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const isUp = parseFloat(change24h) >= 0

  return (
    <div style={s.wrap}>

      {/* Stats header */}
      <div style={s.header}>
        <div style={s.pairRow}>
          <span style={s.pair}>{market}</span>
          <span style={s.livePrice}>{fmt(livePrice)}</span>
          {change24h != null && (
            <span style={{
              ...s.chip,
              background: isUp ? 'rgba(0,229,192,0.1)' : 'rgba(255,80,80,0.1)',
              color:      isUp ? 'var(--accent2)'      : '#ff5050',
            }}>
              {isUp ? '+' : ''}{change24h}%
            </span>
          )}
          <span style={{
            ...s.chip,
            background: connected ? 'rgba(0,229,192,0.1)' : 'rgba(255,200,0,0.1)',
            color:      connected ? 'var(--accent2)'      : '#ffc800',
            marginLeft: 'auto',
          }}>
            {connected ? '⬤ LIVE' : '◯ CONNECTING'}
          </span>
        </div>

        <div style={s.stats}>
          {[['24H VOL', stats.vol], ['OPEN INT', stats.oi], ['FUNDING', stats.funding], ['INDEX', fmt(livePrice)]].map(([l, v]) => (
            <div key={l} style={s.stat}>
              <span style={s.statLabel}>{l}</span>
              <span style={s.statVal}>{v}</span>
            </div>
          ))}
          <div style={s.privacyPill}>
            <span style={s.privacyDot} />
            MPC ACTIVE
          </div>
        </div>
      </div>

      {/* Timeframe bar — sits between stats and canvas */}
      <div style={s.tfBar}>
        {TF_LABELS.map(label => (
          <button
            key={label}
            onClick={() => setTimeframe(label)}
            style={label === timeframe ? { ...s.tfBtn, ...s.tfBtnActive } : s.tfBtn}
          >
            {label}
          </button>
        ))}
        {loading && <span style={s.loadDot}>●</span>}
      </div>

      {/* Canvas wrapper — fills all remaining height */}
      <div style={s.canvasWrap}>
        <canvas ref={canvasRef} style={s.canvas} />
      </div>

    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = {
  wrap: {
    display: 'flex', flexDirection: 'column',
    flex: 1, minHeight: 0, overflow: 'hidden',
  },

  // ── Header ──
  header: {
    padding: '12px 20px 10px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  pairRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  pair:    { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 },
  livePrice: { fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 },
  chip:    { fontSize: 11, padding: '3px 8px', borderRadius: 3 },
  stats:   { display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' },
  stat:    { display: 'flex', flexDirection: 'column', gap: 2 },
  statLabel: { fontSize: 9, color: 'var(--muted)', letterSpacing: '1.5px' },
  statVal:   { fontSize: 12 },
  privacyPill: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(91,79,255,0.1)', border: '1px solid rgba(91,79,255,0.3)',
    padding: '5px 12px', borderRadius: 20, fontSize: 11, color: 'var(--accent)', flexShrink: 0,
  },
  privacyDot: {
    width: 7, height: 7, background: 'var(--accent2)', borderRadius: '50%',
    display: 'inline-block', animation: 'pulse 2s infinite',
  },

  // ── Timeframe bar ──
  tfBar: {
    display: 'flex', alignItems: 'center', gap: 2,
    padding: '4px 12px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  tfBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 1,
    padding: '4px 9px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'color 0.15s, background 0.15s',
    lineHeight: 1.4,
  },
  tfBtnActive: {
    color: '#e8eaf6',
    background: 'rgba(91,79,255,0.2)',
    border: '1px solid rgba(91,79,255,0.45)',
  },
  loadDot: {
    marginLeft: 6, fontSize: 7,
    color: 'var(--accent)', animation: 'pulse 0.7s infinite',
  },

  // ── Canvas ──
  canvasWrap: {
    flex: 1, minHeight: 0,
    position: 'relative', overflow: 'hidden',
  },
  canvas: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    display: 'block',
  },
}

export default PriceChart

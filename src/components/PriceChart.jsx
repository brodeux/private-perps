import { useEffect, useRef, useState } from 'react'

const COIN_MAP = {
  'SOL-PERP': { ws: 'solusdt', binance: 'SOLUSDT', gecko: 'solana' },
  'BTC-PERP': { ws: 'btcusdt', binance: 'BTCUSDT', gecko: 'bitcoin' },
  'ETH-PERP': { ws: 'ethusdt', binance: 'ETHUSDT', gecko: 'ethereum' },
}

const TIMEFRAMES = [
  { label: '5m',  interval: '5m',  limit: 100 },
  { label: '1hr', interval: '1h',  limit: 100 },
  { label: '12hr', interval: '12h', limit: 60  },
  { label: '1d',  interval: '1d',  limit: 60  },
  { label: '1w',  interval: '1w',  limit: 52  },
  { label: '1m',  interval: '1d',  limit: 30  },
  { label: '6m',  interval: '3d',  limit: 60  },
  { label: '1y',  interval: '1w',  limit: 52  },
]

function fmtPrice(n) {
  if (n == null) return '—'
  return n >= 1000
    ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$' + n.toFixed(2)
}

export function PriceChart({ market }) {
  const canvasRef = useRef(null)
  const dataRef   = useRef([])   // array of closing prices
  const wsRef     = useRef(null)
  const animRef   = useRef(null)
  const tfRef     = useRef('1d') // mirrors timeframe state for use inside ws closure

  const [timeframe, setTimeframe] = useState('1d')
  const [livePrice, setLivePrice] = useState(null)
  const [change24h, setChange24h] = useState(null)
  const [connected, setConnected] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [stats, setStats]         = useState({ vol: '$842.3M', oi: '$213.7M', funding: '+0.0012%' })

  const coin = COIN_MAP[market] || COIN_MAP['SOL-PERP']

  // ── Fetch klines from Binance REST ────────────────────────────────────────
  useEffect(() => {
    const tf = TIMEFRAMES.find(t => t.label === timeframe) || TIMEFRAMES[3]
    dataRef.current = []
    setLoading(true)

    fetch(`https://api.binance.com/api/v3/klines?symbol=${coin.binance}&interval=${tf.interval}&limit=${tf.limit}`)
      .then(r => r.json())
      .then(rows => {
        if (Array.isArray(rows)) {
          dataRef.current = rows.map(r => parseFloat(r[4])) // close price
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [market, timeframe])

  // ── CoinGecko 24h stats ───────────────────────────────────────────────────
  useEffect(() => {
    setLivePrice(null)
    setChange24h(null)

    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.gecko}&vs_currencies=usd&include_24hr_change=true`)
      .then(r => r.json())
      .then(data => {
        const price = data[coin.gecko]?.usd
        const chg   = data[coin.gecko]?.usd_24h_change?.toFixed(2)
        if (price) { setLivePrice(price); setChange24h(chg) }
      })
      .catch(() => {})
  }, [market])

  // ── Binance WebSocket live ticks ──────────────────────────────────────────
  useEffect(() => {
    tfRef.current = timeframe
  }, [timeframe])

  useEffect(() => {
    setConnected(false)
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${coin.ws}@trade`)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const price = parseFloat(JSON.parse(e.data).p)
        if (!price) return
        setLivePrice(price)
        // Append tick to chart only on the two shortest timeframes
        if (tfRef.current === '5m' || tfRef.current === '1hr') {
          const d = dataRef.current
          if (d.length > 0) dataRef.current = [...d.slice(1), price]
        }
      } catch (_) {}
    }

    return () => { ws.close(); wsRef.current = null; setConnected(false) }
  }, [market])

  // ── Canvas draw loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const draw = () => {
      animRef.current = requestAnimationFrame(draw)

      const canvas = canvasRef.current
      if (!canvas) return

      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (W === 0 || H === 0) return

      // Only resize backing buffer when dimensions change (avoids clearing mid-frame)
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W
        canvas.height = H
      }

      const ctx  = canvas.getContext('2d')
      const data = dataRef.current

      ctx.clearRect(0, 0, W, H)

      if (!data || data.length < 2) return

      // Y scale with 6% padding on each side
      const raw_min = Math.min(...data)
      const raw_max = Math.max(...data)
      const range   = raw_max - raw_min || raw_max * 0.01 || 1
      const pad     = range * 0.06
      const yMin    = raw_min - pad
      const yMax    = raw_max + pad
      const toY     = v => H - ((v - yMin) / (yMax - yMin)) * H

      // ── Horizontal grid lines + Y-axis labels ──
      const gridCount = 5
      ctx.font      = '10px "Space Mono", monospace'
      ctx.textAlign = 'right'
      for (let i = 0; i <= gridCount; i++) {
        const y   = (H / gridCount) * i
        const val = yMax - ((yMax - yMin) / gridCount) * i

        ctx.strokeStyle = 'rgba(30,34,64,0.8)'
        ctx.lineWidth   = 1
        ctx.setLineDash([3, 4])
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.fillText(fmtPrice(val), W - 6, y > 12 ? y - 4 : 12)
      }

      const xStep = W / (data.length - 1)

      // ── Area fill ──
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0,   'rgba(91,79,255,0.28)')
      grad.addColorStop(0.65,'rgba(91,79,255,0.05)')
      grad.addColorStop(1,   'rgba(91,79,255,0)')
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
      ctx.beginPath(); ctx.arc(lx, ly, 4,  0, Math.PI * 2); ctx.fillStyle = '#5b4fff';            ctx.fill()
      ctx.beginPath(); ctx.arc(lx, ly, 8,  0, Math.PI * 2); ctx.fillStyle = 'rgba(91,79,255,0.25)'; ctx.fill()
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const isUp = parseFloat(change24h) >= 0

  return (
    <div style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.pairRow}>
          <span style={s.pair}>{market}</span>
          <span style={s.livePrice}>{fmtPrice(livePrice)}</span>
          {change24h != null && (
            <span style={{ ...s.chip,
              background: isUp ? 'rgba(0,229,192,0.1)' : 'rgba(255,80,80,0.1)',
              color:      isUp ? 'var(--accent2)'      : '#ff5050' }}>
              {isUp ? '+' : ''}{change24h}%
            </span>
          )}
          <span style={{ ...s.chip,
            background: connected ? 'rgba(0,229,192,0.1)' : 'rgba(255,200,0,0.1)',
            color:      connected ? 'var(--accent2)'      : '#ffc800',
            marginLeft: 'auto' }}>
            {connected ? '⬤ LIVE' : '◯ CONNECTING'}
          </span>
        </div>

        <div style={s.statsRow}>
          {[['24H VOL', stats.vol], ['OPEN INT', stats.oi], ['FUNDING', stats.funding], ['INDEX', fmtPrice(livePrice)]].map(([l, v]) => (
            <div key={l} style={s.stat}>
              <span style={s.statLabel}>{l}</span>
              <span style={s.statVal}>{v}</span>
            </div>
          ))}
          <div style={s.mpcPill}>
            <span style={s.mpcDot} />
            MPC ACTIVE
          </div>
        </div>
      </div>

      {/* ── Timeframe bar ── */}
      <div style={s.tfBar}>
        {TIMEFRAMES.map(t => (
          <button
            key={t.label}
            style={timeframe === t.label ? { ...s.tfBtn, ...s.tfActive } : s.tfBtn}
            onClick={() => setTimeframe(t.label)}
          >
            {t.label}
          </button>
        ))}
        {loading && <span style={s.spinner}>●</span>}
      </div>

      {/* ── Canvas ── */}
      <div style={s.canvasWrap}>
        <canvas ref={canvasRef} style={s.canvas} />
      </div>

    </div>
  )
}

const s = {
  wrap: {
    display: 'flex', flexDirection: 'column',
    flex: 1, minHeight: 0, overflow: 'hidden',
  },
  header: {
    padding: '12px 20px 10px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  pairRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  pair: {
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
  },
  livePrice: {
    fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
  },
  chip: {
    fontSize: 11, padding: '3px 8px', borderRadius: 3,
  },
  statsRow: {
    display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
  },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statLabel: { fontSize: 9, color: 'var(--muted)', letterSpacing: '1.5px' },
  statVal:   { fontSize: 12 },
  mpcPill: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(91,79,255,0.1)', border: '1px solid rgba(91,79,255,0.3)',
    padding: '5px 12px', borderRadius: 20, fontSize: 11, color: 'var(--accent)',
    flexShrink: 0,
  },
  mpcDot: {
    width: 7, height: 7, background: 'var(--accent2)', borderRadius: '50%',
    display: 'inline-block', animation: 'pulse 2s infinite',
  },

  // Timeframe bar
  tfBar: {
    display: 'flex', alignItems: 'center', gap: 2,
    padding: '5px 14px',
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
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'color 0.15s, background 0.15s',
  },
  tfActive: {
    color: '#fff',
    background: 'rgba(91,79,255,0.22)',
    border: '1px solid rgba(91,79,255,0.45)',
  },
  spinner: {
    marginLeft: 8, fontSize: 8,
    color: 'var(--accent)', animation: 'pulse 0.8s infinite',
  },

  // Canvas wrapper fills remaining space
  canvasWrap: {
    flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
  },
  canvas: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    display: 'block',
  },
}

export default PriceChart

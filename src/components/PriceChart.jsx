import { useEffect, useRef, useState, useCallback } from 'react'

const COIN_MAP = {
  'SOL-PERP': { ws: 'solusdt', binance: 'SOLUSDT', gecko: 'solana', label: 'SOL' },
  'BTC-PERP': { ws: 'btcusdt', binance: 'BTCUSDT', gecko: 'bitcoin', label: 'BTC' },
  'ETH-PERP': { ws: 'ethusdt', binance: 'ETHUSDT', gecko: 'ethereum', label: 'ETH' },
}

const TIMEFRAMES = [
  { label: '5m',  interval: '5m',  limit: 80 },
  { label: '1hr', interval: '1h',  limit: 80 },
  { label: '12hr',interval: '12h', limit: 60 },
  { label: '1d',  interval: '1d',  limit: 60 },
  { label: '1w',  interval: '1w',  limit: 52 },
  { label: '1m',  interval: '1d',  limit: 30 },
  { label: '6m',  interval: '3d',  limit: 60 },
  { label: '1y',  interval: '1w',  limit: 52 },
]

export function PriceChart({ market }) {
  const canvasRef = useRef(null)
  const dataRef   = useRef(null)
  const wsRef     = useRef(null)
  const animRef   = useRef(null)

  const [livePrice, setLivePrice] = useState(null)
  const [change24h, setChange24h] = useState(null)
  const [stats, setStats]         = useState({ vol: '$842.3M', oi: '$213.7M', funding: '+0.0012%' })
  const [connected, setConnected] = useState(false)
  const [timeframe, setTimeframe] = useState('1d')
  const [loading, setLoading]     = useState(false)

  const coin = COIN_MAP[market] || COIN_MAP['SOL-PERP']
  const tf   = TIMEFRAMES.find(t => t.label === timeframe) || TIMEFRAMES[3]

  // Fetch kline data from Binance REST API
  const fetchKlines = useCallback(async (symbol, interval, limit) => {
    setLoading(true)
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      )
      const rows = await res.json()
      if (Array.isArray(rows) && rows.length > 0) {
        dataRef.current = rows.map(r => parseFloat(r[4])) // closing prices
      }
    } catch (e) {}
    setLoading(false)
  }, [])

  // Re-fetch klines on market or timeframe change
  useEffect(() => {
    dataRef.current = null
    fetchKlines(coin.binance, tf.interval, tf.limit)
  }, [market, timeframe])

  // Fetch 24h stats from CoinGecko once on market change
  useEffect(() => {
    setLivePrice(null)
    setChange24h(null)
    setConnected(false)

    const fetchStats = async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coin.gecko}&vs_currencies=usd&include_24hr_change=true`
        )
        const data = await res.json()
        const price = data[coin.gecko]?.usd
        const chg   = data[coin.gecko]?.usd_24h_change?.toFixed(2)
        if (price) { setLivePrice(price); setChange24h(chg) }
      } catch (e) {}
    }
    fetchStats()
  }, [market])

  // Binance WebSocket for live price badge + real-time chart updates on short timeframes
  useEffect(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${coin.ws}@trade`)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      try {
        const msg   = JSON.parse(e.data)
        const price = parseFloat(msg.p)
        if (!price) return
        setLivePrice(price)
        // Only push ticks to chart on short timeframes
        if ((timeframe === '5m' || timeframe === '1hr') && dataRef.current) {
          dataRef.current = [...dataRef.current.slice(1), price]
        }
      } catch (err) {}
    }

    return () => { ws.close(); wsRef.current = null; setConnected(false) }
  }, [market, timeframe])

  // Canvas draw loop
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H

      const data = dataRef.current
      if (!data || data.length < 2) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, W, H)

      const min    = Math.min(...data)
      const max    = Math.max(...data)
      const range  = max - min || 1
      const pad    = range * 0.08
      const xStep  = W / (data.length - 1)
      const toY    = v => H - ((v - (min - pad)) / (range + pad * 2)) * H * 0.88 - H * 0.04

      // Grid lines
      ctx.strokeStyle = 'rgba(30,34,64,0.6)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = (H / 4) * i
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Price labels on grid
      ctx.fillStyle   = 'rgba(255,255,255,0.18)'
      ctx.font        = '10px monospace'
      ctx.textAlign   = 'left'
      for (let i = 0; i <= 4; i++) {
        const val = max + pad - ((range + pad * 2) / 4) * i
        const y   = (H / 4) * i + 12
        const label = val >= 1000
          ? '$' + val.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : '$' + val.toFixed(2)
        ctx.fillText(label, 6, y)
      }

      // Fill gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, 'rgba(91,79,255,0.25)')
      grad.addColorStop(0.6, 'rgba(91,79,255,0.05)')
      grad.addColorStop(1, 'rgba(91,79,255,0)')
      ctx.beginPath()
      data.forEach((v, i) => {
        if (i === 0) ctx.moveTo(0, toY(v))
        else ctx.lineTo(i * xStep, toY(v))
      })
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Line
      ctx.beginPath()
      ctx.strokeStyle = '#5b4fff'
      ctx.lineWidth   = 2
      ctx.lineJoin    = 'round'
      data.forEach((v, i) => {
        if (i === 0) ctx.moveTo(0, toY(v))
        else ctx.lineTo(i * xStep, toY(v))
      })
      ctx.stroke()

      // Last price dot
      const lastX = (data.length - 1) * xStep
      const lastY = toY(data[data.length - 1])
      ctx.beginPath(); ctx.arc(lastX, lastY, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#5b4fff'; ctx.fill()
      ctx.beginPath(); ctx.arc(lastX, lastY, 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(91,79,255,0.3)'; ctx.fill()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const isUp = parseFloat(change24h) >= 0
  const fmt  = (n) => n == null ? '—' : Number(n) >= 1000
    ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '$' + Number(n).toFixed(2)

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.pairRow}>
          <span style={s.pair}>{market}</span>
          <span style={s.livePrice}>{fmt(livePrice)}</span>
          {change24h != null && (
            <span style={{ ...s.chip, background: isUp ? 'rgba(0,229,192,0.1)' : 'rgba(255,80,80,0.1)',
              color: isUp ? 'var(--accent2)' : '#ff5050' }}>
              {isUp ? '+' : ''}{change24h}%
            </span>
          )}
          <span style={{ ...s.chip, background: connected ? 'rgba(0,229,192,0.1)' : 'rgba(255,200,0,0.1)',
            color: connected ? 'var(--accent2)' : '#ffc800', marginLeft: 4 }}>
            {connected ? '⬤ LIVE' : '◯ CONNECTING'}
          </span>
        </div>
        <div style={s.statsRow}>
          <div style={s.stats}>
            {[['24H VOL', stats.vol], ['OPEN INT', stats.oi], ['FUNDING', stats.funding],
              ['INDEX', fmt(livePrice)]].map(([label, val]) => (
              <div style={s.stat} key={label}>
                <span style={s.statLabel}>{label}</span>
                <span style={s.statVal}>{val}</span>
              </div>
            ))}
          </div>
          <div style={s.privacyPill}>
            <span style={{ width: 7, height: 7, background: 'var(--accent2)', borderRadius: '50%',
              display: 'inline-block', animation: 'pulse 2s infinite' }} />
            MPC ACTIVE
          </div>
        </div>
      </div>

      <div style={s.tfBar}>
        {TIMEFRAMES.map(t => (
          <button key={t.label}
            style={{ ...s.tfBtn, ...(timeframe === t.label ? s.tfActive : {}) }}
            onClick={() => setTimeframe(t.label)}>
            {t.label}
          </button>
        ))}
        {loading && <span style={s.loadingDot}>●</span>}
      </div>

      <canvas ref={canvasRef} style={s.canvas} />
    </div>
  )
}

const s = {
  wrap:        { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 },
  header:      { padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  pairRow:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  pair:        { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 },
  livePrice:   { fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 },
  chip:        { fontSize: 11, padding: '3px 8px', borderRadius: 3 },
  statsRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  stats:       { display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' },
  stat:        { display: 'flex', flexDirection: 'column', gap: 2 },
  statLabel:   { fontSize: 9, color: 'var(--muted)', letterSpacing: '1.5px' },
  statVal:     { fontSize: 12 },
  privacyPill: { display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(91,79,255,0.1)', border: '1px solid rgba(91,79,255,0.3)',
    padding: '5px 12px', borderRadius: 20, fontSize: 11, color: 'var(--accent)', flexShrink: 0 },
  tfBar:       { display: 'flex', alignItems: 'center', gap: 2, padding: '6px 16px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  tfBtn:       { background: 'none', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px',
    cursor: 'pointer', borderRadius: 4, letterSpacing: 1, transition: 'all 0.15s' },
  tfActive:    { color: 'var(--text)', background: 'rgba(91,79,255,0.2)',
    border: '1px solid rgba(91,79,255,0.4)' },
  loadingDot:  { marginLeft: 6, fontSize: 8, color: 'var(--accent)', animation: 'pulse 1s infinite' },
  canvas:      { flex: 1, width: '100%', display: 'block', minHeight: 0 },
}

export default PriceChart

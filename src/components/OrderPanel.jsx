import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { usePrivPerps } from '../hooks/usePrivPerps.js'

export function OrderPanel({ market }) {
  const { publicKey }          = useWallet()
    const { setVisible }         = useWalletModal()
      const { openPosition, loading, txSig, error } = usePrivPerps()

        const [side,       setSide]       = useState('long')
          const [collateral, setCollateral] = useState('')
            const [leverage,   setLeverage]   = useState(10)
              const [orderType,  setOrderType]  = useState('MARKET')
                const [toast,      setToast]      = useState(null)

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
                                                                                                                                                                                                                                                                                                                          border: `1px solid ${s === 'long'
                                                                                                                                                                                                                                                                                                                                          ? 'rgba(0,229,160,0.3)'
                                                                                                                                                                                                                                                                                                                                                          : 'rgba(255,79,123,0.3)'}`,
                                                                                                                                                                                                                                                                                                                                                                      }}
                                                                                                                                                                                                                                                                                                                                                                                >
                                                                                                                                                                                                                                                                                                                                                                                            {s.toUpperCase()}
                                                                                                                                                                                                                                                                                                                                                                                                      </button>
                                                                                                                                                                                                                                                                                                                                                                                                              ))}
                                                                                                                                                                                                                                                                                                                                                                                                                    </div
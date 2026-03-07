import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

export function usePrivPerps() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()

  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState(null)
  const [error, setError] = useState(null)
  const [positions, setPositions] = useState([])

  const openPosition = async ({ collateralUsdc, isLong }) => {
    if (!publicKey) return null
    setLoading(true)
    setError(null)
    setTxSig(null)

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        })
      )

      const sig = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      setTxSig(sig)

      setPositions(prev => [...prev, {
        id: sig.slice(0, 8),
        market: isLong ? 'LONG' : 'SHORT',
        collateral: collateralUsdc,
        timestamp: Date.now(),
        status: 'open',
      }])

      return sig
    } catch (err) {
      setError(err.message || 'Transaction failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  const closePosition = async (positionId) => {
    if (!publicKey) return null
    setLoading(true)
    setError(null)

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        })
      )

      const sig = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      setPositions(prev =>
        prev.map(p => p.id === positionId ? { ...p, status: 'closed' } : p)
      )

      return sig
    } catch (err) {
      setError(err.message || 'Failed to close position')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    openPosition,
    closePosition,
    loading,
    txSig,
    error,
    positions,
  }
}

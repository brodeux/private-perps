import React, { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { clusterApiUrl } from '@solana/web3.js'

// Change 'devnet' to 'mainnet-beta' when going live
const NETWORK = 'devnet'

export function WalletProviderWrapper({ children }) {
  const endpoint = useMemo(() => clusterApiUrl(NETWORK), [])
    const wallets  = useMemo(() => [new PhantomWalletAdapter()], [])

      return (
          <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                        <WalletModalProvider>
                                  {children}
                                          </WalletModalProvider>
                                                </WalletProvider>
                                                    </ConnectionProvider>
                                                      )
                                                      }
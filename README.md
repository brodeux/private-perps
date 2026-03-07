PrivPerps — Private Perpetuals × Arcium
A privacy-preserving perpetual futures DEX on Solana.
Position size, entry price & liquidation thresholds are encrypted via Arcium MPC.
Only realized PnL is ever revealed on-chain.
Quick Start (GitHub Codespaces)
1. Install deps
npm install
2. Run the frontend
npm run dev
Open the Codespaces port preview → your app is live.
3. Build for production
npm run build
Deploy to Vercel
npm install -g vercel
vercel login
vercel deploy --prod
Smart Contract Setup
Install tools (run once in Codespaces)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-keygen new --no-bip39-passphrase
solana config set --url devnet
solana airdrop 2
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
Deploy the program
cd programs/private-perps
anchor build
anchor deploy
# Copy the Program ID it prints!
Update Program ID
Open src/hooks/usePrivPerps.js
Replace '11111111111111111111111111111111' with your real Program ID
Arcium Integration (final step)
Go to docs.arcium.com and create an account
Install their SDK: npm install @arcium-hq/arcium-sdk
In usePrivPerps.js, replace the placeholder encryptedSize/Entry/LiqPrice
with real Arcium SDK encryption calls:
import { ArciumClient } from '@arcium-hq/arcium-sdk'

const arcium = new ArciumClient({ apiKey: process.env.ARCIUM_API_KEY })

const { encryptedSize, encryptedEntry, encryptedLiqPrice, commitment } =
  await arcium.encrypt({
      size:     positionSize,
          entry:    entryPrice,
              liqPrice: liquidationPrice,
                })
                Join their Discord at discord.gg/arcium — they help bounty builders directly.
                File Structure
                private-perps/
                ├── src/
                │   ├── App.jsx                    ← Main app layout
                │   ├── main.jsx                   ← Entry point
                │   ├── index.css                  ← Global styles
                │   ├── components/
                │   │   ├── WalletProvider.jsx     ← Phantom wallet setup
                │   │   ├── PriceChart.jsx         ← Live price chart
                │   │   ├── OrderPanel.jsx         ← Order form + submit
                │   │   └── PositionsTable.jsx     ← Open positions
                │   └── hooks/
                │       └── usePrivPerps.js        ← Solana program calls
                ├── programs/
                │   └── private-perps/
                │       └── src/lib.rs             ← Anchor smart contract
                ├── index.html
                ├── vite.config.js
                └── package.json
                Switch to Mainnet
                In src/components/WalletProvider.jsx:
                // Change this:
                const NETWORK = 'devnet'
                // To:
                const NETWORK = 'mainnet-beta'
                Built for the Arcium RTG Bounty — rtg.arcium.com
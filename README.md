# Wallet Positions

Read-only Ethereum viewer: ETH, USDC, USDT, DAI balances and an Aave V3 position (collateral, debt, health factor).
React + TypeScript + wagmi + viem. Nothing is signed or sent.

- `npm run dev`: public RPC, paste any address or connect a wallet.
- `npm run build:wallet`: single-file build where all reads go through the wallet's own RPC.

Live demo: https://godynodi.github.io/Wallet-Positions/

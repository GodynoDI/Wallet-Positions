import { erc20Abi, parseAbi } from "viem";

export const TOKENS = [
  { symbol: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
  { symbol: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
  { symbol: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18 },
] as const;

export const ERC20_ABI = erc20Abi;

// Addresses are lowercase on purpose: viem rejects mixed-case strings with a wrong checksum.
// Aave V3 Pool, Ethereum mainnet
export const AAVE_POOL = "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2" as const;
export const AAVE_ABI = parseAbi([
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

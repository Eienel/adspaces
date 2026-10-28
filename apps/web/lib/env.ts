/** Server-side config for the web app. Never import secrets the browser shouldn't see into client components. */
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 1000);

export const publicConfig = {
  cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  usdcMint: process.env.NEXT_PUBLIC_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  escrowWallet: process.env.NEXT_PUBLIC_ESCROW_WALLET ?? "",
};

/** Server-side config for the web app. Never import secrets the browser shouldn't see into client components. */
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 1000);

/** $0 dev mode (ADR-0013): fake X login + simulated banner/payment buttons. Refuses production unless explicitly allowed. */
export const DEV_MODE =
  process.env.DEV_LOGIN === "1" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "1");

export const TOKEN_ENC_KEY = process.env.TOKEN_ENC_KEY || null;

export const publicConfig = {
  cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  usdcMint: process.env.NEXT_PUBLIC_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  escrowWallet: process.env.NEXT_PUBLIC_ESCROW_WALLET ?? "",
};

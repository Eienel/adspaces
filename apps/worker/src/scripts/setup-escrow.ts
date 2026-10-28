/**
 * One-time setup: prints the escrow wallet address and creates its USDC token account if missing.
 * Usage: pnpm --filter @adspaces/worker setup-escrow   (generates a new keypair if ESCROW_WALLET_SECRET is empty)
 */
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const secret = process.env.ESCROW_WALLET_SECRET;
if (!secret) {
  const kp = Keypair.generate();
  console.log("No ESCROW_WALLET_SECRET set. Generated a new escrow keypair:");
  console.log(`  ESCROW_WALLET_SECRET=${bs58.encode(kp.secretKey)}`);
  console.log(`  NEXT_PUBLIC_ESCROW_WALLET=${kp.publicKey.toBase58()}`);
  console.log("Put both in .env, fund the address with a little SOL (devnet: `solana airdrop 1 <addr> -u devnet`), and rerun.");
  process.exit(0);
}

const kp = Keypair.fromSecretKey(bs58.decode(secret));
const connection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const mint = new PublicKey(process.env.USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const ata = await getOrCreateAssociatedTokenAccount(connection, kp, mint, kp.publicKey);
console.log(`Escrow wallet: ${kp.publicKey.toBase58()}`);
console.log(`Escrow USDC account: ${ata.address.toBase58()} (balance ${ata.amount} micro-USDC)`);

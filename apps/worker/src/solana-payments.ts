/** Custodial escrow via Solana Pay (ADR-0003). Uses only the SPL Token + Memo programs; nothing to deploy. */
import type { FoundPayment, PaymentsProvider, PreparedTx, SettlementKind, TxStatus } from "@adspaces/shared";
import { splitPayment, USDC_DECIMALS } from "@adspaces/shared";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import bs58 from "bs58";

export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function memoInstruction(text: string): TransactionInstruction {
  return new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(text, "utf8") });
}

/** Net USDC change per owner in a parsed tx (from pre/post token balances). */
export function usdcDeltas(tx: ParsedTransactionWithMeta, mint: string): Map<string, number> {
  const deltas = new Map<string, number>();
  const add = (owner: string | undefined, amount: string, sign: 1 | -1) => {
    if (!owner) return;
    deltas.set(owner, (deltas.get(owner) ?? 0) + sign * Number(amount));
  };
  for (const b of tx.meta?.preTokenBalances ?? []) if (b.mint === mint) add(b.owner, b.uiTokenAmount.amount, -1);
  for (const b of tx.meta?.postTokenBalances ?? []) if (b.mint === mint) add(b.owner, b.uiTokenAmount.amount, 1);
  return deltas;
}

export class CustodialSolanaPayProvider implements PaymentsProvider {
  private escrow: Keypair;
  private mint: PublicKey;
  private treasury: PublicKey;

  constructor(
    private connection: Connection,
    opts: { escrowSecret: string; usdcMint: string; treasuryWallet: string },
  ) {
    this.escrow = Keypair.fromSecretKey(bs58.decode(opts.escrowSecret));
    this.mint = new PublicKey(opts.usdcMint);
    this.treasury = new PublicKey(opts.treasuryWallet);
  }

  get escrowAddress(): string {
    return this.escrow.publicKey.toBase58();
  }

  /** Current USDC held by the escrow wallet (micro-USDC). */
  async escrowBalanceMicro(): Promise<number> {
    const ata = getAssociatedTokenAddressSync(this.mint, this.escrow.publicKey);
    try {
      const { value } = await this.connection.getTokenAccountBalance(ata, "confirmed");
      return Number(value.amount);
    } catch {
      return 0; // token account not created yet
    }
  }

  async findPayment({ reference, amountMicro }: { reference: string; amountMicro: number }): Promise<FoundPayment | null> {
    const sigs = await this.connection.getSignaturesForAddress(new PublicKey(reference), { limit: 20 }, "finalized");
    // Oldest first: the first valid payment wins.
    for (const s of [...sigs].reverse()) {
      if (s.err) continue;
      const tx = await this.connection.getParsedTransaction(s.signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx || tx.meta?.err) continue;
      const deltas = usdcDeltas(tx, this.mint.toBase58());
      const received = deltas.get(this.escrowAddress) ?? 0;
      if (received < amountMicro) continue;
      const payer = [...deltas.entries()].find(([owner, d]) => owner !== this.escrowAddress && d < 0)?.[0];
      if (!payer) continue;
      return { signature: s.signature, payer, amountMicro: received };
    }
    return null;
  }

  async prepareSettlement(args: {
    kind: SettlementKind;
    bookingId: string;
    recipient: string;
    amountMicro: number;
    feeBps: number;
  }): Promise<PreparedTx> {
    const payer = this.escrow.publicKey;
    const source = getAssociatedTokenAddressSync(this.mint, payer);
    const ixs: TransactionInstruction[] = [];

    const pay = (owner: PublicKey, amount: number) => {
      if (amount <= 0) return;
      const ata = getAssociatedTokenAddressSync(this.mint, owner, true);
      ixs.push(createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, this.mint));
      ixs.push(createTransferCheckedInstruction(source, this.mint, ata, payer, BigInt(amount), USDC_DECIMALS));
    };

    if (args.kind === "release") {
      const { fee, payout } = splitPayment(args.amountMicro, args.feeBps);
      pay(new PublicKey(args.recipient), payout);
      pay(this.treasury, fee);
    } else {
      pay(new PublicKey(args.recipient), args.amountMicro);
    }
    ixs.push(memoInstruction(`adspaces:${args.kind}:${args.bookingId}`));

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([this.escrow]);
    return { signature: bs58.encode(tx.signatures[0]!), serialized: tx.serialize(), lastValidBlockHeight };
  }

  async send(tx: PreparedTx): Promise<void> {
    try {
      await this.connection.sendRawTransaction(tx.serialized, { maxRetries: 5 });
    } catch (err) {
      if (/already been processed/i.test(String(err))) return;
      throw err;
    }
  }

  async txStatus(signature: string, lastValidBlockHeight: number): Promise<TxStatus> {
    const { value } = await this.connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    const st = value[0];
    if (st?.err) return "failed";
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return "confirmed";
    const height = await this.connection.getBlockHeight("confirmed");
    return height > lastValidBlockHeight ? "expired" : "pending";
  }
}

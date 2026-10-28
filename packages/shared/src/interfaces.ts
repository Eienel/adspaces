/** Swap points between implementations. See docs/02-architecture.md. */

/** Where we read a seller's current banner URL from (ADR-0005). */
export interface BannerSource {
  /** Returns xUserId → banner URL (null if no banner). Ids missing from the map = lookup failed/unavailable. */
  getBanners(xUserIds: string[]): Promise<Map<string, string | null>>;
}

export interface FoundPayment {
  signature: string;
  /** Wallet that paid (refunds go back here). */
  payer: string;
  amountMicro: number;
}

export type SettlementKind = "release" | "refund";

/** A signed but not yet confirmed settlement tx. The signature is known before sending (idempotency). */
export interface PreparedTx {
  signature: string;
  serialized: Uint8Array;
  lastValidBlockHeight: number;
}

export type TxStatus = "confirmed" | "pending" | "expired" | "failed";

/**
 * Escrow payments (ADR-0003 custodial now, ADR-0006 on-chain later).
 * Settlement protocol: prepare → persist signature → send → poll txStatus. Never re-prepare while "pending".
 */
export interface PaymentsProvider {
  /** Look up a confirmed payment for a booking's reference key. null = not paid yet. */
  findPayment(args: { reference: string; amountMicro: number }): Promise<FoundPayment | null>;
  /** release: seller gets amount − fee, treasury gets fee. refund: payer gets amount. */
  prepareSettlement(args: {
    kind: SettlementKind;
    bookingId: string;
    recipient: string;
    amountMicro: number;
    feeBps: number;
  }): Promise<PreparedTx>;
  send(tx: PreparedTx): Promise<void>;
  txStatus(signature: string, lastValidBlockHeight: number): Promise<TxStatus>;
}

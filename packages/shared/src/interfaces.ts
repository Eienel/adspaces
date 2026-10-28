/** Swap points between implementations. See docs/02-architecture.md. */

/** Where we read a seller's current banner URL from (ADR-0005). */
export interface BannerSource {
  /** Returns xUserId → banner URL (null if no banner / user unavailable). Missing keys = lookup failed. */
  getBanners(xUserIds: string[]): Promise<Map<string, string | null>>;
}

export interface FoundPayment {
  signature: string;
  /** Wallet that paid (refunds go back here). */
  payer: string;
  amountMicro: number;
}

/** Escrow payments (ADR-0003 custodial now, ADR-0006 on-chain later). */
export interface PaymentsProvider {
  /** Look up a confirmed payment for a booking's reference key. null = not paid yet. Throws if paid incorrectly. */
  findPayment(args: { reference: string; amountMicro: number }): Promise<FoundPayment | null>;
  /** Pay the seller (amount − fee) and the treasury (fee). Returns the tx signature. */
  release(args: { bookingId: string; sellerWallet: string; amountMicro: number; feeBps: number }): Promise<string>;
  /** Return the full amount to the payer. Returns the tx signature. */
  refund(args: { bookingId: string; payerWallet: string; amountMicro: number }): Promise<string>;
}

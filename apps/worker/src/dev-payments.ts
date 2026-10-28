/**
 * $0 dev payments (ADR-0013): no chain. Funding happens through the web app's dev "Simulate payment" button;
 * settlements "confirm" instantly with fake signatures. Never use in production (PAYMENTS_PROVIDER=solana there).
 */
import type { PaymentsProvider, PreparedTx } from "@adspaces/shared";
import { randomUUID } from "node:crypto";

export class DevPaymentsProvider implements PaymentsProvider {
  async findPayment() {
    return null;
  }
  async prepareSettlement(args: { kind: string; bookingId: string }): Promise<PreparedTx> {
    return { signature: `dev-${args.kind}-${randomUUID()}`, serialized: new Uint8Array(), lastValidBlockHeight: 0 };
  }
  async send() {}
  async txStatus() {
    return "confirmed" as const;
  }
}

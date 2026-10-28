import type { Metadata } from "next";
import { FeeTable } from "@/components/fee-table";
import { publicConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Terms — AdSpaces" };

/** Beta terms in plain language. Not legal advice; review with a lawyer before scaling (docs/07-security-legal.md). */
export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold">Terms of use (beta)</h1>
      <p className="muted">Last updated 28 October 2026. AdSpaces is in beta: features and these terms may change.</p>

      <Section title="What AdSpaces does">
        AdSpaces lets X (Twitter) creators rent out parts of their profile banner (&quot;slots&quot;) to businesses for a set number of weeks,
        paid in USDC on Solana. AdSpaces is not affiliated with or endorsed by X Corp.
      </Section>

      <Section title="How payment works">
        When a booking is accepted, the business pays the full amount into an escrow wallet operated by AdSpaces. We hold it until the booking
        week(s) end. Then we either pay the creator (minus the platform fee) or refund the business, depending on whether the ad was shown.
        During the beta, each booking is capped at ${publicConfig.maxBookingUsdc.toLocaleString("en-US")}. Blockchain transactions are final once sent;
        double-check wallet addresses.
      </Section>

      <Section title="Fees">
        <p>Listing and browsing are free. When a booking pays out, AdSpaces keeps a fee based on the booking size:</p>
        <div className="mt-3">
          <FeeTable />
        </div>
        <p className="mt-3">Network fees on Solana are paid by AdSpaces for payouts and refunds. The fee shown when you book is the fee you pay.</p>
      </Section>

      <Section title="Weeks, deadlines and refunds">
        <ul className="list-disc space-y-1 pl-5">
          <li>Bookings run Monday 00:00 to Monday 00:00 UTC. Payment is due by Saturday 12:00 UTC before the first week; unpaid bookings are cancelled.</li>
          <li>Creators must set the banner we generate within 24 hours of the week starting, and keep it up for the whole booking.</li>
          <li>We check each slot at random times. If the ad was visible in at least 90% of checks, the creator is paid. Below 50%, the business is refunded in full. In between, we review the case manually.</li>
          <li>Checks that fail because of X or our systems don&apos;t count against the creator.</li>
          <li>Payments that arrive after a booking was cancelled are refunded.</li>
        </ul>
      </Section>

      <Section title="Creators">
        You must own the X account you list. Changing your banner does not affect a verified checkmark under X&apos;s current rules (only profile
        photo, display name and handle changes do), but X can change its rules at any time. You are responsible for following X&apos;s rules on paid
        partnerships and your local advertising laws, including disclosing paid promotions.
      </Section>

      <Section title="Businesses">
        You must have the rights to the images you upload. Ads must not be illegal, deceptive, hateful, sexual, or impersonate others. Creators
        can refuse categories, and we may remove ads or cancel bookings that break these rules (with a refund if the ad hasn&apos;t run).
      </Section>

      <Section title="No guarantees">
        View counts shown on AdSpaces are estimates from public X data, not guaranteed impressions. The service is provided &quot;as is&quot; during the
        beta. To the extent the law allows, our liability for any booking is limited to the amount paid for that booking.
      </Section>

      <Section title="Contact">Questions or disputes: reach the AdSpaces team on X.</Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="muted">{children}</div>
    </section>
  );
}

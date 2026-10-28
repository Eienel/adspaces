import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — AdSpaces" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold">Privacy (beta)</h1>
      <p className="muted">Last updated 28 October 2026.</p>
      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>From X, when you sign in: your public profile (id, handle, name, avatar, banner, follower count, verified status) and public metrics of your recent posts, used to estimate your profile&apos;s value. We never post or change anything on your account.</li>
          <li>An X login token, stored encrypted, so we can check your banner during bookings.</li>
          <li>Your Solana wallet address, if you link one or sign in with it.</li>
          <li>Images you upload (ads, banner art) and your bookings, payments and verification checks.</li>
        </ul>
      </Section>
      <Section title="What's public">
        Your listing (banner preview, handle, follower count, prices) and ads posted on the ad board are public. Blockchain payments are public by
        nature.
      </Section>
      <Section title="What we don't do">
        We don&apos;t sell your data and we don&apos;t use third-party ad trackers. We don&apos;t ask for your email.
      </Section>
      <Section title="Deleting your data">
        Ask us on X and we&apos;ll delete your account data, except records we must keep for payments and disputes. You can revoke AdSpaces&apos; access
        any time in X settings under Connected apps.
      </Section>
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

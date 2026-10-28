import type { BookingStatus } from "@adspaces/shared";

const COLORS: Record<BookingStatus, string> = {
  requested: "bg-[var(--peach)]/30 text-amber-900",
  accepted: "bg-sky-500/15 text-sky-800",
  funded: "bg-[var(--lavender)] text-violet-900",
  live: "bg-[var(--lime)] text-[var(--dark)]",
  completed: "bg-[var(--mint)]/30 text-emerald-900",
  refunded: "bg-[var(--sand)] text-[var(--text)]",
  disputed: "bg-[var(--bad)]/12 text-[var(--bad)]",
  declined: "bg-[var(--sand)] text-[var(--muted)]",
  cancelled: "bg-[var(--sand)] text-[var(--muted)]",
};

const LABEL: Partial<Record<BookingStatus, string>> = { funded: "paid", accepted: "awaiting payment" };

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${COLORS[status]}`}>{LABEL[status] ?? status}</span>;
}

import type { BookingStatus } from "@adspaces/shared";

const COLORS: Record<BookingStatus, string> = {
  requested: "bg-amber-500/15 text-amber-300",
  accepted: "bg-sky-500/15 text-sky-300",
  funded: "bg-indigo-500/15 text-indigo-300",
  live: "bg-emerald-500/15 text-emerald-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  refunded: "bg-zinc-500/15 text-zinc-300",
  disputed: "bg-red-500/15 text-red-300",
  declined: "bg-zinc-500/15 text-zinc-400",
  cancelled: "bg-zinc-500/15 text-zinc-400",
};

const LABEL: Partial<Record<BookingStatus, string>> = { funded: "paid", accepted: "awaiting payment" };

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLORS[status]}`}>{LABEL[status] ?? status}</span>;
}

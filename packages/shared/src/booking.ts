/** Booking state machine. All status changes must go through `transition`. See docs/03-data-model.md. */
export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "funded",
  "live",
  "completed",
  "refunded",
  "disputed",
  "declined",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingEvent =
  | "accept"
  | "decline"
  | "cancel"
  | "fund"
  | "go_live"
  | "expire"
  | "complete"
  | "fail"
  | "dispute"
  | "resolve_release"
  | "resolve_refund";

const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingEvent, BookingStatus>>> = {
  requested: { accept: "accepted", decline: "declined", cancel: "cancelled" },
  accepted: { fund: "funded", cancel: "cancelled" },
  funded: { go_live: "live", expire: "refunded" },
  live: { complete: "completed", fail: "refunded", dispute: "disputed" },
  disputed: { resolve_release: "completed", resolve_refund: "refunded" },
  completed: {},
  refunded: {},
  declined: {},
  cancelled: {},
};

export const TERMINAL_STATUSES: readonly BookingStatus[] = ["completed", "refunded", "declined", "cancelled"];

export function canTransition(from: BookingStatus, event: BookingEvent): boolean {
  return TRANSITIONS[from][event] !== undefined;
}

export function transition(from: BookingStatus, event: BookingEvent): BookingStatus {
  const to = TRANSITIONS[from][event];
  if (!to) throw new Error(`Invalid booking transition: ${from} --${event}-->`);
  return to;
}

/** How long a seller has to put the banner up after funding before the advertiser is refunded. */
export const GO_LIVE_GRACE_MS = 24 * 60 * 60 * 1000;

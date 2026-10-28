import { describe, expect, it } from "vitest";
import { BOOKING_STATUSES, TERMINAL_STATUSES, canTransition, transition } from "../src/booking";
import { decideSettlement } from "../src/settlement";

describe("booking state machine", () => {
  it("follows the happy path", () => {
    let s = transition("requested", "accept");
    s = transition(s, "fund");
    s = transition(s, "go_live");
    expect(transition(s, "complete")).toBe("completed");
  });
  it("rejects invalid transitions", () => {
    expect(() => transition("requested", "fund")).toThrow();
    expect(canTransition("funded", "cancel")).toBe(false); // funded bookings can only be refunded via expire
    expect(canTransition("disputed", "resolve_refund")).toBe(true);
  });
  it("terminal states have no exits", () => {
    for (const s of TERMINAL_STATUSES) {
      for (const e of ["accept", "fund", "complete", "cancel"] as const) expect(canTransition(s, e)).toBe(false);
    }
    expect(BOOKING_STATUSES).toContain("disputed");
  });
});

describe("settlement", () => {
  const ok = { pass: true };
  const bad = { pass: false };
  const err = { pass: false, error: "x api down" };
  it("releases on high uptime and ignores errors", () => {
    expect(decideSettlement([ok, ok, ok, ok, ok, ok, ok, ok, ok, ok, err])).toBe("release");
  });
  it("refunds on low uptime", () => {
    expect(decideSettlement([bad, bad, ok])).toBe("refund");
  });
  it("disputes in between or with no data", () => {
    expect(decideSettlement([ok, ok, bad])).toBe("dispute");
    expect(decideSettlement([err])).toBe("dispute");
  });
});

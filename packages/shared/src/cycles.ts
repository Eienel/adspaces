/** Weekly booking cycles (ADR-0010). All segments of a banner change together, Monday 00:00 UTC. */
export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
/** Bookings must be funded by Saturday 12:00 UTC to join the next week's banner. */
export const CUTOFF_BEFORE_MS = 36 * 60 * 60 * 1000;
/** After a cycle starts the creator has this long to put the banner up before advertisers are refunded. */
export const CYCLE_GRACE_MS = DAY_MS;

/** Monday 00:00 UTC on or before `d`. */
export function cycleStart(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS);
}

export function isCycleStart(d: Date): boolean {
  return cycleStart(d).getTime() === d.getTime();
}

export function cycleCutoff(start: Date): Date {
  return new Date(start.getTime() - CUTOFF_BEFORE_MS);
}

export function cycleEnd(start: Date, weeks: number): Date {
  return new Date(start.getTime() + weeks * WEEK_MS);
}

/** True while bookings for this cycle can still be made/accepted/funded. */
export function isBookable(start: Date, now: Date): boolean {
  return isCycleStart(start) && now < cycleCutoff(start);
}

/** The next `n` cycle starts that are still bookable. */
export function upcomingCycles(now: Date, n: number): Date[] {
  const out: Date[] = [];
  let c = cycleStart(now);
  while (out.length < n) {
    if (isBookable(c, now)) out.push(c);
    c = new Date(c.getTime() + WEEK_MS);
  }
  return out;
}

/** Do two week ranges [start, start+weeks) overlap? */
export function rangesOverlap(aStart: Date, aWeeks: number, bStart: Date, bWeeks: number): boolean {
  return aStart < cycleEnd(bStart, bWeeks) && bStart < cycleEnd(aStart, aWeeks);
}

/** Does a booking starting at `start` for `weeks` run during cycle `c`? */
export function coversCycle(start: Date, weeks: number, c: Date): boolean {
  return start <= c && c < cycleEnd(start, weeks);
}

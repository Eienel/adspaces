/** Profile valuation → max price per day. See docs/08-profile-valuation.md and ADR-0007. */
import { MICRO_PER_USDC } from "./money";

export interface ProfileSignals {
  followers: number;
  /** Mean impression_count of recent posts (0 if unknown). */
  avgImpressions: number;
  /** (likes+reposts+replies+quotes)/impressions over recent posts, 0..1. */
  engagementRate: number;
  verified: boolean;
  /** Admin-approved value from an analytics screenshot; overrides the estimate when set. */
  reportedProfileVisitsPerDay?: number | null;
}

export const VALUATION_DEFAULTS = {
  visitsPerFollower: 0.002,
  visitsPerAvgImpression: 0.01,
  verifiedMultiplier: 1.1,
  /** Engagement rate considered "typical"; multiplier is 1.0 here. */
  baselineEngagement: 0.02,
  minEngagementMultiplier: 0.75,
  maxEngagementMultiplier: 1.5,
  /** Max cost per 1000 estimated profile views, in USDC. */
  maxCpmUsdc: 25,
  minPricePerDayUsdc: 1,
};

export function engagementMultiplier(rate: number, cfg = VALUATION_DEFAULTS): number {
  if (!Number.isFinite(rate) || rate <= 0) return cfg.minEngagementMultiplier;
  const m = rate / cfg.baselineEngagement;
  return Math.min(cfg.maxEngagementMultiplier, Math.max(cfg.minEngagementMultiplier, m));
}

export function estimateDailyProfileViews(s: ProfileSignals, cfg = VALUATION_DEFAULTS): number {
  if (s.reportedProfileVisitsPerDay != null && s.reportedProfileVisitsPerDay >= 0) {
    return Math.round(s.reportedProfileVisitsPerDay);
  }
  const base = Math.max(s.followers * cfg.visitsPerFollower, s.avgImpressions * cfg.visitsPerAvgImpression);
  const views = base * (s.verified ? cfg.verifiedMultiplier : 1) * engagementMultiplier(s.engagementRate, cfg);
  return Math.round(views);
}

/** Max listing price per day in micro-USDC, rounded down to whole cents. */
export function maxPricePerDayMicro(s: ProfileSignals, cfg = VALUATION_DEFAULTS): number {
  const views = estimateDailyProfileViews(s, cfg);
  const usdc = Math.max(cfg.minPricePerDayUsdc, (views / 1000) * cfg.maxCpmUsdc);
  const cents = Math.floor(usdc * 100);
  return cents * (MICRO_PER_USDC / 100);
}

/** Estimated CPM (USDC per 1000 views) for a given price — shown to advertisers. */
export function estimatedCpmUsdc(pricePerDayMicro: number, dailyViews: number): number | null {
  if (dailyViews <= 0) return null;
  return (pricePerDayMicro / MICRO_PER_USDC / dailyViews) * 1000;
}

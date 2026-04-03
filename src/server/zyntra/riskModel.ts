import { ZyntraBaseline, ZyntraInputFeatures } from "./types";
import { zScore } from "./baseline";

// Feature weights — must sum to 1.0
const WEIGHTS = {
  glucoseVariability: 0.30,
  timeInRangeTrend: 0.25,
  sleep: 0.20,
  hrv: 0.15,
  activity: 0.10,
};

/**
 * Normalises a value from a source range to [0, 100].
 * If invert is true, higher input = higher risk (e.g., glucose variability).
 */
function normalise(
  value: number,
  min: number,
  max: number,
  invert = false
): number {
  const clamped = Math.max(min, Math.min(max, value));
  const raw = (clamped - min) / (max - min); // 0-1
  const normalised = invert ? 1 - raw : raw;
  return normalised * 100;
}

export interface RiskBreakdown {
  glucoseVariabilityScore: number;
  timeInRangeTrendScore: number;
  sleepScore: number;
  hrvScore: number;
  activityScore: number;
  riskScore: number; // 0–100, higher = more risk
}

/**
 * Computes the composite risk score (0–100) from all feature inputs.
 *
 * Each sub-score is computed on a 0–100 scale where 100 = highest risk.
 */
export function computeRiskScore(
  features: ZyntraInputFeatures,
  baseline: ZyntraBaseline
): RiskBreakdown {
  // Glucose Variability: CV > 36% is very high risk; invert so high CV = high risk score
  const gvZ = zScore(
    features.glucoseVariability,
    baseline.glucoseVariabilityMean,
    baseline.glucoseVariabilityStd
  );
  // Map z-score from [-3,3] → deviation score [0,100] where +3 = 100 risk
  const glucoseVariabilityScore = normalise(gvZ + 3, 0, 6, false);

  // Time in Range Trend: negative trend is bad; invert so falling TIR = high risk
  const tirTrendScore = normalise(features.timeInRangeTrend + 20, 0, 40, true);

  // Sleep: 0 = no sleep (worst), 100 = perfect
  const sleepScore = normalise(features.sleepScore, 0, 100, true);

  // HRV: low HRV is bad; invert so low HRV = high risk
  const hrvScore = normalise(features.hrv, 10, 100, true);

  // Activity: sedentary is bad; invert so low activity = high risk
  const activityScore = normalise(features.activityMinutes, 0, 90, true);

  const riskScore =
    glucoseVariabilityScore * WEIGHTS.glucoseVariability +
    tirTrendScore * WEIGHTS.timeInRangeTrend +
    sleepScore * WEIGHTS.sleep +
    hrvScore * WEIGHTS.hrv +
    activityScore * WEIGHTS.activity;

  return {
    glucoseVariabilityScore: Math.round(glucoseVariabilityScore),
    timeInRangeTrendScore: Math.round(tirTrendScore),
    sleepScore: Math.round(sleepScore),
    hrvScore: Math.round(hrvScore),
    activityScore: Math.round(activityScore),
    riskScore: Math.round(Math.max(0, Math.min(100, riskScore))),
  };
}

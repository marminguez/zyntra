/**
 * Zyntra Risk Engine
 *
 * Computes a composite metabolic risk score from z-scores of key signals,
 * weighted and adjusted by prediction horizon.
 */

export interface ZScores {
    glucose?: number;
    sleep?: number;
    hrv?: number;
    activity?: number;
    adherence?: number;
}

export interface RiskResult {
    score: number;    // 0..1
    level: "low" | "medium" | "high";
    explanation: string;
}

/** Weights per domain (must sum to 1). */
const WEIGHTS: Record<keyof ZScores, number> = {
    glucose: 0.35,
    sleep: 0.2,
    hrv: 0.2,
    activity: 0.15,
    adherence: 0.10,
};

/** Horizon decay factors. */
const HORIZON_FACTOR: Record<number, number> = {
    24: 1.0,
    48: 0.93,
    72: 0.88,
};

/**
 * Convert a z-score into a risk contribution [0..1].
 *
 * - For glucose: a positive z (above mean) increases risk.
 * - For sleep, hrv, activity: a negative z (below mean) increases risk.
 * - Adherence: negative z increases risk (lower adherence → higher risk).
 */
function zToContribution(domain: keyof ZScores, z: number): number {
    let raw: number;
    if (domain === "glucose") {
        // Higher glucose → higher risk
        raw = z;
    } else {
        // Lower sleep/hrv/activity/adherence → higher risk
        raw = -z;
    }
    // Sigmoid-like clamp into [0,1]
    return Math.max(0, Math.min(1, 0.5 + raw * 0.15));
}

/**
 * Computes composite metabolic risk for a given horizon.
 *
 * @param zScores  z-scores per domain (optional keys if data unavailable)
 * @param horizonHrs  24, 48, or 72
 */
export function computeRisk(zScores: ZScores, horizonHrs: number): RiskResult {
    const hFactor = HORIZON_FACTOR[horizonHrs] ?? 1.0;

    let totalWeight = 0;
    let weightedSum = 0;
    const drivers: string[] = [];

    for (const [domain, weight] of Object.entries(WEIGHTS)) {
        const z = zScores[domain as keyof ZScores];
        if (z === undefined) continue;

        const contribution = zToContribution(domain as keyof ZScores, z);
        weightedSum += contribution * weight;
        totalWeight += weight;

        if (contribution > 0.55) {
            drivers.push(`${domain}(z=${z.toFixed(2)})`);
        }
    }

    // Normalise by available weight
    const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const score = Math.max(0, Math.min(1, rawScore * hFactor));

    let level: "low" | "medium" | "high";
    if (score < 0.33) level = "low";
    else if (score < 0.66) level = "medium";
    else level = "high";

    const explanation =
        drivers.length > 0
            ? `Risk driven by: ${drivers.join(", ")} (horizon ${horizonHrs}h)`
            : `Low overall risk across available signals (horizon ${horizonHrs}h)`;

    return { score, level, explanation };
}

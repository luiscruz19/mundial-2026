/**
 * HEAD-TO-HEAD entre dos selecciones (13.4).
 *
 * El historial entre A y B, con su CONFIABILIDAD: pesa más cuanto más reciente y
 * numeroso; con pocos cruces, su influencia baja. Devuelve una diferencia de goles
 * media (a favor del local A) ya ponderada por confianza, lista para sumarse a `gd`.
 *
 * @param {Array} matches partidos del cruce, cada uno orientado:
 *        [{ date, goals_for, goals_against }] (gf/ga desde la óptica de A)
 * @param {object} opts { halflifeDays, maxInfluence }
 * @returns {{ matches, avg_goal_diff, weight, h2h_goal_diff }}
 *   h2h_goal_diff = avg_goal_diff * weight  (lo que entra al modelo)
 */
export function computeHeadToHead(matches, opts = {}) {
    const halflife = opts.halflifeDays ?? 1825; // ~5 años
    const maxInfluence = opts.maxInfluence ?? 0.35; // tope del aporte en goles
    const now = opts.now ? new Date(opts.now) : new Date();

    const rows = (matches || []).filter(m => m && m.date);
    if (rows.length === 0) {
        return { matches: 0, avg_goal_diff: 0, weight: 0, h2h_goal_diff: 0 };
    }

    let sumW = 0, sumDiff = 0;
    for (const m of rows) {
        const daysAgo = Math.max(0, (now - new Date(m.date)) / (1000 * 3600 * 24));
        const decay = Math.exp(-daysAgo / halflife);
        const diff = Number(m.goals_for || 0) - Number(m.goals_against || 0);
        sumW += decay;
        sumDiff += decay * diff;
    }

    const avgDiff = sumW > 0 ? sumDiff / sumW : 0;

    // Confiabilidad: crece con la cantidad de cruces (satura ~6 partidos).
    const sampleConfidence = 1 - Math.exp(-rows.length / 4);
    const weight = Math.min(1, sampleConfidence);

    // Aporte acotado para que el h2h no domine al ranking/forma.
    const h2hGoalDiff = clamp(avgDiff * weight, -maxInfluence, maxInfluence);

    return {
        matches: rows.length,
        avg_goal_diff: round3(avgDiff),
        weight: round3(weight),
        h2h_goal_diff: round3(h2hGoalDiff),
    };
}

const round3 = (x) => Math.round(x * 1000) / 1000;
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

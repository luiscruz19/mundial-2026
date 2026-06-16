import CONFIG from '../../config/config.js';

/**
 * Paso 1 del modelo (13.4): de las features de A y B a las tasas de Poisson (λ).
 *
 * Combina dos señales con un peso configurable (rankingWeight):
 *   1) ANCLA DE RANKING: la diferencia de puntos FIFA, escalada por `k`, da una
 *      diferencia de goles esperada de fondo.
 *   2) FORMA RECIENTE: ataque/defensa derivados de los últimos partidos (con
 *      decaimiento temporal, calculados en el ETL) dan tasas y diferencia "del momento".
 *
 * Sobre eso se suman los ajustes de la segunda ingeniería de datos (disponibilidad
 * del plantel, descanso, etc.), la ventaja de anfitrión y el head-to-head.
 *
 * @param {object} home  features del local  { fifa_points, form:{attack,defense}, is_host }
 * @param {object} away  features del visitante
 * @param {object} opts  { params, adjustments }
 *   params: { k, rankingWeight, totalGoals, homeAdvantage, minLambda }
 *   adjustments: { homeDelta, awayDelta, h2hGoalDiff, neutralVenue }
 * @returns {{ lambdaHome:number, lambdaAway:number, detail:object }}
 */
export function computeLambdas(home, away, opts = {}) {
    const S = CONFIG.SIMULATION;
    const params = {
        k: S.K,
        kElo: S.K_ELO,
        rankingWeight: S.RANKING_WEIGHT,
        totalGoals: S.TOTAL_GOALS,
        homeAdvantage: S.HOME_ADVANTAGE,
        minLambda: S.MIN_LAMBDA,
        ...(opts.params || {}),
    };
    const adj = {
        homeDelta: 0,
        awayDelta: 0,
        h2hGoalDiff: 0,   // diferencia de goles media del head-to-head (favor local), ya ponderada
        neutralVenue: false,
        ...(opts.adjustments || {}),
    };

    const fifaHome = Number(home?.fifa_points) || 0;
    const fifaAway = Number(away?.fifa_points) || 0;
    const eloHome = Number(home?.elo);
    const eloAway = Number(away?.elo);
    const hasElo = Number.isFinite(eloHome) && Number.isFinite(eloAway);

    // Forma: ataque = goles a favor esperados, defensa = goles en contra esperados.
    const attHome = numberOr(home?.form?.attack, params.totalGoals / 2);
    const defHome = numberOr(home?.form?.defense, params.totalGoals / 2);
    const attAway = numberOr(away?.form?.attack, params.totalGoals / 2);
    const defAway = numberOr(away?.form?.defense, params.totalGoals / 2);

    // Tasas "de forma": el ataque de uno contra la defensa del otro.
    const lamFormHome = (attHome + defAway) / 2;
    const lamFormAway = (attAway + defHome) / 2;
    const gdForm = lamFormHome - lamFormAway;
    const totalForm = lamFormHome + lamFormAway;

    // ANCLA de fuerza: la diferencia de Elo (calibrada por backtest sobre partidos
    // reales) es más predictiva que el ranking FIFA. El FIFA queda como respaldo si
    // todavía no hay Elo calculado para alguno de los dos equipos.
    const gdRank = params.k * (fifaHome - fifaAway);
    const gdElo = params.kElo * (eloHome - eloAway);

    // El total de goles esperado mezcla la base con el nivel goleador de la forma real.
    const w = clamp01(params.rankingWeight);
    let total = w * params.totalGoals + (1 - w) * totalForm;

    // Con Elo, la diferencia se ancla 100% en Elo (ya incorpora la forma reciente, así
    // que sumar gdForm sería doble conteo). Sin Elo, se cae a la mezcla FIFA ↔ forma.
    let gd = hasElo ? gdElo : (w * gdRank + (1 - w) * gdForm);

    // Head-to-head (su confiabilidad/peso ya viene aplicada en el ETL).
    gd += numberOr(adj.h2hGoalDiff, 0);

    // Ventaja de anfitrión: solo si el equipo es local de verdad (sede neutral lo anula).
    if (!adj.neutralVenue) {
        if (home?.is_host) gd += params.homeAdvantage;
        if (away?.is_host) gd -= params.homeAdvantage;
    }

    // Ajustes de la segunda ingeniería de datos (en goles esperados).
    gd += numberOr(adj.homeDelta, 0) - numberOr(adj.awayDelta, 0);

    let lambdaHome = (total + gd) / 2;
    let lambdaAway = (total - gd) / 2;

    lambdaHome = Math.max(params.minLambda, lambdaHome);
    lambdaAway = Math.max(params.minLambda, lambdaAway);

    return {
        lambdaHome,
        lambdaAway,
        detail: {
            gdRank, gdElo, gdForm, gd, total,
            anchor: hasElo ? 'elo' : 'fifa',
            eloHome: hasElo ? eloHome : null,
            eloAway: hasElo ? eloAway : null,
            lamFormHome, lamFormAway,
            rankingWeight: w,
            params,
        },
    };
}

function numberOr(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp01(x) {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0.6;
    return Math.min(1, Math.max(0, n));
}

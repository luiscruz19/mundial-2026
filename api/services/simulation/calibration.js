import { simulateMatch } from './simulate-match.js';
import CONFIG from '../../config/config.js';

/**
 * Calibración (lo que cierra la precisión, sección 7/13.4).
 *
 * Los parámetros del modelo (k, totalGoals, rho, rankingWeight, homeAdvantage) no
 * se eligen a ojo: se ajustan contra resultados históricos para que las
 * probabilidades queden BIEN CALIBRADAS (cuando el modelo dice 60%, que ocurra
 * ~60% de las veces), minimizando una métrica de error de pronóstico.
 *
 * Métricas:
 *  - Brier (multiclase 1/X/2): promedio de la suma de (p_k − y_k)².
 *  - Log-loss: −promedio de log(p de la clase observada).
 *
 * Búsqueda: descenso por coordenadas sobre grillas (simple, robusto, sin deps).
 *
 * @param {Array} samples [{ home, away, result:'home'|'draw'|'away', adjustments? }]
 */

const OUTCOME_INDEX = { home: 0, draw: 1, away: 2 };

export function brierScore(prob, result) {
    const y = [0, 0, 0];
    y[OUTCOME_INDEX[result]] = 1;
    const p = [prob.home, prob.draw, prob.away];
    let s = 0;
    for (let k = 0; k < 3; k++) s += (p[k] - y[k]) ** 2;
    return s;
}

export function logLoss(prob, result) {
    const p = [prob.home, prob.draw, prob.away];
    const idx = OUTCOME_INDEX[result];
    const eps = 1e-12;
    return -Math.log(Math.max(eps, p[idx]));
}

/**
 * Evalúa un set de parámetros sobre las muestras y devuelve las métricas medias.
 */
export function evaluate(samples, params, metric = 'logloss') {
    if (!samples.length) return Infinity;
    let acc = 0;
    for (const s of samples) {
        const out = simulateMatch(s.home, s.away, { params, adjustments: s.adjustments });
        acc += metric === 'brier' ? brierScore(out.win_prob, s.result) : logLoss(out.win_prob, s.result);
    }
    return acc / samples.length;
}

/**
 * Calibra por descenso de coordenadas. Devuelve los mejores parámetros y la métrica.
 */
export function calibrate(samples, options = {}) {
    const metric = options.metric || 'logloss';
    const S = CONFIG.SIMULATION;

    let params = {
        k: S.K,
        rankingWeight: S.RANKING_WEIGHT,
        totalGoals: S.TOTAL_GOALS,
        rho: S.RHO,
        homeAdvantage: S.HOME_ADVANTAGE,
        ...(options.start || {}),
    };

    // Grillas de búsqueda por parámetro.
    const grids = {
        k: linspace(0.0008, 0.0030, 12),
        rankingWeight: linspace(0.2, 0.9, 8),
        totalGoals: linspace(2.2, 3.0, 9),
        rho: linspace(-0.18, 0.02, 11),
        homeAdvantage: linspace(0.0, 0.6, 7),
        ...(options.grids || {}),
    };

    let best = evaluate(samples, params, metric);
    const order = options.order || ['k', 'rankingWeight', 'totalGoals', 'rho', 'homeAdvantage'];
    const passes = options.passes || 3;

    for (let pass = 0; pass < passes; pass++) {
        let improvedInPass = false;
        for (const key of order) {
            let bestVal = params[key];
            for (const candidate of grids[key]) {
                const trial = { ...params, [key]: candidate };
                const score = evaluate(samples, trial, metric);
                if (score < best - 1e-9) {
                    best = score;
                    bestVal = candidate;
                    improvedInPass = true;
                }
            }
            params[key] = bestVal;
        }
        if (!improvedInPass) break;
    }

    return { params, metric, score: best, samples: samples.length };
}

function linspace(a, b, n) {
    if (n <= 1) return [a];
    const step = (b - a) / (n - 1);
    return Array.from({ length: n }, (_, i) => Math.round((a + i * step) * 1e6) / 1e6);
}

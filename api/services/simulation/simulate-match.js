import CONFIG from '../../config/config.js';
import { poissonVector } from './poisson.js';
import { dixonColesTau } from './dixon-coles.js';
import { computeLambdas } from './strength.js';

/**
 * Núcleo de la simulación de un partido (13.4, pasos 2 y 3).
 *
 * 1. Calcula λ del local y del visitante (strength.js).
 * 2. Arma la matriz de marcadores P(i,j) = P(i)·P(j) con dos Poisson, corregida
 *    por Dixon-Coles en los marcadores bajos, y la normaliza para que sume 1.
 * 3. Deriva probabilidades de victoria/empate/derrota, el ranking de marcadores
 *    más probables y los goles esperados.
 *
 * @returns {object} salida lista para guardar/mostrar.
 */
export function simulateMatch(home, away, opts = {}) {
    const S = CONFIG.SIMULATION;
    const rho = opts.params?.rho ?? S.RHO;
    const maxGoals = opts.maxGoals ?? S.MAX_GOALS;

    const { lambdaHome, lambdaAway, detail } = computeLambdas(home, away, opts);

    const { matrix, homeWin, draw, awayWin } = buildScoreMatrix(lambdaHome, lambdaAway, rho, maxGoals);

    // Ranking de marcadores más probables.
    const scoreline_ranking = [];
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            scoreline_ranking.push({ home: i, away: j, prob: matrix[i][j] });
        }
    }
    scoreline_ranking.sort((a, b) => b.prob - a.prob);
    const topScorelines = scoreline_ranking.slice(0, opts.topN ?? 10);
    const most_likely_score = { home: topScorelines[0].home, away: topScorelines[0].away };

    return {
        most_likely_score,
        win_prob: {
            home: round4(homeWin),
            draw: round4(draw),
            away: round4(awayWin),
        },
        expected_goals: {
            home: round3(lambdaHome),
            away: round3(lambdaAway),
        },
        scoreline_ranking: topScorelines.map(s => ({
            home: s.home,
            away: s.away,
            prob: round4(s.prob),
        })),
        lambdas: { home: lambdaHome, away: lambdaAway },
        detail,
    };
}

/**
 * Matriz de marcadores con Poisson + corrección Dixon-Coles, normalizada.
 * Devuelve también los agregados 1/X/2.
 */
export function buildScoreMatrix(lambdaHome, lambdaAway, rho, maxGoals) {
    const ph = poissonVector(lambdaHome, maxGoals);
    const pa = poissonVector(lambdaAway, maxGoals);

    const matrix = [];
    let sum = 0;
    for (let i = 0; i <= maxGoals; i++) {
        matrix[i] = [];
        for (let j = 0; j <= maxGoals; j++) {
            const tau = dixonColesTau(i, j, lambdaHome, lambdaAway, rho);
            const p = Math.max(0, ph[i] * pa[j] * tau);
            matrix[i][j] = p;
            sum += p;
        }
    }

    // Normalizar para que la matriz sume 1 (la cola truncada + τ alteran la masa).
    let homeWin = 0, draw = 0, awayWin = 0;
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            matrix[i][j] /= sum;
            if (i > j) homeWin += matrix[i][j];
            else if (i === j) draw += matrix[i][j];
            else awayWin += matrix[i][j];
        }
    }

    return { matrix, homeWin, draw, awayWin };
}

const round4 = (x) => Math.round(x * 10000) / 10000;
const round3 = (x) => Math.round(x * 1000) / 1000;

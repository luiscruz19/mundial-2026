import CONFIG from '../../config/config.js';
import { computeLambdas } from './strength.js';

/**
 * Monte Carlo del torneo (13.4 Paso 4): se muestrean N torneos completos para
 * sacar los números globales — quién llega más lejos y la probabilidad de campeón.
 *
 * Formato Mundial 2026: 12 grupos de 4 (round-robin), avanzan los 2 primeros de
 * cada grupo + los 8 mejores terceros → 32 → 16 → 8 → 4 → 2 → final.
 *
 * Cada partido se muestrea con las mismas tasas de Poisson del motor; los empates
 * de eliminación se resuelven por penales con una moneda sesgada por fuerza.
 *
 * @param {Array} teams  [{ id, code, name, group, fifa_points, form, is_host }]
 * @param {object} opts  { runs }
 * @returns {{ teams:[...], runs:number }}
 */
export function monteCarloProjection(teams, opts = {}) {
    const runs = opts.runs ?? CONFIG.SIMULATION.MONTE_CARLO_RUNS;
    const byId = new Map(teams.map(t => [t.id, t]));

    // Acumuladores de "hasta qué ronda llegó" por equipo.
    const stats = new Map();
    for (const t of teams) {
        stats.set(t.id, { r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0, roundsSum: 0 });
    }

    // Agrupar por grupo una sola vez.
    const groups = {};
    for (const t of teams) {
        const g = t.group || '?';
        (groups[g] = groups[g] || []).push(t);
    }
    const groupKeys = Object.keys(groups).sort();

    for (let r = 0; r < runs; r++) {
        const qualifiers = simulateGroupStage(groups, groupKeys);
        if (qualifiers.length < 2) continue;
        runKnockout(qualifiers, byId, stats);
    }

    const result = teams.map(t => {
        const s = stats.get(t.id);
        return {
            team_id: t.id,
            code: t.code,
            name: t.name,
            prob_champion: ratio(s.champion, runs),
            prob_final: ratio(s.final, runs),
            prob_semi: ratio(s.sf, runs),
            prob_round_of_16: ratio(s.r16, runs),
            expected_round: s.roundsSum / runs, // 0=fase grupos, 1=R32, 2=R16, 3=QF, 4=SF, 5=Final, 6=Campeón
        };
    });
    result.sort((a, b) => b.prob_champion - a.prob_champion);

    return { teams: result, runs };
}

/**
 * Simula la fase de grupos (round-robin dentro de cada grupo) y devuelve los
 * clasificados: 1° y 2° de cada grupo + los 8 mejores terceros.
 */
function simulateGroupStage(groups, groupKeys) {
    const firstsSeconds = [];
    const thirds = [];

    for (const g of groupKeys) {
        const gteams = groups[g];
        if (!gteams || gteams.length < 2) continue;
        const table = new Map(gteams.map(t => [t.id, { team: t, pts: 0, gf: 0, ga: 0 }]));

        for (let a = 0; a < gteams.length; a++) {
            for (let b = a + 1; b < gteams.length; b++) {
                const A = gteams[a], B = gteams[b];
                const { gh, ga } = sampleMatch(A, B);
                const rowA = table.get(A.id), rowB = table.get(B.id);
                rowA.gf += gh; rowA.ga += ga;
                rowB.gf += ga; rowB.ga += gh;
                if (gh > ga) rowA.pts += 3;
                else if (gh < ga) rowB.pts += 3;
                else { rowA.pts += 1; rowB.pts += 1; }
            }
        }

        const ranked = [...table.values()].sort(cmpRow);
        if (ranked[0]) firstsSeconds.push(ranked[0]);
        if (ranked[1]) firstsSeconds.push(ranked[1]);
        if (ranked[2]) thirds.push(ranked[2]);
    }

    // Mejores 8 terceros.
    thirds.sort(cmpRow);
    const bestThirds = thirds.slice(0, 8);

    // 24 (1°+2°) + 8 terceros = 32 clasificados.
    return [...firstsSeconds, ...bestThirds].map(row => row.team);
}

function cmpRow(x, y) {
    if (y.pts !== x.pts) return y.pts - x.pts;
    const gdx = x.gf - x.ga, gdy = y.gf - y.ga;
    if (gdy !== gdx) return gdy - gdx;
    return y.gf - x.gf;
}

/**
 * Corre la llave desde los 32 clasificados hasta el campeón, registrando hasta
 * dónde llegó cada equipo. El pairing es secuencial (válido aunque no replique el
 * cuadro oficial exacto): suficiente para los números globales de proyección.
 */
function runKnockout(qualifiers, byId, stats) {
    // Marcar ronda alcanzada para todos los clasificados (R32).
    const reachedRound = new Map(); // team_id -> índice de ronda alcanzada
    const stages = ['r32', 'r16', 'qf', 'sf', 'final'];

    let alive = qualifiers.slice(0, 32);
    for (const t of alive) {
        stats.get(t.id).r32++;
        reachedRound.set(t.id, 1);
    }

    let stageIdx = 0;
    while (alive.length > 1) {
        const next = [];
        for (let i = 0; i + 1 < alive.length; i += 2) {
            const A = alive[i], B = alive[i + 1];
            const winner = sampleKnockoutWinner(A, B);
            next.push(winner);
        }
        // Si quedó impar (no debería con 32), pasa el último.
        if (alive.length % 2 === 1) next.push(alive[alive.length - 1]);

        const reachedStage = stageIdx + 2; // tras R32: ganadores llegan a R16 (=2)
        for (const t of next) {
            reachedRound.set(t.id, reachedStage);
            const s = stats.get(t.id);
            if (reachedStage === 2) s.r16++;
            else if (reachedStage === 3) s.qf++;
            else if (reachedStage === 4) s.sf++;
            else if (reachedStage === 5) s.final++;
        }

        alive = next;
        stageIdx++;
        if (stageIdx >= stages.length) break;
    }

    // Campeón.
    if (alive.length === 1) {
        const champ = alive[0];
        stats.get(champ.id).champion++;
        reachedRound.set(champ.id, 6);
    }

    // Sumar "ronda alcanzada" a roundsSum para el promedio (expected_round).
    for (const [teamId, round] of reachedRound.entries()) {
        stats.get(teamId).roundsSum += round;
    }
}

/**
 * Muestrea un marcador A vs B con las tasas de Poisson del motor.
 */
function sampleMatch(A, B) {
    const { lambdaHome, lambdaAway } = computeLambdas(A, B);
    return { gh: samplePoisson(lambdaHome), ga: samplePoisson(lambdaAway) };
}

/**
 * Resuelve un cruce de eliminación: si hay empate, penales por moneda sesgada
 * por la fuerza (mayor λ → más chance).
 */
function sampleKnockoutWinner(A, B) {
    const { lambdaHome, lambdaAway } = computeLambdas(A, B);
    const gh = samplePoisson(lambdaHome);
    const ga = samplePoisson(lambdaAway);
    if (gh > ga) return A;
    if (ga > gh) return B;
    // Penales: probabilidad de A proporcional a su λ.
    const pA = lambdaHome / (lambdaHome + lambdaAway || 1);
    return Math.random() < pA ? A : B;
}

/**
 * Muestreo de una Poisson por el método de Knuth.
 */
export function samplePoisson(lambda) {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    return k - 1;
}

const ratio = (n, d) => (d > 0 ? Math.round((n / d) * 10000) / 10000 : 0);

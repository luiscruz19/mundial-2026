import CONFIG from '../../config/config.js';
import { computeLambdas } from './strength.js';
import { compareStandingRows } from '../etl/standings.js';
import { assignThirdPlaces } from '../etl/third-place-allocation.js';
import { buildKnockoutSkeleton } from '../../db/seed-data.js';

/**
 * Monte Carlo del torneo (13.4 Paso 4): se muestrean N torneos completos para sacar
 * los números globales — quién llega más lejos y la probabilidad de campeón.
 *
 * PARTE DEL ESTADO REAL: la fase de grupos se siembra con los puntos/goles de los
 * partidos YA jugados y solo se muestrean los partidos PENDIENTES. La fase final se
 * simula sobre el CUADRO OFICIAL (KNOCKOUT_RAW), asignando los mejores terceros a sus
 * slots según los grupos candidatos de cada cruce. Así la proyección es coherente con
 * lo que ya pasó: un clasificado no "pierde" su grupo y un eliminado no llega a campeón.
 *
 * @param {Array} teams [{ id, code, name, group, fifa_points, elo, form, is_host }]
 * @param {object} opts  { runs, groupMatches }
 *   groupMatches: partidos de fase de grupos [{ home_team_id, away_team_id, group, status, home_score, away_score }]
 * @returns {{ teams:[...], runs:number }}
 */
export function monteCarloProjection(teams, opts = {}) {
    const runs = opts.runs ?? CONFIG.SIMULATION.MONTE_CARLO_RUNS;
    const groupMatches = opts.groupMatches || [];
    const byId = new Map(teams.map(t => [t.id, t]));

    const stats = new Map();
    for (const t of teams) {
        stats.set(t.id, { r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0, roundsSum: 0 });
    }

    // Equipos por grupo.
    const groups = {};
    for (const t of teams) {
        const g = t.group || '?';
        (groups[g] = groups[g] || []).push(t);
    }
    const groupKeys = Object.keys(groups).sort();

    // Estado real de cada grupo (tabla sembrada + partidos pendientes).
    const groupState = buildGroupState(groups, groupKeys, groupMatches);
    // Cuadro oficial: partidos de R32 y slots de tercero con sus grupos candidatos.
    const bracket = parseBracket();

    let validRuns = 0;
    for (let r = 0; r < runs; r++) {
        const { firsts, seconds, thirds } = simulateGroups(groupState, groupKeys);
        const bestThirds = pickBestThirds(thirds, 8);
        const r32 = assignBracketSlots(bracket, firsts, seconds, bestThirds);
        if (!r32) continue; // no se pudo armar el cuadro (matching de terceros imposible)
        runKnockout(bracket, r32, byId, stats);
        validRuns++;
    }

    const denom = validRuns || 1;
    const result = teams.map(t => {
        const s = stats.get(t.id);
        return {
            team_id: t.id,
            code: t.code,
            name: t.name,
            prob_champion: ratio(s.champion, denom),
            prob_final: ratio(s.final, denom),
            prob_semi: ratio(s.sf, denom),
            prob_round_of_16: ratio(s.r32, denom), // "llega a la fase final" = entra a los 32
            prob_quarter: ratio(s.qf, denom),
            expected_round: s.roundsSum / denom, // 0=grupos,1=R32,2=R16,3=QF,4=SF,5=Final,6=Campeón
            already_qualified: s.r32 >= denom,    // entra a la fase final en el 100% de las corridas
            eliminated: s.r32 === 0,              // nunca entra a la fase final
        };
    });
    result.sort((a, b) => b.prob_champion - a.prob_champion);

    return { teams: result, runs: validRuns };
}

// ─── Fase de grupos: estado real + simulación de lo pendiente ────────────────

/**
 * Construye, por grupo, la tabla sembrada con los partidos jugados y la lista de
 * partidos pendientes (a muestrear). Si no hay datos de un grupo, genera el round-robin
 * completo como pendiente (comportamiento de respaldo).
 */
function buildGroupState(groups, groupKeys, groupMatches) {
    const byGroup = {};
    for (const m of groupMatches) {
        const g = m.group;
        if (!g) continue;
        (byGroup[g] = byGroup[g] || []).push(m);
    }

    const state = {};
    for (const g of groupKeys) {
        const gteams = groups[g] || [];
        const table = new Map(gteams.map(t => [t.id, blankRow(t)]));
        const pending = [];
        const ms = byGroup[g] || [];

        if (ms.length === 0) {
            // Sin datos: round-robin completo pendiente.
            for (let a = 0; a < gteams.length; a++) {
                for (let b = a + 1; b < gteams.length; b++) pending.push([gteams[a].id, gteams[b].id]);
            }
        } else {
            for (const m of ms) {
                const home = table.get(m.home_team_id);
                const away = table.get(m.away_team_id);
                if (!home || !away) continue;
                const played = m.status === 'finished' && m.home_score != null && m.away_score != null;
                if (played) applyResult(home, away, m.home_score, m.away_score);
                else pending.push([m.home_team_id, m.away_team_id]);
            }
        }
        state[g] = { table, pending };
    }
    return state;
}

/** Simula los partidos pendientes de cada grupo sobre la tabla real y rankea. */
function simulateGroups(groupState, groupKeys) {
    const firsts = {}, seconds = {}, thirds = [];

    for (const g of groupKeys) {
        const st = groupState[g];
        if (!st) continue;
        // Clonar la tabla real (no mutar el estado base entre corridas).
        const table = new Map();
        for (const [id, row] of st.table) table.set(id, { ...row });

        for (const [homeId, awayId] of st.pending) {
            const A = table.get(homeId), B = table.get(awayId);
            if (!A || !B) continue;
            const { gh, ga } = sampleMatch(A.team, B.team);
            applyResult(A, B, gh, ga);
        }

        const ranked = [...table.values()].sort(compareStandingRows);
        // Guardamos el id (el bracket y stats trabajan por id; byId resuelve el objeto).
        if (ranked[0]) firsts[g] = ranked[0].team.id;
        if (ranked[1]) seconds[g] = ranked[1].team.id;
        if (ranked[2]) thirds.push({ group: g, row: ranked[2] });
    }
    return { firsts, seconds, thirds };
}

/** Elige los N mejores terceros (cross-grupo) con el mismo criterio que la tabla. */
function pickBestThirds(thirds, n) {
    const sorted = [...thirds].sort((a, b) => compareStandingRows(a.row, b.row));
    const best = sorted.slice(0, n);
    const byGroup = {};
    for (const t of best) byGroup[t.group] = t.row.team.id;
    return { groups: best.map(t => t.group), byGroup };
}

// ─── Cuadro de eliminación oficial ───────────────────────────────────────────

/**
 * Parsea el cuadro oficial una vez: los 16 partidos de R32 con sus placeholders, y los
 * slots de tercero con los grupos candidatos (de "3 A/B/C/D/F"). El resto del árbol
 * (R16→F) se recorre por stage.
 */
function parseBracket() {
    const skeleton = buildKnockoutSkeleton();
    const r32 = skeleton.filter(b => b.stage === 'round_of_32');
    const thirdSlots = [];
    for (const m of r32) {
        for (const side of ['home_placeholder', 'away_placeholder']) {
            const ph = m[side];
            const hostPh = m[side === 'home_placeholder' ? 'away_placeholder' : 'home_placeholder'];
            if (typeof ph === 'string' && ph.startsWith('3 ')) {
                thirdSlots.push({
                    key: `${m.bracket_slot}:${side}`,
                    hostGroup: hostGroup(hostPh),
                    candidates: new Set(ph.slice(2).split('/').map(s => s.trim())),
                });
            }
        }
    }
    return { skeleton, r32, thirdSlots };
}

/**
 * Asigna equipos a los 16 partidos de R32: 1°/2° a sus slots fijos y los 8 mejores
 * terceros a los slots de tercero según los grupos candidatos (matching). Devuelve
 * [{ slot, home, away }] o null si el matching de terceros es imposible.
 */
function assignBracketSlots(bracket, firsts, seconds, bestThirds) {
    const thirdAssignment = assignThirdPlaces(bestThirds.groups, bracket.thirdSlots);
    if (!thirdAssignment) return null;

    const resolve = (ph, slot, side) => {
        if (ph.startsWith('3 ')) {
            const g = thirdAssignment.get(`${slot}:${side}`);
            return g ? bestThirds.byGroup[g] : null;
        }
        const pos = ph[0], grp = ph.slice(1);
        return pos === '1' ? firsts[grp] : pos === '2' ? seconds[grp] : null;
    };

    const out = [];
    for (const m of bracket.r32) {
        const home = resolve(m.home_placeholder, m.bracket_slot, 'home_placeholder');
        const away = resolve(m.away_placeholder, m.bracket_slot, 'away_placeholder');
        if (home == null || away == null) return null;
        out.push({ slot: m.bracket_slot, home, away });
    }
    return out;
}

/** Grupo del "1X" que enfrenta a un tercero (el placeholder del otro lado del cruce). */
function hostGroup(placeholder) {
    return typeof placeholder === 'string' && /^1[A-L]$/.test(placeholder) ? placeholder.slice(1) : null;
}

/**
 * Simula el cuadro desde R32 hasta el campeón sobre el bracket oficial, registrando
 * hasta qué ronda llegó cada equipo.
 */
function runKnockout(bracket, r32, byId, stats) {
    const slotWinner = new Map();
    const reached = new Map();
    const mark = (id, round) => reached.set(id, Math.max(reached.get(id) || 0, round));

    // R32.
    for (const { slot, home, away } of r32) {
        mark(home, 1); mark(away, 1);
        stats.get(home).r32++; stats.get(away).r32++;
        const w = sampleKnockoutWinner(byId.get(home), byId.get(away));
        slotWinner.set(slot, w.id);
    }

    // R16 → Final.
    const rounds = [
        { stage: 'round_of_16', stat: 'r16', round: 2 },
        { stage: 'quarter_final', stat: 'qf', round: 3 },
        { stage: 'semi_final', stat: 'sf', round: 4 },
        { stage: 'final', stat: 'final', round: 5 },
    ];
    for (const { stage, stat, round } of rounds) {
        for (const m of bracket.skeleton) {
            if (m.stage !== stage) continue;
            const homeId = resolveWinner(m.home_placeholder, slotWinner);
            const awayId = resolveWinner(m.away_placeholder, slotWinner);
            if (homeId == null || awayId == null) continue;
            mark(homeId, round); mark(awayId, round);
            stats.get(homeId)[stat]++; stats.get(awayId)[stat]++;
            const w = sampleKnockoutWinner(byId.get(homeId), byId.get(awayId));
            slotWinner.set(m.bracket_slot, w.id);
        }
    }

    // Campeón = ganador de la final.
    const finalMatch = bracket.skeleton.find(b => b.stage === 'final');
    const champId = finalMatch ? slotWinner.get(finalMatch.bracket_slot) : null;
    if (champId != null) { stats.get(champId).champion++; mark(champId, 6); }

    for (const [id, round] of reached) stats.get(id).roundsSum += round;
}

/** Resuelve un placeholder "W:R32-1" al equipo ganador de ese slot. */
function resolveWinner(ph, slotWinner) {
    if (typeof ph === 'string' && ph.startsWith('W:')) return slotWinner.get(ph.slice(2));
    return null; // "L:..." (tercer puesto) no afecta la proyección
}

// ─── Helpers de tabla y muestreo ─────────────────────────────────────────────

function blankRow(team) {
    return { team, points: 0, goals_for: 0, goals_against: 0 };
}

function applyResult(home, away, gh, ga) {
    home.goals_for += gh; home.goals_against += ga;
    away.goals_for += ga; away.goals_against += gh;
    if (gh > ga) home.points += 3;
    else if (gh < ga) away.points += 3;
    else { home.points += 1; away.points += 1; }
}

/** Muestrea un marcador A (local) vs B (visita) con las tasas de Poisson del motor. */
function sampleMatch(A, B) {
    const { lambdaHome, lambdaAway } = computeLambdas(A, B, { adjustments: { neutralVenue: true } });
    return { gh: samplePoisson(lambdaHome), ga: samplePoisson(lambdaAway) };
}

/**
 * Resuelve un cruce de eliminación (sede neutral): si hay empate, penales por moneda
 * sesgada por la fuerza (mayor λ → más chance).
 */
function sampleKnockoutWinner(A, B) {
    const { lambdaHome, lambdaAway } = computeLambdas(A, B, { adjustments: { neutralVenue: true } });
    const gh = samplePoisson(lambdaHome);
    const ga = samplePoisson(lambdaAway);
    if (gh > ga) return A;
    if (ga > gh) return B;
    const pA = lambdaHome / (lambdaHome + lambdaAway || 1);
    return Math.random() < pA ? A : B;
}

/** Muestreo de una Poisson por el método de Knuth. */
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

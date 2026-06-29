import { Op } from 'sequelize';
import Match from '../../models/Match.js';
import Team from '../../models/Team.js';
import Venue from '../../models/Venue.js';
import Standing from '../../models/Standing.js';
import { compareStandingRows } from './standings.js';
import { assignThirdPlaces } from './third-place-allocation.js';

/**
 * Resolución de la fase final (13.3): cuando un partido de eliminación termina,
 * se completa el rival de la siguiente llave. El "mapa de cruces" se modela con
 * `bracket_slot` (la posición de cada partido) y los `*_placeholder` que indican
 * de dónde sale cada equipo (ej: "W:R32-1" = ganador del partido con slot R32-1,
 * "1A" = primero del grupo A).
 *
 * Acá resolvemos los placeholders de tipo "W:<slot>" / "L:<slot>" a partir de los
 * resultados ya consolidados. El sembrado de grupos (1A, 2B...) lo completa el
 * cierre de la fase de grupos cuando todas las tablas están definidas.
 */

/**
 * Dado un partido recién finalizado, propaga su ganador (y perdedor si aplica)
 * a los partidos cuyo placeholder lo referencia por slot.
 */
export async function resolveBracketAfterMatch(finishedMatch) {
    if (finishedMatch.stage === 'group') return [];
    const slot = finishedMatch.bracket_slot;
    if (!slot) return [];

    const winnerId = getWinnerId(finishedMatch);
    const loserId = getLoserId(finishedMatch);
    if (!winnerId) return [];

    const updated = [];
    const dependents = await Match.findAll({
        where: { stage: ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'] },
    });

    for (const dep of dependents) {
        let changed = false;
        if (matchesPlaceholder(dep.home_placeholder, 'W', slot)) { dep.home_team_id = winnerId; dep.home_placeholder = null; changed = true; }
        if (matchesPlaceholder(dep.away_placeholder, 'W', slot)) { dep.away_team_id = winnerId; dep.away_placeholder = null; changed = true; }
        if (loserId && matchesPlaceholder(dep.home_placeholder, 'L', slot)) { dep.home_team_id = loserId; dep.home_placeholder = null; changed = true; }
        if (loserId && matchesPlaceholder(dep.away_placeholder, 'L', slot)) { dep.away_team_id = loserId; dep.away_placeholder = null; changed = true; }
        if (changed) { await dep.save(); updated.push(dep.id); }
    }
    return updated;
}

/**
 * Siembra los cruces de la primera ronda eliminatoria con los clasificados de los
 * grupos, resolviendo placeholders del tipo "1A", "2B", "3CDEF" (mejor tercero).
 * Recibe un mapa { "1A": teamId, "2A": teamId, ... } ya calculado por el cierre.
 */
export async function seedKnockoutFromGroups(positionMap) {
    const updated = [];
    const knockout = await Match.findAll({
        where: { stage: ['round_of_32', 'round_of_16'] },
    });
    for (const m of knockout) {
        let changed = false;
        if (m.home_placeholder && positionMap[m.home_placeholder]) {
            m.home_team_id = positionMap[m.home_placeholder]; m.home_placeholder = null; changed = true;
        }
        if (m.away_placeholder && positionMap[m.away_placeholder]) {
            m.away_team_id = positionMap[m.away_placeholder]; m.away_placeholder = null; changed = true;
        }
        if (changed) { await m.save(); updated.push(m.id); }
    }
    return updated;
}

/**
 * Siembra el cuadro de eliminación con los clasificados REALES una vez que la fase de
 * grupos terminó: 1°/2° de cada grupo a sus slots, y los 8 mejores terceros a los slots
 * "3 X/Y/Z" según los grupos candidatos de cada cruce (matching, igual que la proyección).
 * Idempotente: solo toca slots que todavía tienen placeholder de grupo.
 *
 * @returns {{ seeded:number, complete:boolean, reason?:string }}
 */
export async function seedKnockoutBracket() {
    // 1) ¿Terminó la fase de grupos? Si quedan partidos de grupo sin jugar, no sembramos.
    const pendingGroup = await Match.count({ where: { stage: 'group', status: { [Op.ne]: 'finished' } } });
    if (pendingGroup > 0) return { seeded: 0, complete: false, reason: `faltan ${pendingGroup} partidos de grupo` };

    // 2) Tabla real por grupo (ordenada por posición).
    const rows = await Standing.findAll();
    const byGroup = {};
    for (const s of rows) (byGroup[s.group] = byGroup[s.group] || []).push(s);
    for (const g of Object.keys(byGroup)) byGroup[g].sort((a, b) => (a.position ?? 9) - (b.position ?? 9));

    // 3) Mapa de 1°/2° por grupo.
    const positionMap = {};
    for (const [g, list] of Object.entries(byGroup)) {
        if (list[0]) positionMap[`1${g}`] = list[0].team_id;
        if (list[1]) positionMap[`2${g}`] = list[1].team_id;
    }

    // 4) Los 8 mejores terceros (mismo criterio que la tabla: pts → DG → GF).
    const thirds = Object.entries(byGroup)
        .map(([g, list]) => ({ group: g, row: list[2] }))
        .filter((x) => x.row);
    thirds.sort((a, b) => compareStandingRows(a.row, b.row));
    const best8 = thirds.slice(0, 8);
    const thirdByGroup = {};
    for (const t of best8) thirdByGroup[t.group] = t.row.team_id;
    const thirdGroups = best8.map((t) => t.group);

    // 5) Slots de tercero de R32 con sus grupos candidatos, y matching.
    const r32 = await Match.findAll({ where: { stage: 'round_of_32' } });
    const thirdSlots = [];
    for (const m of r32) {
        for (const side of ['home', 'away']) {
            const ph = side === 'home' ? m.home_placeholder : m.away_placeholder;
            const hostPh = side === 'home' ? m.away_placeholder : m.home_placeholder;
            if (ph && ph.startsWith('3 ')) {
                thirdSlots.push({
                    key: `${m.bracket_slot}:${side}`,
                    hostGroup: hostGroup(hostPh),
                    candidates: new Set(ph.slice(2).split('/').map((s) => s.trim())),
                });
            }
        }
    }
    const thirdAssignment = assignThirdPlaces(thirdGroups, thirdSlots);

    // 6) Asignar equipos a los cruces de R32.
    const updated = [];
    for (const m of r32) {
        let changed = false;
        for (const side of ['home', 'away']) {
            const phField = side === 'home' ? 'home_placeholder' : 'away_placeholder';
            const idField = side === 'home' ? 'home_team_id' : 'away_team_id';
            const ph = m[phField];
            if (!ph) continue;
            let teamId = null;
            if (ph.startsWith('3 ')) {
                const g = thirdAssignment ? thirdAssignment.get(`${m.bracket_slot}:${side}`) : null;
                teamId = g ? thirdByGroup[g] : null;
            } else {
                teamId = positionMap[ph] ?? null;
            }
            if (teamId) { m[idField] = teamId; m[phField] = null; changed = true; }
        }
        if (changed) { await m.save(); updated.push(m.id); }
    }
    return { seeded: updated.length, complete: true, matches: updated };
}

/** Grupo del "1X" que enfrenta a un tercero (el placeholder del otro lado del cruce). */
function hostGroup(placeholder) {
    return placeholder && /^1[A-L]$/.test(placeholder) ? placeholder.slice(1) : null;
}

function matchesPlaceholder(placeholder, kind, slot) {
    if (!placeholder) return false;
    // Formatos aceptados: "W:R32-1", "W R32-1", "Ganador R32-1"
    const norm = String(placeholder).toUpperCase().replace(/\s+/g, ' ').trim();
    const prefix = kind === 'W' ? ['W:', 'W ', 'GANADOR '] : ['L:', 'L ', 'PERDEDOR '];
    return prefix.some(p => norm === `${p}${slot.toUpperCase()}`);
}

function getWinnerId(m) {
    if (m.home_score == null || m.away_score == null) return null;
    if (m.home_score > m.away_score) return m.home_team_id;
    if (m.away_score > m.home_score) return m.away_team_id;
    // Empate → penales.
    if (m.home_penalties != null && m.away_penalties != null) {
        return m.home_penalties >= m.away_penalties ? m.home_team_id : m.away_team_id;
    }
    return null;
}

function getLoserId(m) {
    const w = getWinnerId(m);
    if (!w) return null;
    return w === m.home_team_id ? m.away_team_id : m.home_team_id;
}

/**
 * Devuelve la llave completa agrupada por ronda, para la pantalla de bracket.
 */
export async function getBracket() {
    const rounds = [
        { round: 'R32', stage: 'round_of_32' },
        { round: 'R16', stage: 'round_of_16' },
        { round: 'QF', stage: 'quarter_final' },
        { round: 'SF', stage: 'semi_final' },
        { round: '3P', stage: 'third_place' },
        { round: 'F', stage: 'final' },
    ];
    const out = [];
    for (const r of rounds) {
        const matches = await Match.findAll({
            where: { stage: r.stage },
            order: [['kickoff_utc', 'ASC']],
            include: [
                { model: Team, as: 'homeTeam', required: false },
                { model: Team, as: 'awayTeam', required: false },
                { model: Venue, as: 'venue', required: false },
            ],
        });
        if (matches.length > 0) out.push({ round: r.round, stage: r.stage, matches });
    }
    return out;
}

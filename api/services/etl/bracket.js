import Match from '../../models/Match.js';
import Team from '../../models/Team.js';
import Venue from '../../models/Venue.js';

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

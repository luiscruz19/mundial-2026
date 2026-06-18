import { Op } from 'sequelize';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import { csvHistoryProvider } from '../providers/index.js';
import { computeEloTable } from './elo.js';
import { CODE_TO_DATASET, nameToCode } from './team-name-map.js';
import { invalidateSnapshot } from './snapshot.js';

/**
 * Recalcula el Elo de las 48 selecciones desde cero, procesando TODO el dataset
 * internacional cronológicamente, y lo persiste en `Team.elo`.
 *
 * Se corre en el seed y por cron. Para que los resultados de ESTE Mundial siempre
 * pesen (y el cron no los "pise" si el dataset externo va atrasado), se mezclan los
 * partidos finalizados del torneo (tabla `matches`) con el dataset, deduplicando por
 * fecha+rivales: si el dataset ya trae un partido del Mundial, no se cuenta dos veces;
 * si todavía no lo trae, igual se aplica. Como van al final (fechas 2026), pesan sobre
 * el Elo actual con el K más alto (Mundial).
 *
 * @returns {{ updated:number, teams:number, wc_merged?:number, skipped?:string }}
 */
export async function refreshEloRatings({ log = () => {} } = {}) {
    if (!csvHistoryProvider.enabled()) {
        return { updated: 0, teams: 0, skipped: 'sin HISTORY_CSV_URL' };
    }

    let matches = [];
    try {
        matches = await csvHistoryProvider.getRawMatches();
    } catch (error) {
        log(`Elo: no se pudo bajar el dataset: ${error.message}`);
        return { updated: 0, teams: 0, error: error.message };
    }
    if (matches.length === 0) return { updated: 0, teams: 0, skipped: 'dataset vacío' };

    const teams = await Team.findAll();

    // Mezclar los partidos finalizados del Mundial que el dataset todavía no tenga.
    const wcMatches = await collectWorldCupMatches(teams);
    const seen = new Set(matches.map(matchKey));
    let wcMerged = 0;
    for (const wm of wcMatches) {
        if (seen.has(matchKey(wm))) continue; // ya está en el dataset → no duplicar
        matches.push(wm);
        wcMerged += 1;
    }

    // Elo de TODAS las selecciones (rivales incluidos → ratings correctos).
    const table = computeEloTable(matches);

    // Persistir solo las 48: nombre canónico del dataset -> Elo -> Team.elo.
    const now = new Date();
    let updated = 0;
    for (const team of teams) {
        const datasetName = CODE_TO_DATASET[team.code];
        const elo = datasetName ? table.get(datasetName) : null;
        if (elo == null) continue;
        await team.update({ elo: Math.round(elo * 100) / 100, elo_updated_at: now });
        await invalidateSnapshot(team.id); // que la próxima predicción tome el Elo nuevo
        updated += 1;
    }
    log(`Elo recalculado: ${updated}/${teams.length} selecciones (${matches.length} partidos${wcMerged ? `, +${wcMerged} del Mundial no presentes en el dataset` : ''})`);
    return { updated, teams: teams.length, wc_merged: wcMerged };
}

/** Clave de deduplicación de un partido: fecha + par de equipos (sin orden). */
function matchKey(m) {
    const a = String(m.home).toLowerCase();
    const b = String(m.away).toLowerCase();
    const pair = a < b ? `${a}~${b}` : `${b}~${a}`;
    return `${String(m.date).slice(0, 10)}|${pair}`;
}

/**
 * Partidos finalizados del Mundial 2026, en el formato de `getRawMatches`, con los
 * nombres mapeados al canónico del dataset (para que el Elo los una con la historia).
 */
async function collectWorldCupMatches(teams) {
    const byId = new Map(teams.map(t => [t.id, t]));
    const finished = await Match.findAll({
        where: {
            status: 'finished',
            home_score: { [Op.ne]: null },
            away_score: { [Op.ne]: null },
        },
    });
    const rows = [];
    for (const mm of finished) {
        const home = byId.get(mm.home_team_id);
        const away = byId.get(mm.away_team_id);
        if (!home || !away) continue;
        const hName = CODE_TO_DATASET[home.code];
        const aName = CODE_TO_DATASET[away.code];
        if (!hName || !aName) continue;
        rows.push({
            date: new Date(mm.kickoff_utc).toISOString().slice(0, 10),
            home: hName,
            away: aName,
            home_score: mm.home_score,
            away_score: mm.away_score,
            tournament: 'FIFA World Cup',
            neutral: !home.is_host && !away.is_host,
        });
    }
    return rows;
}

/** Helper para resolver el código FIFA de un nombre del dataset (re-export). */
export { nameToCode };

export default refreshEloRatings;

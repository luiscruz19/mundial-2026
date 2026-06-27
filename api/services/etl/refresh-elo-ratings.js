import { Op } from 'sequelize';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import { csvHistoryProvider } from '../providers/index.js';
import { computeEloTable, ELO_HOME_FIELD } from './elo.js';
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

    // FUENTE AUTORITATIVA del Mundial 2026 = la tabla `matches` (marcador oficial, kickoff,
    // anfitrión). Para evitar doble conteo, se ELIMINAN del dataset externo las filas del
    // Mundial 2026 final (el dedup por fecha fallaba ~38% por desfase UTC/local de las sedes
    // en USA/MEX/CAN) y se aplican SIEMPRE los partidos de la tabla. Igualdad EXACTA del
    // torneo: 'fifa world cup' — NO se tocan las filas 'fifa world cup qualification' (historia
    // legítima con K de eliminatoria).
    const before = matches.length;
    matches = matches.filter((m) => !isWorldCup2026Final(m));
    const removedFromDataset = before - matches.length;

    const wcMatches = await collectWorldCupMatches(teams);
    for (const wm of wcMatches) matches.push(wm);

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
    log(`Elo recalculado: ${updated}/${teams.length} selecciones (${matches.length} partidos; ${wcMatches.length} del Mundial autoritativos, ${removedFromDataset} filas WC2026 quitadas del dataset)`);
    return { updated, teams: teams.length, wc_applied: wcMatches.length, wc_removed_from_dataset: removedFromDataset };
}

/** True si la fila del dataset es un partido de la FASE FINAL del Mundial 2026 (no eliminatorias). */
function isWorldCup2026Final(m) {
    return String(m.tournament).trim().toLowerCase() === 'fifa world cup'
        && String(m.date).startsWith('2026');
}

/**
 * Partidos finalizados del Mundial 2026, en el formato de `getRawMatches`, con los
 * nombres mapeados al canónico del dataset y la ventaja de localía CON SIGNO a favor del
 * anfitrión real (esté en la columna home o away del fixture).
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
            // Ventaja con signo: +100 si el local es anfitrión, −100 si el anfitrión es el
            // visitante (juega en su país pese a figurar de visita), 0 si ninguno es anfitrión.
            home_advantage: home.is_host ? ELO_HOME_FIELD : (away.is_host ? -ELO_HOME_FIELD : 0),
        });
    }
    return rows;
}

/** Helper para resolver el código FIFA de un nombre del dataset (re-export). */
export { nameToCode };

export default refreshEloRatings;

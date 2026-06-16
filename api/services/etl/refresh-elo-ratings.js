import Team from '../../models/Team.js';
import { csvHistoryProvider } from '../providers/index.js';
import { computeEloTable } from './elo.js';
import { CODE_TO_DATASET, nameToCode } from './team-name-map.js';
import { invalidateSnapshot } from './snapshot.js';

/**
 * Recalcula el Elo de las 48 selecciones desde cero, procesando TODO el dataset
 * internacional cronológicamente, y lo persiste en `Team.elo`.
 *
 * Se corre en el seed y por cron (el dataset externo se actualiza solo). Durante el
 * Mundial, además, el Elo se mantiene vivo en `close-match` partido a partido, así
 * que esta recarga total es una "puesta a cero" de baja frecuencia.
 *
 * @returns {{ updated:number, teams:number, skipped?:string }}
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

    // Elo de TODAS las selecciones del dataset (rivales incluidos → ratings correctos).
    const table = computeEloTable(matches);

    // Persistir solo las 48: nombre canónico del dataset -> Elo -> Team.elo.
    const now = new Date();
    const teams = await Team.findAll();
    let updated = 0;
    for (const team of teams) {
        const datasetName = CODE_TO_DATASET[team.code];
        const elo = datasetName ? table.get(datasetName) : null;
        if (elo == null) continue;
        await team.update({ elo: Math.round(elo * 100) / 100, elo_updated_at: now });
        await invalidateSnapshot(team.id); // que la próxima predicción tome el Elo nuevo
        updated += 1;
    }
    log(`Elo recalculado: ${updated}/${teams.length} selecciones (de ${matches.length} partidos reales)`);
    return { updated, teams: teams.length };
}

/** Helper para resolver el código FIFA de un nombre del dataset (re-export). */
export { nameToCode };

export default refreshEloRatings;

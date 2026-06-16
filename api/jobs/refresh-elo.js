import cron from 'node-cron';
import { refreshEloRatings } from '../services/etl/refresh-elo-ratings.js';

/**
 * Recarga total del Elo (~1 vez por día) desde el dataset internacional, que se
 * actualiza solo con los nuevos resultados. Es complementario a la actualización
 * partido-a-partido que hace `close-match` durante el Mundial.
 */
export async function runRefreshElo() {
    try {
        const res = await refreshEloRatings({ log: (m) => console.info(`[elo] ${m}`) });
        return res;
    } catch (error) {
        console.warn('[elo] no se pudo recalcular:', error.message);
        return { updated: 0, error: error.message };
    }
}

export default function scheduleRefreshElo() {
    // 05:30 UTC todos los días (antes del refresco del ranking FIFA).
    cron.schedule('30 5 * * *', () => {
        runRefreshElo().catch(e => console.error('[elo]', e.message));
    });
}

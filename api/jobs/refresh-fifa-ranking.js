import cron from 'node-cron';
import Team from '../models/Team.js';
import { fifaRankingProvider } from '../services/providers/index.js';

/**
 * Refresco del ranking FIFA (~1 vez por día). Si hay números nuevos, actualiza los
 * puntos (con fecha) — el ancla del modelo. Si no hay fuente configurada, no hace nada.
 */
export async function runRefreshFifaRanking() {
    if (!fifaRankingProvider.enabled()) {
        return { updated: 0, skipped: 'sin FIFA_RANKING_URL' };
    }
    let ranking = [];
    try {
        ranking = await fifaRankingProvider.getRanking();
    } catch (error) {
        console.warn('[ranking] no se pudo obtener:', error.message);
        return { updated: 0, error: error.message };
    }
    const now = new Date();
    let updated = 0;
    for (const r of ranking) {
        const [n] = await Team.update(
            { fifa_points: r.points, fifa_rank: r.rank, fifa_points_updated_at: now },
            { where: { code: r.code } }
        );
        updated += n;
    }
    if (updated > 0) console.info(`[ranking] actualizado: ${updated} selecciones`);
    return { updated };
}

export default function scheduleRefreshFifaRanking() {
    // 06:00 UTC todos los días.
    cron.schedule('0 6 * * *', () => {
        runRefreshFifaRanking().catch(e => console.error('[ranking]', e.message));
    });
}

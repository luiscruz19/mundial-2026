import cron from 'node-cron';
import { Op } from 'sequelize';
import Match from '../models/Match.js';
import dataProvider from '../services/providers/index.js';
import { closeMatch } from '../services/etl/close-match.js';

/**
 * Sondeo del estado del fixture y CIERRE de partidos (13.3). Chequea los partidos
 * de la ventana (desde ~4h antes hasta que estén finalizados) y, cuando uno pasa a
 * "finalizado", consolida el resultado oficial vía closeMatch (historial, posiciones,
 * llave, comparación y aviso final).
 *
 * Frecuencia acotada para no gastar consultas: solo mira partidos en ventana.
 */
export async function runPollFixtures(now = new Date()) {
    const windowStart = new Date(now.getTime() - 5 * 3600 * 1000); // empezó hasta hace 5h
    const windowEnd = new Date(now.getTime() + 10 * 60 * 1000);    // o está por empezar (10 min)

    const candidates = await Match.findAll({
        where: {
            status: { [Op.in]: ['scheduled', 'live'] },
            kickoff_utc: { [Op.lte]: windowEnd, [Op.gte]: windowStart },
            home_team_id: { [Op.ne]: null },
            away_team_id: { [Op.ne]: null },
        },
    });

    let closed = 0, updated = 0;
    for (const match of candidates) {
        const ext = match.external_ids?.[dataProvider.primaryName()] || match.external_ids?.[dataProvider.secondaryName()];
        if (!ext) continue;
        let feed;
        try {
            feed = await dataProvider.getMatchStatus(ext);
        } catch (error) {
            console.warn(`[poll-fixtures] estado falló para match ${match.id}: ${error.message}`);
            continue;
        }
        if (!feed) continue;

        if (feed.status === 'finished' && feed.home_score != null && feed.away_score != null) {
            let lineups = { home: null, away: null };
            try { lineups = await dataProvider.getLineups(ext); } catch { /* opcional */ }
            await closeMatch(match, {
                home_score: feed.home_score,
                away_score: feed.away_score,
                lineups,
            });
            closed++;
        } else if (feed.status === 'live' && match.status !== 'live') {
            await match.update({ status: 'live' });
            updated++;
        }
    }

    if (closed > 0 || updated > 0) console.info(`[poll-fixtures] cerrados: ${closed}, en juego: ${updated}`);
    return { closed, updated, checked: candidates.length };
}

export default function schedulePollFixtures() {
    // Cada 10 minutos (la función solo actúa si hay partidos en ventana).
    cron.schedule('*/10 * * * *', () => {
        runPollFixtures().catch(e => console.error('[poll-fixtures]', e.message));
    });
}

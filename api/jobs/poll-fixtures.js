import cron from 'node-cron';
import { Op } from 'sequelize';
import Match from '../models/Match.js';
import dataProvider from '../services/providers/index.js';
import { closeMatch } from '../services/etl/close-match.js';

// Un partido no puede estar realmente finalizado antes de ~100' del kickoff (90' + descanso
// + descuento). Si el proveedor lo marca "finalizado" antes, es un dato provisional/erróneo
// y NO se consolida (blindaje contra el caso de resultados fabricados antes de jugarse).
const MIN_MATCH_MINUTES = 100;

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
            // Blindaje: ignorar cierres prematuros (el partido no pudo haber terminado todavía).
            const earliestFinish = new Date(new Date(match.kickoff_utc).getTime() + MIN_MATCH_MINUTES * 60 * 1000);
            if (now < earliestFinish) {
                console.warn(`[poll-fixtures] cierre prematuro IGNORADO: match ${match.id} (${match.bracket_slot || match.group || '-'}) — el proveedor lo marca ${feed.home_score}-${feed.away_score} pero aún no transcurrió el tiempo mínimo desde el kickoff (${match.kickoff_utc}).`);
                continue;
            }
            let lineups = { home: null, away: null };
            try { lineups = await dataProvider.getLineups(ext); } catch { /* opcional */ }
            await closeMatch(match, {
                home_score: feed.home_score,
                away_score: feed.away_score,
                // Penales (si el cruce se definió así): imprescindibles para resolver el ganador.
                home_penalties: feed.home_penalties ?? null,
                away_penalties: feed.away_penalties ?? null,
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

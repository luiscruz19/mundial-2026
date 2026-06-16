import { Op } from 'sequelize';
import CONFIG from '../../config/config.js';
import Match from '../../models/Match.js';
import dataProvider from '../providers/index.js';
import { notifyMatchEvent } from '../notification/notify-event.js';

/**
 * CAPA EN VIVO (13.6). Interface de sondeo acotado: durante la ventana del partido
 * se consulta el feed con más frecuencia y se actualiza el marcador provisorio;
 * ante un gol nuevo, se notifica a quienes lo pidieron.
 *
 * IMPORTANTE: el marcador en vivo es PROVISORIO. El resultado oficial y el historial
 * se consolidan recién al final (close-match), para no ensuciar la base ni el modelo.
 *
 * El sondeo gratis cubre esto con límites; para un feed pago de tiempo real basta
 * con cambiar el proveedor detrás de `dataProvider.getMatchStatus` (misma interface).
 */

/**
 * Devuelve los partidos dentro de la ventana de sondeo en vivo: desde
 * LIVE_WINDOW_BEFORE_MIN antes del inicio hasta LIVE_WINDOW_AFTER_MIN después del
 * final estimado (asumiendo ~115 min de duración con entretiempo).
 */
export async function getMatchesInLiveWindow(now = new Date()) {
    const beforeMs = CONFIG.LIVE.WINDOW_BEFORE_MIN * 60 * 1000;
    const afterMs = (115 + CONFIG.LIVE.WINDOW_AFTER_MIN) * 60 * 1000;
    const lowerKickoff = new Date(now.getTime() - afterMs); // ya empezó hace rato pero dentro de ventana
    const upperKickoff = new Date(now.getTime() + beforeMs); // está por empezar

    return Match.findAll({
        where: {
            status: { [Op.in]: ['scheduled', 'live'] },
            kickoff_utc: { [Op.between]: [lowerKickoff, upperKickoff] },
            home_team_id: { [Op.ne]: null },
            away_team_id: { [Op.ne]: null },
        },
    });
}

/**
 * Sondea un partido y actualiza su marcador en vivo. Detecta inicio y goles nuevos
 * y dispara notificaciones. NO consolida el resultado oficial (eso es el cierre).
 *
 * @returns {{ status, goals, started }}
 */
export async function pollLiveMatch(match) {
    let feed;
    try {
        const ext = match.external_ids?.[dataProvider.primaryName()] || match.external_ids?.[dataProvider.secondaryName()];
        feed = ext ? await dataProvider.getMatchStatus(ext) : null;
    } catch (error) {
        console.warn(`[live] sondeo falló para match ${match.id}: ${error.message}`);
        return { status: match.status, goals: 0, started: false };
    }
    if (!feed) return { status: match.status, goals: 0, started: false };

    const prevLive = match.live || { home_score: 0, away_score: 0 };
    const homeScore = feed.home_score ?? prevLive.home_score ?? 0;
    const awayScore = feed.away_score ?? prevLive.away_score ?? 0;

    let started = false;
    let goalsNotified = 0;

    // Transición a "en juego" (aviso de inicio lo cubre el scheduler match_start;
    // acá marcamos el estado para que la app muestre la capa en vivo).
    if (feed.status === 'live' && match.status !== 'live') {
        started = true;
    }

    // Goles nuevos respecto del último sondeo.
    const prevTotal = (prevLive.home_score ?? 0) + (prevLive.away_score ?? 0);
    const newTotal = homeScore + awayScore;
    if (newTotal > prevTotal && (match.status === 'live' || feed.status === 'live')) {
        const scored = await Match.findByPk(match.id, { include: [] });
        const ev = await notifyMatchEvent(match, 'goal', {
            title: '¡Gol!',
            body: `${homeScore}-${awayScore} en el partido que seguís.`,
            dedupeSuffix: `${homeScore}-${awayScore}`,
        });
        goalsNotified = ev.sent;
    }

    await match.update({
        status: feed.status === 'finished' ? match.status : (feed.status || match.status),
        live: {
            minute: feed.minute ?? prevLive.minute ?? null,
            period: feed.period ?? null,
            home_score: homeScore,
            away_score: awayScore,
            updated_at: new Date().toISOString(),
        },
    });

    return { status: feed.status, goals: goalsNotified, started };
}

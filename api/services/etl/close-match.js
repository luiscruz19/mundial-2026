import Team from '../../models/Team.js';
import HistoricalMatch from '../../models/HistoricalMatch.js';
import { recomputeGroupStandings } from './standings.js';
import { resolveBracketAfterMatch } from './bracket.js';
import { invalidateSnapshot } from './snapshot.js';
import { applyMatch, ELO_BASE, ELO_HOME_FIELD } from './elo.js';
import { buildComparison } from '../simulation/run-simulation.js';
import { notifyMatchEvent } from '../notification/notify-event.js';
import { cacheDel } from '../cache/redis.js';

/**
 * CIERRE DEL PARTIDO (13.3 + 13.5). Cuando un partido pasa a finalizado:
 *  1) consolida el resultado oficial, goleadores y alineaciones reales;
 *  2) agrega el partido al HISTORIAL de las dos selecciones (mejora la forma) e
 *     invalida sus snapshots para que la próxima simulación recalcule;
 *  3) recalcula la tabla del grupo (o resuelve el cruce de la fase final);
 *  4) arma la comparación oficial vs simulado;
 *  5) notifica el resultado final a quienes lo pidieron.
 *
 * Solo lo consolidado al final alimenta el modelo (no el marcador en vivo provisorio).
 * Idempotente: si el partido ya estaba cerrado con el mismo marcador, no duplica.
 *
 * @param {object} match  instancia del partido
 * @param {object} official { home_score, away_score, home_penalties?, away_penalties?, lineups?, goals? }
 */
export async function closeMatch(match, official) {
    const alreadyClosed = match.status === 'finished'
        && match.home_score === official.home_score
        && match.away_score === official.away_score;

    await match.update({
        status: 'finished',
        home_score: official.home_score,
        away_score: official.away_score,
        home_penalties: official.home_penalties ?? match.home_penalties,
        away_penalties: official.away_penalties ?? match.away_penalties,
        home_lineup: official.lineups?.home ?? match.home_lineup,
        away_lineup: official.lineups?.away ?? match.away_lineup,
        goals: official.goals ?? match.goals,
        live: null,
    });

    if (!alreadyClosed) {
        await appendToHistory(match);
        await updateEloFromMatch(match, official);
        await Promise.all([
            invalidateSnapshot(match.home_team_id),
            invalidateSnapshot(match.away_team_id),
            // La proyección depende del estado real: que se recalcule con el nuevo resultado.
            cacheDel('mundial:tournament:projection'),
        ]);
    }

    // Tabla de grupo o resolución de la llave.
    if (match.stage === 'group' && match.group) {
        await recomputeGroupStandings(match.group);
    } else if (match.stage !== 'group') {
        await resolveBracketAfterMatch(match);
    }

    // Comparación oficial vs simulado (si había simulación).
    const comparison = await buildComparison(match);

    // Aviso de resultado final.
    let notified = { sent: 0 };
    if (!alreadyClosed) {
        const home = await Team.findByPk(match.home_team_id);
        const away = await Team.findByPk(match.away_team_id);
        notified = await notifyMatchEvent(match, 'final_result', {
            title: 'Final del partido',
            body: `${home?.name || 'Local'} ${official.home_score} - ${official.away_score} ${away?.name || 'Visitante'}`,
            dedupeSuffix: `${official.home_score}-${official.away_score}`,
        });
    }

    return { closed: true, alreadyClosed, comparison, notified: notified.sent };
}

/**
 * Actualiza el Elo de ambas selecciones con el resultado recién consolidado, para que
 * el ancla del modelo quede al día partido a partido (sin esperar la recarga del dataset).
 * Sede neutral salvo que uno de los dos sea anfitrión.
 */
async function updateEloFromMatch(match, official) {
    const [home, away] = await Promise.all([
        Team.findByPk(match.home_team_id),
        Team.findByPk(match.away_team_id),
    ]);
    if (!home || !away) return;

    const ratingHome = home.elo != null ? Number(home.elo) : ELO_BASE;
    const ratingAway = away.elo != null ? Number(away.elo) : ELO_BASE;
    // Ventaja con signo: sigue al anfitrión real, esté de local o de visita en el fixture.
    const homeAdvantage = home.is_host ? ELO_HOME_FIELD : (away.is_host ? -ELO_HOME_FIELD : 0);

    const r = applyMatch({
        ratingHome, ratingAway,
        homeScore: official.home_score, awayScore: official.away_score,
        tournament: 'FIFA World Cup', homeAdvantage,
    });
    const now = new Date();
    await Promise.all([
        home.update({ elo: Math.round(r.ratingHome * 100) / 100, elo_updated_at: now }),
        away.update({ elo: Math.round(r.ratingAway * 100) / 100, elo_updated_at: now }),
    ]);
}

/**
 * Agrega el partido al histórico de ambas selecciones (orientado por equipo).
 */
async function appendToHistory(match) {
    const [home, away] = await Promise.all([
        Team.findByPk(match.home_team_id),
        Team.findByPk(match.away_team_id),
    ]);
    if (!home || !away) return;

    const date = new Date(match.kickoff_utc).toISOString().slice(0, 10);
    const condition = (code) => {
        if (home.is_host && code === home.code) return 'home';
        if (away.is_host && code === away.code) return 'away';
        return 'neutral';
    };

    const rows = [
        {
            team_id: home.id, team_code: home.code, opponent_code: away.code, opponent_name: away.name,
            match_date: date, goals_for: match.home_score, goals_against: match.away_score,
            condition: condition(home.code), competition_type: 'official', competition_name: 'World Cup 2026', source: 'tournament-close',
        },
        {
            team_id: away.id, team_code: away.code, opponent_code: home.code, opponent_name: home.name,
            match_date: date, goals_for: match.away_score, goals_against: match.home_score,
            condition: condition(away.code), competition_type: 'official', competition_name: 'World Cup 2026', source: 'tournament-close',
        },
    ];
    for (const r of rows) {
        try { await HistoricalMatch.upsert(r); } catch { /* clave natural duplicada */ }
    }
}

import { Op } from 'sequelize';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import Player from '../../models/Player.js';
import HistoricalMatch from '../../models/HistoricalMatch.js';
import dataProvider from '../providers/index.js';
import { ingestTeamData } from './ingest-team-data.js';
import { computeHeadToHead } from './compute-h2h.js';

/**
 * ENRIQUECIMIENTO AL SIMULAR (4.3 + segunda ingeniería de datos, 13.4 Paso 0).
 *
 * Para un partido A vs B:
 *  1) PRIMERA ingeniería: asegura snapshots frescos de A y B (forma + ranking),
 *     refrescando desde la fuente solo si el TTL venció.
 *  2) SEGUNDA ingeniería (afinado del cruce): calcula ajustes específicos del partido
 *     —disponibilidad del plantel, localía/anfitrión, descanso y contexto, peso por
 *     tipo de partido (ya aplicado en la forma) y confiabilidad del head-to-head—.
 *
 * Devuelve las features afinadas de A y B + los ajustes, listos para el motor.
 *
 * @returns {{ home, away, adjustments, h2h }}
 */
export async function enrichMatch(match, opts = {}) {
    const force = opts.force ?? false;

    const home = await Team.findByPk(match.home_team_id);
    const away = await Team.findByPk(match.away_team_id);
    if (!home || !away) throw new Error('El partido no tiene ambas selecciones definidas');

    // 1) Primera ingeniería: snapshots frescos (refresca solo si venció el TTL).
    const [homeData, awayData] = await Promise.all([
        ingestTeamData(home.id, { force }),
        ingestTeamData(away.id, { force }),
    ]);

    const homeFeatures = { ...homeData.features };
    const awayFeatures = { ...awayData.features };

    // 2) Segunda ingeniería: ajustes específicos del cruce (en goles esperados).
    const [homeAdj, awayAdj] = await Promise.all([
        computeTeamAdjustments(home, match, 'home'),
        computeTeamAdjustments(away, match, 'away'),
    ]);

    // Head-to-head con confiabilidad.
    const h2h = await computeMatchH2H(home, away);

    const venueNeutral = !home.is_host && !away.is_host;

    const adjustments = {
        homeDelta: round3(homeAdj.delta),
        awayDelta: round3(awayAdj.delta),
        h2hGoalDiff: h2h.h2h_goal_diff,
        neutralVenue: venueNeutral,
        breakdown: { home: homeAdj.breakdown, away: awayAdj.breakdown, h2h },
    };

    return { home: homeFeatures, away: awayFeatures, adjustments, h2h };
}

/**
 * Ajustes de fuerza de un equipo para ESTE partido (en goles esperados):
 *  - Disponibilidad del plantel: bajas por lesión/suspensión → pequeño descuento.
 *  - Descanso: días desde su último partido del torneo (poco descanso resta).
 */
async function computeTeamAdjustments(team, match, side) {
    const breakdown = {};
    let delta = 0;

    // Disponibilidad del plantel.
    const totalPlayers = await Player.count({ where: { team_id: team.id } });
    const unavailable = await Player.count({
        where: { team_id: team.id, status: { [Op.in]: ['injured', 'suspended'] } },
    });
    if (totalPlayers > 0 && unavailable > 0) {
        // Hasta −0.25 goles si faltan ~5 jugadores del plantel.
        const penalty = -Math.min(0.25, (unavailable / Math.max(11, totalPlayers)) * 1.5);
        delta += penalty;
        breakdown.availability = { totalPlayers, unavailable, penalty: round3(penalty) };
    }

    // Descanso desde el último partido jugado del torneo.
    const lastPlayed = await Match.findOne({
        where: {
            status: 'finished',
            kickoff_utc: { [Op.lt]: match.kickoff_utc },
            [Op.or]: [{ home_team_id: team.id }, { away_team_id: team.id }],
        },
        order: [['kickoff_utc', 'DESC']],
    });
    if (lastPlayed) {
        const restDays = (new Date(match.kickoff_utc) - new Date(lastPlayed.kickoff_utc)) / (1000 * 3600 * 24);
        if (restDays < 3) {
            const fatigue = -Math.min(0.12, (3 - restDays) * 0.05);
            delta += fatigue;
            breakdown.rest = { restDays: round1(restDays), fatigue: round3(fatigue) };
        } else {
            breakdown.rest = { restDays: round1(restDays), fatigue: 0 };
        }
    }

    return { delta, breakdown };
}

/**
 * Head-to-head del cruce: usa el proveedor (más rico) y cae al histórico de la base.
 * Orienta las filas desde la óptica del local (A).
 */
async function computeMatchH2H(home, away) {
    const homeExt = home.external_ids?.['api-football'];
    const awayExt = away.external_ids?.['api-football'];

    let oriented = [];

    if (homeExt && awayExt) {
        try {
            const raw = await dataProvider.getHeadToHead(homeExt, awayExt, { last: 10 });
            oriented = (raw || []).map(r => {
                const homeIsHome = String(r.home_external_id) === String(homeExt);
                return {
                    date: r.date,
                    goals_for: homeIsHome ? r.home_score : r.away_score,
                    goals_against: homeIsHome ? r.away_score : r.home_score,
                };
            });
        } catch (error) {
            console.warn(`[enrich] h2h proveedor falló: ${error.message}`);
        }
    }

    // Respaldo: histórico de la base por códigos.
    if (oriented.length === 0) {
        const rows = await HistoricalMatch.findAll({
            where: { team_code: home.code, opponent_code: away.code },
            order: [['match_date', 'DESC']],
            limit: 10,
        });
        oriented = rows.map(r => ({
            date: r.match_date,
            goals_for: r.goals_for,
            goals_against: r.goals_against,
        }));
    }

    return computeHeadToHead(oriented);
}

const round3 = (x) => Math.round(x * 1000) / 1000;
const round1 = (x) => Math.round(x * 10) / 10;

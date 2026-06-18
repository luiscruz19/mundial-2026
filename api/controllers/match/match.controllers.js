import { Op } from 'sequelize';
import Match from '../../models/Match.js';
import Team from '../../models/Team.js';
import Venue from '../../models/Venue.js';
import Simulation from '../../models/Simulation.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import { serializeMatch } from '../_serializers.js';

// ==================== LISTA / CALENDARIO ====================
// Todos los partidos del torneo, con filtros opcionales: día, grupo, selección, fase.
export async function list(req, res) {
    try {
        const { day, group, team, stage, status } = req.query;
        const where = {};

        if (group) where.group = group;
        if (stage) where.stage = stage;
        if (status) where.status = status;
        if (team) {
            const teamId = Number(team);
            where[Op.or] = [{ home_team_id: teamId }, { away_team_id: teamId }];
        }
        if (day) {
            // day = YYYY-MM-DD (rango UTC del día). La app ya envía el día local resuelto.
            const start = new Date(`${day}T00:00:00.000Z`);
            const end = new Date(`${day}T23:59:59.999Z`);
            if (!Number.isNaN(start.getTime())) {
                where.kickoff_utc = { [Op.between]: [start, end] };
            }
        }

        const matches = await Match.findAll({
            where,
            order: [['kickoff_utc', 'ASC']],
            include: [
                { model: Team, as: 'homeTeam', required: false },
                { model: Team, as: 'awayTeam', required: false },
                { model: Venue, as: 'venue', required: false },
            ],
        });

        // Adjuntar simulación (si existe) a cada partido.
        const ids = matches.map(m => m.id);
        const sims = ids.length ? await Simulation.findAll({ where: { match_id: { [Op.in]: ids } } }) : [];
        const simByMatch = new Map(sims.map(s => [s.match_id, s]));

        const data = matches.map(m => serializeMatch(m, { simulation: simByMatch.get(m.id) || null }));
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al listar los partidos', extra: { error: error.message } }));
    }
}

// ==================== DETALLE DE PARTIDO ====================
export async function view(req, res) {
    try {
        const match = await Match.findByPk(req.params.id, {
            include: [
                { model: Team, as: 'homeTeam', required: false },
                { model: Team, as: 'awayTeam', required: false },
                { model: Venue, as: 'venue', required: false },
            ],
        });
        if (!match) return res.status(404).json(errorMessage({ message: 'Partido no encontrado' }));

        const simulation = await Simulation.findOne({
            where: { match_id: match.id },
            order: [['computed_at', 'DESC']],
        });

        // Últimos partidos del Mundial de cada selección (para Oficial y simulador).
        const [home_recent, away_recent] = await Promise.all([
            recentTournamentMatches(match.home_team_id, match.id),
            recentTournamentMatches(match.away_team_id, match.id),
        ]);

        const data = {
            match: serializeMatch(match, { simulation: simulation || null }),
            home_recent,
            away_recent,
        };
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener el partido', extra: { error: error.message } }));
    }
}

/**
 * Últimos partidos jugados del Mundial de una selección (máx. 5), orientados desde su
 * óptica: rival, goles a favor/en contra y resultado. Alimenta "últimos resultados en
 * este Mundial y contra quién" en la vista de partido y el simulador.
 */
async function recentTournamentMatches(teamId, excludeMatchId, limit = 5) {
    if (!teamId) return [];
    const matches = await Match.findAll({
        where: {
            status: 'finished',
            id: { [Op.ne]: excludeMatchId },
            [Op.or]: [{ home_team_id: teamId }, { away_team_id: teamId }],
        },
        order: [['kickoff_utc', 'DESC']],
        limit,
        include: [
            { model: Team, as: 'homeTeam', required: false },
            { model: Team, as: 'awayTeam', required: false },
        ],
    });
    return matches.map(m => {
        const isHome = m.home_team_id === teamId;
        const opponent = isHome ? m.awayTeam : m.homeTeam;
        const gf = isHome ? m.home_score : m.away_score;
        const ga = isHome ? m.away_score : m.home_score;
        return {
            match_id: m.id,
            date: m.kickoff_utc,
            stage: m.stage,
            group: m.group,
            opponent_code: opponent?.code ?? null,
            opponent_name: opponent?.name ?? null,
            goals_for: gf,
            goals_against: ga,
            result: gf > ga ? 'W' : gf < ga ? 'L' : 'D',
        };
    });
}

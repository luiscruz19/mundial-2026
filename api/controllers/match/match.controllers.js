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

        const data = { match: serializeMatch(match, { simulation: simulation || null }) };
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener el partido', extra: { error: error.message } }));
    }
}

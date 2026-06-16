import { Op } from 'sequelize';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import Venue from '../../models/Venue.js';
import Standing from '../../models/Standing.js';
import Simulation from '../../models/Simulation.js';
import Player from '../../models/Player.js';
import HistoricalMatch from '../../models/HistoricalMatch.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import { serializeTeam, serializeMatch, serializeSimulation } from '../_serializers.js';

// ==================== LISTA DE SELECCIONES ====================
export async function list(req, res) {
    try {
        const teams = await Team.findAll({
            order: [['group', 'ASC'], ['group_position', 'ASC'], ['fifa_rank', 'ASC'], ['name', 'ASC']],
        });
        return res.status(200).json(successMessage({ extra: { data: teams.map(serializeTeam) } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al listar las selecciones', extra: { error: error.message } }));
    }
}

// ==================== DETALLE DE SELECCIÓN ====================
// Página de la selección (3.3): sus partidos con resultado oficial y, si se simuló,
// el simulado al lado; su grupo y su posición. Independiente de las simulaciones.
export async function view(req, res) {
    try {
        const team = await Team.findByPk(req.params.id);
        if (!team) return res.status(404).json(errorMessage({ message: 'Selección no encontrada' }));

        const matches = await Match.findAll({
            where: { [Op.or]: [{ home_team_id: team.id }, { away_team_id: team.id }] },
            order: [['kickoff_utc', 'ASC']],
            include: [
                { model: Team, as: 'homeTeam', required: false },
                { model: Team, as: 'awayTeam', required: false },
                { model: Venue, as: 'venue', required: false },
            ],
        });

        const matchIds = matches.map(m => m.id);
        const sims = matchIds.length
            ? await Simulation.findAll({ where: { match_id: { [Op.in]: matchIds } } })
            : [];
        const simByMatch = new Map(sims.map(s => [s.match_id, s]));

        const standing = await Standing.findOne({ where: { team_id: team.id } });

        // Plantel (para la página de selección).
        const players = await Player.findAll({
            where: { team_id: team.id },
            order: [['shirt_number', 'ASC'], ['name', 'ASC']],
            limit: 30,
        });

        // Forma reciente: últimos resultados oficiales (W/D/L) desde el histórico.
        const history = await HistoricalMatch.findAll({
            where: { team_id: team.id },
            order: [['match_date', 'DESC']],
            limit: 5,
        });
        const recent = history.map(h => ({
            date: h.match_date,
            opponent_code: h.opponent_code,
            opponent_name: h.opponent_name,
            goals_for: h.goals_for,
            goals_against: h.goals_against,
            result: h.goals_for > h.goals_against ? 'W' : h.goals_for < h.goals_against ? 'L' : 'D',
        }));

        const data = {
            team: serializeTeam(team),
            standing: standing ? standingRow(standing, team) : null,
            matches: matches.map(m => serializeMatch(m, { simulation: simByMatch.get(m.id) || null })),
            players: players.map(p => ({
                id: p.id, name: p.name, position: p.position,
                shirt_number: p.shirt_number, club: p.club, status: p.status,
            })),
            recent,
        };
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener la selección', extra: { error: error.message } }));
    }
}

function standingRow(s, team) {
    return {
        group: s.group, team: serializeTeam(team),
        played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
        goals_for: s.goals_for, goals_against: s.goals_against,
        goal_difference: s.goal_difference, points: s.points, position: s.position,
    };
}

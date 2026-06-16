import Standing from '../../models/Standing.js';
import Team from '../../models/Team.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import { serializeTeam } from '../_serializers.js';

// ==================== TABLAS DE POSICIONES (12 grupos) ====================
export async function list(req, res) {
    try {
        const standings = await Standing.findAll({
            include: [{ model: Team, as: 'team', required: false }],
            order: [['group', 'ASC'], ['position', 'ASC']],
        });

        const byGroup = {};
        for (const s of standings) {
            const g = s.group;
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push({
                team: serializeTeam(s.team),
                played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
                gf: s.goals_for, ga: s.goals_against, gd: s.goal_difference,
                points: s.points, position: s.position,
            });
        }

        const data = Object.keys(byGroup).sort().map(group => ({ group, rows: byGroup[group] }));
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener las posiciones', extra: { error: error.message } }));
    }
}

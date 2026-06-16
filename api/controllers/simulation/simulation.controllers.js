import Simulation from '../../models/Simulation.js';
import { runSimulation } from '../../services/simulation/run-simulation.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import { serializeSimulation } from '../_serializers.js';

// ==================== SIMULAR UN PARTIDO ====================
// Enriquecimiento bajo demanda + motor. Guarda la simulación atada al partido.
export async function create(req, res) {
    try {
        const matchId = Number(req.body.match_id);
        const force = req.body.force === true || req.body.force === 'true';

        const { simulation } = await runSimulation(matchId, { force });
        return res.status(200).json(successMessage({
            message: 'Simulación calculada',
            extra: { data: { simulation: serializeSimulation(simulation) } },
        }));
    } catch (error) {
        const map = {
            MATCH_NOT_FOUND: 404,
            MATCH_ALREADY_PLAYED: 409,
            MATCH_NOT_READY: 409,
        };
        const status = map[error.code] || 500;
        return res.status(status).json(errorMessage({ message: error.message || 'Error al simular', extra: { error: error.message } }));
    }
}

// ==================== VER SIMULACIÓN GUARDADA ====================
export async function getByMatch(req, res) {
    try {
        const simulation = await Simulation.findOne({
            where: { match_id: Number(req.params.matchId) },
            order: [['computed_at', 'DESC']],
        });
        if (!simulation) return res.status(404).json(errorMessage({ message: 'No hay una simulación guardada para este partido' }));
        return res.status(200).json(successMessage({ extra: { data: serializeSimulation(simulation) } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener la simulación', extra: { error: error.message } }));
    }
}

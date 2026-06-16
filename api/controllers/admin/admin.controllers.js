import { JOB_RUNNERS } from '../../jobs/index.js';
import { seedTournament } from '../../services/etl/seed-tournament.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

// ==================== DISPARO MANUAL DE UN JOB ====================
export async function triggerJob(req, res) {
    const name = req.params.name;
    const runner = JOB_RUNNERS[name];
    if (!runner) {
        return res.status(404).json(errorMessage({ message: `Job '${name}' no encontrado`, extra: { available: Object.keys(JOB_RUNNERS) } }));
    }
    try {
        const result = await runner();
        return res.status(200).json(successMessage({ message: `Job '${name}' ejecutado`, extra: { data: result } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: `Error al ejecutar '${name}'`, extra: { error: error.message } }));
    }
}

// ==================== CARGA INICIAL DEL TORNEO ====================
export async function seed(req, res) {
    try {
        const summary = await seedTournament();
        return res.status(200).json(successMessage({ message: 'Carga inicial completada', extra: { data: summary } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error en la carga inicial', extra: { error: error.message } }));
    }
}

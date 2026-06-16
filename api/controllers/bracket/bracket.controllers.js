import { getBracket } from '../../services/etl/bracket.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import { serializeMatch } from '../_serializers.js';

// ==================== LLAVE / FASE FINAL ====================
export async function get(req, res) {
    try {
        const rounds = await getBracket();
        const data = rounds.map(r => ({
            round: r.round,
            stage: r.stage,
            matches: r.matches.map(m => serializeMatch(m)),
        }));
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener la llave', extra: { error: error.message } }));
    }
}

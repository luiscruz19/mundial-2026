import CONFIG from '../config/config.js';
import { errorMessage } from '../utils/messages.js';

/**
 * Protege los endpoints administrativos (disparo manual de jobs / carga inicial).
 * Espera el header `x-cron-secret` igual a CONFIG.CRON_SECRET.
 * No es auth de usuario (la app es device-anónima): es un secreto de operación.
 */
export default (req, res, next) => {
    const secret = req.headers['x-cron-secret'];
    if (!CONFIG.CRON_SECRET || secret !== CONFIG.CRON_SECRET) {
        return res.status(401).json(errorMessage({ message: 'No autorizado.' }));
    }
    return next();
};

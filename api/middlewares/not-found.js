import { errorMessage } from '../utils/messages.js';

/**
 * 404 — debe registrarse como último middleware de la app.
 */
const notFound = (req, res) => {
    return res.status(404).json(errorMessage({
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    }));
};

export default notFound;

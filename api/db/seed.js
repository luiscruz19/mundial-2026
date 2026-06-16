import sequelize from './sequelize.js';
import '../models/index.js';
import { seedTournament } from '../services/etl/seed-tournament.js';

/**
 * Carga inicial del torneo (13.1/13.2). Idempotente: se puede re-correr.
 * Uso (dentro del contenedor): node db/seed.js   ·   o `make seed`.
 */
(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });

        const summary = await seedTournament();

        console.info('\nResumen del seed:', JSON.stringify(summary, null, 2));
        console.info('\nSeed completado.');
        process.exit(0);
    } catch (error) {
        console.error('Error en el seed:', error);
        process.exit(1);
    }
})();

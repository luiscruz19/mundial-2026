import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';
import '../models/index.js';
import { refreshEloRatings } from '../services/etl/refresh-elo-ratings.js';

/**
 * Migración puntual para el motor v2 (Elo). Idempotente y no destructiva:
 *  1) agrega las columnas `elo` / `elo_updated_at` a `teams` si no existen
 *     (en producción el sync es alter:false, así que no se crean solas);
 *  2) calcula y persiste el Elo de las 48 desde el dataset internacional real.
 *
 * Uso (dentro del contenedor):  node db/migrate-elo.js
 */
(async () => {
    try {
        await sequelize.authenticate();
        const qi = sequelize.getQueryInterface();
        const table = await qi.describeTable('teams');

        if (!table.elo) {
            await qi.addColumn('teams', 'elo', { type: DataTypes.DECIMAL(7, 2), allowNull: true });
            console.info('+ columna teams.elo agregada');
        } else {
            console.info('= columna teams.elo ya existía');
        }
        if (!table.elo_updated_at) {
            await qi.addColumn('teams', 'elo_updated_at', { type: DataTypes.DATE, allowNull: true });
            console.info('+ columna teams.elo_updated_at agregada');
        } else {
            console.info('= columna teams.elo_updated_at ya existía');
        }

        const res = await refreshEloRatings({ log: (m) => console.info(`  ${m}`) });
        console.info('Elo poblado:', JSON.stringify(res));
        console.info('Migración Elo completada.');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración Elo:', error);
        process.exit(1);
    }
})();

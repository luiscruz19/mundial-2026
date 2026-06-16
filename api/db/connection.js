import sequelize from './sequelize.js';
// Importa todos los modelos y registra sus asociaciones en la instancia.
import '../models/index.js';

/**
 * Conecta y sincroniza el esquema al arrancar.
 *  - desarrollo: alter:true (ajusta tablas existentes a los modelos).
 *  - producción: alter:false (solo crea tablas nuevas, no modifica las existentes).
 */
(async () => {
    try {
        await sequelize.authenticate();
        console.info('Conexión a la base de datos establecida correctamente');

        const isProduction = process.env.NODE_ENV === 'production';
        await sequelize.sync({ alter: !isProduction });

        console.info(
            `Modelos sincronizados (${isProduction ? 'producción: solo crear' : 'desarrollo: alter'})`
        );
    } catch (error) {
        console.error('No se pudo conectar/sincronizar la base de datos:', error.message);
    }
})();

export default sequelize;

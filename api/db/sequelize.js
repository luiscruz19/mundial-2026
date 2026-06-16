import { Sequelize } from 'sequelize';
import CONFIG from '../config/config.js';

const { DATABASE: { HOST, USER, PASSWORD, NAME, PORT, DIALECT } } = CONFIG;

const sequelize = new Sequelize(NAME, USER, PASSWORD, {
    host: HOST,
    port: PORT,
    dialect: DIALECT,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    retry: {
        max: 3,
        timeout: 3000,
        match: [
            /ECONNRESET/,
            /ER_LOCK_WAIT_TIMEOUT/,
            /ER_LOCK_DEADLOCK/,
            /ETIMEDOUT/,
            /ENOTFOUND/,
            /ConnectionError/,
            /ConnectionRefusedError/,
            /ConnectionTimedOutError/,
            /TimeoutError/
        ]
    },
    logging: process.env.NODE_ENV === 'development' ? false : false,
    // Los horarios se guardan en UTC; la app los convierte a la hora local del usuario.
    timezone: '+00:00',
    dialectOptions: {
        connectTimeout: 60000
    }
});

export default sequelize;

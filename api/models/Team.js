import { DataTypes } from 'sequelize';
import messages from '../config/messages.js';
import sequelize from '../db/sequelize.js';

/**
 * Selección nacional (una de las 48 del Mundial 2026).
 * Guarda el ancla de fuerza del modelo: los puntos del ranking FIFA, y la `form`
 * (forma reciente con decaimiento) derivada por la ingeniería de datos.
 * `external_ids` mapea los IDs de cada proveedor para no atarse a uno solo.
 */
const Team = sequelize.define('teams', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.team.fields_empty.name },
        },
    },
    code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.team.fields_empty.code },
        },
        comment: 'Código FIFA de 3 letras (ARG, BRA, USA...). Clave natural para upsert'
    },
    confederation: {
        type: DataTypes.ENUM('UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'),
        allowNull: true,
    },
    group: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: 'Grupo del Mundial (A..L). Null hasta que se confirma el sorteo'
    },
    group_position: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Posición actual en el grupo (1..4), recalculada al cierre de cada partido'
    },
    fifa_points: {
        type: DataTypes.DECIMAL(7, 2),
        allowNull: true,
        comment: 'Puntos del ranking FIFA: el ancla de fuerza del modelo'
    },
    fifa_rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Posición en el ranking FIFA'
    },
    fifa_points_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    elo: {
        type: DataTypes.DECIMAL(7, 2),
        allowNull: true,
        comment: 'Puntuación Elo (World Football Elo) derivada de resultados reales: ancla principal del modelo'
    },
    elo_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    is_host: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'EE.UU., Canadá y México: juegan de local (ventaja de anfitrión)'
    },
    flag_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    form: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Forma derivada: { attack, defense, rating, sample, decayed_gf, decayed_ga }'
    },
    external_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Mapa de IDs por proveedor, ej: { "api-football": 26, "football-data": 762 }'
    },
}, {
    tableName: 'teams',
    timestamps: true,
    paranoid: true,
    indexes: [
        { unique: true, fields: ['code'], name: 'teams_code' },
        { fields: ['group'] },
    ],
});

export default Team;

import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Jugador del plantel de una selección. Las alineaciones de cada partido
 * referencian estos jugadores. Los planteles se confirman poco antes del
 * torneo, por eso el paso de carga es re-corrible (upsert por team_id + name).
 */
const Player = sequelize.define('players', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    position: {
        type: DataTypes.ENUM('GK', 'DF', 'MF', 'FW'),
        allowNull: true,
        comment: 'Arquero / Defensor / Mediocampista / Delantero'
    },
    shirt_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    club: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('available', 'injured', 'suspended'),
        allowNull: false,
        defaultValue: 'available',
        comment: 'Disponibilidad para la segunda ingeniería de datos (ajuste de fuerza)'
    },
    external_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'players',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['team_id'] },
    ],
});

export default Player;

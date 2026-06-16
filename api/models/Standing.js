import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Fila de la tabla de posiciones de un grupo. Se recalcula al cierre de cada
 * partido (13.3). Es derivable de los partidos, pero se materializa para que las
 * pantallas la lean directo sin recomputar. Clave natural: group + team_id.
 */
const Standing = sequelize.define('standings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    group: {
        type: DataTypes.STRING(2),
        allowNull: false,
    },
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    played: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    won: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    drawn: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    goals_for: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    goals_against: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    goal_difference: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    position: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Posición dentro del grupo (1..4)'
    },
}, {
    tableName: 'standings',
    timestamps: true,
    indexes: [
        { fields: ['group'] },
        { unique: true, fields: ['group', 'team_id'], name: 'standings_group_team' },
    ],
});

export default Standing;

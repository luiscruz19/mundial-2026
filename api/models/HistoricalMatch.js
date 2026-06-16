import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Partido oficial pasado de una selección. Alimenta la FORMA (con decaimiento)
 * y el HEAD-TO-HEAD. El histórico no cambia: se cachea fuerte y no se vuelve a pedir.
 * Cada partido jugado del torneo se agrega acá al cerrarse (13.3), mejorando la forma.
 * Clave natural para upsert idempotente: team_code + opponent_code + match_date.
 */
const HistoricalMatch = sequelize.define('historical_matches', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Selección dueña de esta fila (puede ser null si aún no está en la base)'
    },
    team_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        comment: 'Código FIFA de la selección (clave natural)'
    },
    opponent_code: {
        type: DataTypes.STRING(3),
        allowNull: true,
    },
    opponent_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    match_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    goals_for: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    goals_against: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    condition: {
        type: DataTypes.ENUM('home', 'away', 'neutral'),
        allowNull: false,
        defaultValue: 'neutral',
    },
    competition_type: {
        type: DataTypes.ENUM('official', 'friendly'),
        allowNull: false,
        defaultValue: 'official',
        comment: 'Los amistosos pesan menos que los oficiales en la forma (13.4)'
    },
    competition_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    source: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Proveedor/origen del dato (csv, api-football, tournament-close...)'
    },
}, {
    tableName: 'historical_matches',
    timestamps: true,
    indexes: [
        { fields: ['team_id'] },
        { fields: ['team_code'] },
        { fields: ['opponent_code'] },
        { fields: ['match_date'] },
        { unique: true, fields: ['team_code', 'opponent_code', 'match_date'], name: 'hist_natural_key' },
    ],
});

export default HistoricalMatch;

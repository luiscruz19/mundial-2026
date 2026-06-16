import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Pivote: selecciones de interés de un dispositivo (N:M device ↔ team).
 * Habilita los avisos y el destacado en el calendario. Permite la query inversa
 * eficiente "qué dispositivos siguen a la selección X" al programar notificaciones.
 */
const DeviceTeam = sequelize.define('device_teams', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'device_teams',
    timestamps: true,
    indexes: [
        { fields: ['device_id'] },
        { fields: ['team_id'] },
        { unique: true, fields: ['device_id', 'team_id'], name: 'device_teams_unique' },
    ],
});

export default DeviceTeam;

import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Foto de datos por selección: features ya calculadas (ranking, forma, etc.) y
 * los últimos partidos usados, con su fecha de actualización y vencimiento (TTL).
 * El enriquecimiento bajo demanda (4.3) verifica si esta foto está vigente antes
 * de volver a pegarle a la fuente. Se complementa con el cache en Redis (más rápido);
 * acá queda la persistencia/auditoría. Clave natural: team_id.
 */
const TeamSnapshot = sequelize.define('team_snapshots', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    features: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Features calculadas: { fifa_points, form:{attack,defense,rating}, recent:[...] }'
    },
    recent_matches_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    updated_at_snapshot: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Cuándo se calculó esta foto'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Vencimiento del snapshot (TTL). Vencida = refrescar al simular'
    },
}, {
    tableName: 'team_snapshots',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['team_id'], name: 'team_snapshots_team' },
        { fields: ['expires_at'] },
    ],
});

export default TeamSnapshot;

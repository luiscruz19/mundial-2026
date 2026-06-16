import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Simulación de un partido. Queda asociada al partido para mostrar después el
 * resultado oficial y el simulado juntos (13.5). Guarda los parámetros usados,
 * la salida del motor y la "foto de datos" (snapshot) con la que se calculó.
 * Solo se simulan partidos por jugarse; no se re-simula un partido ya jugado.
 */
const Simulation = sequelize.define('simulations', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    home_team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    away_team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    params: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Parámetros del modelo usados (k, totalGoles, rho, vidaMedia, ventajaLocal...)'
    },
    output: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Salida: { most_likely_score, win_prob:{home,draw,away}, expected_goals, scoreline_ranking }'
    },
    data_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Foto de datos (features de A y B) usada para calcular'
    },
    computed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    // Comparación oficial vs simulado, completada al cierre del partido (13.5).
    comparison: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Al cerrar: { official:{home,away}, predicted_result_hit, exact_score_hit }'
    },
}, {
    tableName: 'simulations',
    timestamps: true,
    indexes: [
        { fields: ['match_id'] },
        { fields: ['home_team_id'] },
        { fields: ['away_team_id'] },
    ],
});

export default Simulation;

import { DataTypes } from 'sequelize';
import messages from '../config/messages.js';
import sequelize from '../db/sequelize.js';

/**
 * Partido / fixture del Mundial. La hora se guarda en UTC (`kickoff_utc`) y la app
 * la convierte a la hora local del usuario. El marcador en vivo es provisorio
 * (`live`); el resultado oficial, las alineaciones y los goleadores se consolidan
 * al finalizar (status = finished). En la fase final los equipos pueden estar
 * "por definir": se usan `home_placeholder` / `away_placeholder` hasta resolverse.
 */
const Match = sequelize.define('matches', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    stage: {
        type: DataTypes.ENUM(
            'group', 'round_of_32', 'round_of_16',
            'quarter_final', 'semi_final', 'third_place', 'final'
        ),
        allowNull: false,
        defaultValue: 'group',
        validate: {
            notNull: { msg: messages.error.match.fields_empty.status },
            isIn: {
                args: [['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']],
                msg: messages.generic.invalid_enum_value,
            },
        },
    },
    group: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: 'Grupo (A..L) para los 72 partidos de la fase de grupos'
    },
    matchday: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Jornada dentro de la fase de grupos (1..3)'
    },
    bracket_slot: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Identificador de la posición en la llave, ej: "R32-1", "QF-2", "F"'
    },
    home_team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Null = por definir (fase final aún sin resolver el cruce)'
    },
    away_team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    home_placeholder: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Etiqueta de origen mientras el rival está por definir, ej: "1A", "Ganador R32-1"'
    },
    away_placeholder: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    kickoff_utc: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.match.fields_empty.kickoff_utc },
        },
        comment: 'Fecha y hora del partido en UTC'
    },
    venue_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'finished'),
        allowNull: false,
        defaultValue: 'scheduled',
        validate: {
            notNull: { msg: messages.error.match.fields_empty.status },
            isIn: {
                args: [['scheduled', 'live', 'finished']],
                msg: messages.generic.invalid_enum_value,
            },
        },
        comment: 'scheduled = programado; live = en juego (provisorio); finished = consolidado'
    },
    home_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Resultado oficial (se consolida al finalizar)'
    },
    away_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    home_penalties: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Penales en fase final (si el partido se definió así)'
    },
    away_penalties: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    home_lineup: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Formación/alineación del local: { formation, players:[{id,name,number,pos}] }'
    },
    away_lineup: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    goals: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Goleadores: [{ minute, team:"home"|"away", player }]'
    },
    live: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Capa en vivo provisoria: { minute, period, home_score, away_score, updated_at }'
    },
    external_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Mapa de IDs por proveedor'
    },
}, {
    tableName: 'matches',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['stage'] },
        { fields: ['group'] },
        { fields: ['status'] },
        { fields: ['kickoff_utc'] },
        { fields: ['home_team_id'] },
        { fields: ['away_team_id'] },
        { fields: ['bracket_slot'] },
    ],
});

export default Match;

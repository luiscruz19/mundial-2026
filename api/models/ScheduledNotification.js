import { DataTypes } from 'sequelize';
import messages from '../config/messages.js';
import sequelize from '../db/sequelize.js';

/**
 * Notificación programada para un dispositivo sobre un partido de una de sus
 * selecciones de interés. El planificador (4.5) crea estas filas a partir del
 * calendario y su configuración; el job de envío las despacha cuando llega su
 * momento. Guarda el historial e idempotencia (no reprogramar lo ya creado).
 */
const ScheduledNotification = sequelize.define('scheduled_notifications', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.notification.fields_empty.device_id },
        },
    },
    match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Selección de interés que motivó el aviso'
    },
    type: {
        type: DataTypes.ENUM('reminder_day', 'reminder_hour', 'match_start', 'goal', 'final_result'),
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.notification.fields_empty.type },
            isIn: {
                args: [['reminder_day', 'reminder_hour', 'match_start', 'goal', 'final_result']],
                msg: messages.generic.invalid_enum_value,
            },
        },
    },
    scheduled_for: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Momento de envío (UTC). Los avisos de gol se disparan en vivo, sin fecha previa'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    body: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    payload: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Datos extra para el deep-link (ej: { match_id })'
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'sent', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
        validate: {
            isIn: {
                args: [['scheduled', 'sent', 'failed', 'cancelled']],
                msg: messages.generic.invalid_enum_value,
            },
        },
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    dedupe_key: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Clave de idempotencia, ej: "device:5:match:12:reminder_hour" o "...:goal:2-1"'
    },
}, {
    tableName: 'scheduled_notifications',
    timestamps: true,
    indexes: [
        { fields: ['device_id'] },
        { fields: ['match_id'] },
        { fields: ['status'] },
        { fields: ['scheduled_for'] },
        { unique: true, fields: ['dedupe_key'], name: 'sched_notif_dedupe' },
    ],
});

export default ScheduledNotification;

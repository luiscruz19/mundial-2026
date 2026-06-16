import { DataTypes } from 'sequelize';
import messages from '../config/messages.js';
import sequelize from '../db/sequelize.js';

/**
 * Identidad de dispositivo (anónima). En el MVP alcanza con esto: al instalar,
 * la app registra su token de push y guarda sus preferencias. No hay cuentas ni
 * login. Las selecciones de interés viven en la tabla pivote device_teams; las
 * preferencias de notificación, como JSON en `notifications`.
 */
const Device = sequelize.define('devices', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    device_uuid: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.device.fields_empty.device_uuid },
        },
        comment: 'Identificador anónimo generado por la app al instalar'
    },
    push_token: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Expo push token (por debajo usa FCM en Android y APNs en iOS)'
    },
    platform: {
        type: DataTypes.ENUM('ios', 'android', 'web'),
        allowNull: true,
    },
    timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'UTC',
        comment: 'Zona horaria del usuario para mostrar los horarios (autodetectable)'
    },
    theme: {
        type: DataTypes.ENUM('light', 'dark', 'system'),
        allowNull: false,
        defaultValue: 'system',
    },
    language: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: 'es',
    },
    notifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            reminder_day: true,
            reminder_hour: true,
            match_start: true,
            goal: true,
            final_result: true,
        },
        comment: 'Qué avisos quiere recibir para sus selecciones de interés'
    },
    onboarding_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: DataTypes.ENUM('active', 'revoked'),
        allowNull: false,
        defaultValue: 'active',
        validate: {
            isIn: {
                args: [['active', 'revoked']],
                msg: messages.generic.invalid_enum_value,
            },
        },
    },
    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'devices',
    timestamps: true,
    paranoid: true,
    indexes: [
        { unique: true, fields: ['device_uuid'], name: 'devices_device_uuid' },
        { fields: ['status'] },
    ],
});

export default Device;

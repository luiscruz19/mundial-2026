import { body, query } from 'express-validator';

export const registerDeviceValidation = [
    body('device_uuid').notEmpty().withMessage('El identificador del dispositivo es obligatorio'),
    body('platform').optional({ nullable: true }).isIn(['ios', 'android', 'web']).withMessage('Plataforma no válida'),
];

export const updatePushTokenValidation = [
    body('device_uuid').notEmpty().withMessage('El identificador del dispositivo es obligatorio'),
    body('push_token').notEmpty().withMessage('El push token es obligatorio'),
];

export const getMeValidation = [
    query('device_uuid').notEmpty().withMessage('El identificador del dispositivo es obligatorio'),
];

export const preferencesValidation = [
    body('device_uuid').notEmpty().withMessage('El identificador del dispositivo es obligatorio'),
    body('teams_of_interest').optional({ nullable: true }).isArray().withMessage('teams_of_interest debe ser una lista'),
    body('notifications').optional({ nullable: true }).isObject().withMessage('notifications debe ser un objeto'),
    body('theme').optional({ nullable: true }).isIn(['light', 'dark', 'system']).withMessage('Tema no válido'),
];

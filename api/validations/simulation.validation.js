import { body, param } from 'express-validator';

export const createSimulationValidation = [
    body('match_id')
        .notEmpty().withMessage('El partido es obligatorio')
        .isInt().withMessage('El partido debe ser un ID válido'),
];

export const matchIdParamValidation = [
    param('matchId').isInt().withMessage('El partido debe ser un ID válido'),
];

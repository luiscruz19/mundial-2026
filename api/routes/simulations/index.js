import { Router } from 'express';
import { create, getByMatch } from '../../controllers/simulation/simulation.controllers.js';
import { createSimulationValidation, matchIdParamValidation } from '../../validations/simulation.validation.js';
import { validate } from '../../utils/helpers.js';

const simulations = Router();

simulations.post('/', validate(createSimulationValidation), create);
simulations.get('/:matchId', validate(matchIdParamValidation), getByMatch);

export default simulations;

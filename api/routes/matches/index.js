import { Router } from 'express';
import { list, view } from '../../controllers/match/match.controllers.js';

const matches = Router();

matches.get('/', list);
matches.get('/:id', view);

export default matches;

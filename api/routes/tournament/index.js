import { Router } from 'express';
import { projection } from '../../controllers/tournament/tournament.controllers.js';

const tournament = Router();

tournament.get('/projection', projection);

export default tournament;

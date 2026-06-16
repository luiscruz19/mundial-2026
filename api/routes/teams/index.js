import { Router } from 'express';
import { list, view } from '../../controllers/team/team.controllers.js';

const teams = Router();

teams.get('/', list);
teams.get('/:id', view);

export default teams;

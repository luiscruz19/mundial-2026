import { Router } from 'express';
import { list } from '../../controllers/standing/standing.controllers.js';

const standings = Router();

standings.get('/', list);

export default standings;

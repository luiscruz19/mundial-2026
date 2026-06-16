import { Router } from 'express';
import { get } from '../../controllers/bracket/bracket.controllers.js';

const bracket = Router();

bracket.get('/', get);

export default bracket;

import { Router } from 'express';
import teams from './teams/index.js';
import matches from './matches/index.js';
import standings from './standings/index.js';
import bracket from './bracket/index.js';
import simulations from './simulations/index.js';
import tournament from './tournament/index.js';
import devices from './devices/index.js';
import admin from './admin/index.js';

const api = Router();

api.get('/', (req, res) => res.json({ status: 1, service: 'mundial-api' }));

api.use('/teams', teams);
api.use('/matches', matches);
api.use('/standings', standings);
api.use('/bracket', bracket);
api.use('/simulations', simulations);
api.use('/tournament', tournament);
api.use('/devices', devices);
api.use('/admin', admin);

export default api;

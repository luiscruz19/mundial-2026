import { Router } from 'express';
import { triggerJob, seed } from '../../controllers/admin/admin.controllers.js';
import cronAuth from '../../middlewares/cron-auth.js';

const admin = Router();

// Protegido por x-cron-secret (operación, no auth de usuario).
admin.use(cronAuth);

admin.post('/seed', seed);
admin.post('/jobs/:name/trigger', triggerJob);

export default admin;

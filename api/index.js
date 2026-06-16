import app from './www/app.js';
import './db/connection.js';
import './jobs/index.js';
import CONFIG from './config/config.js';

const PORT = CONFIG.PORT;

app.listen(PORT, () => {
    console.info('');
    console.info('-'.repeat(80));
    console.info(`API del Mundial 2026 corriendo en "http://localhost:${PORT}"`);
    console.info('-'.repeat(80));
    console.info('');
});

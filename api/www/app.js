import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import notFound from '../middlewares/not-found.js';
import routes from '../routes/index.js';

const app = express();

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());

app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'mundial-api' });
});

// 404 — último middleware
app.use(notFound);

export default app;

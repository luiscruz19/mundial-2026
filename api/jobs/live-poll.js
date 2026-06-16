import cron from 'node-cron';
import CONFIG from '../config/config.js';
import { getMatchesInLiveWindow, pollLiveMatch } from '../services/live/live-feed.js';

/**
 * Sondeo EN VIVO (13.6). Dentro de la ventana de un partido, consulta el feed con
 * más frecuencia (~30-60s) y actualiza el marcador provisorio; ante un gol nuevo,
 * notifica. Requiere un feed en tiempo real (plan pago) o, con límites, el sondeo
 * acotado gratis configurado acá. Se puede apagar con LIVE_ENABLED=false.
 */
let running = false;

export async function runLivePoll() {
    if (running) return { skipped: 'corrida anterior en curso' };
    running = true;
    try {
        const matches = await getMatchesInLiveWindow();
        let goals = 0;
        for (const match of matches) {
            const r = await pollLiveMatch(match);
            goals += r.goals || 0;
        }
        if (matches.length > 0) console.info(`[live-poll] ${matches.length} partido(s) en ventana, ${goals} gol(es) notificados`);
        return { matches: matches.length, goals };
    } finally {
        running = false;
    }
}

export default function scheduleLivePoll() {
    if (!CONFIG.LIVE.ENABLED) {
        console.info('[live-poll] deshabilitado (LIVE_ENABLED=false)');
        return;
    }
    // node-cron no soporta segundos con buena resolución para <1min de forma estándar;
    // usamos un setInterval acotado por LIVE_POLL_SECONDS. La función internamente solo
    // actúa si hay partidos en ventana, así que fuera de horario es casi gratis.
    const seconds = Math.max(20, CONFIG.LIVE.POLL_SECONDS);
    setInterval(() => {
        runLivePoll().catch(e => console.error('[live-poll]', e.message));
    }, seconds * 1000);
    console.info(`[live-poll] programado cada ${seconds}s (solo actúa en ventana de partido)`);
}

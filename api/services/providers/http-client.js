import { withBackoff, sleep } from '../../utils/helpers.js';

/**
 * Cliente HTTP para las fuentes externas. Todas las llamadas usan reintentos con
 * espera progresiva (backoff) — sección 9: confiabilidad. La base de datos es la
 * fuente de verdad; si la fuente falla tras los reintentos, se propaga el error y
 * el llamador decide (normalmente: seguir con lo que ya hay en la base).
 */
export async function fetchJson(url, { headers = {}, method = 'GET', body = null, retries = 3, label = 'http', timeoutMs = 15000 } = {}) {
    return withBackoff(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            // Aviso temprano de cupo bajo (football-data: X-Requests-Available-Minute).
            const available = res.headers.get('X-Requests-Available-Minute');
            if (available !== null && Number(available) <= 1) {
                console.warn(`[http:${label}] cupo de requests bajo este minuto: ${available}`);
            }
            if (res.status === 429) {
                // Rate limit: respetar el reset que indica el proveedor antes de reintentar.
                const resetSeconds = Number(
                    res.headers.get('X-RequestCounter-Reset') ||
                    res.headers.get('Retry-After') ||
                    6
                );
                const waitMs = Math.min(Math.max(resetSeconds, 1), 60) * 1000;
                console.warn(`[http:${label}] 429 rate limit; esperando ${Math.round(waitMs / 1000)}s`);
                await sleep(waitMs);
                throw new Error(`rate limit (429) en ${label}`);
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                const err = new Error(`${label} respondió ${res.status}: ${text.slice(0, 200)}`);
                err.status = res.status;
                // 4xx (salvo 429) no se reintenta: el backoff solo reintenta lo lanzado.
                if (res.status >= 400 && res.status < 500) {
                    err.noRetry = true;
                    throw Object.assign(err, { _terminal: true });
                }
                throw err;
            }
            return await res.json();
        } finally {
            clearTimeout(timer);
        }
    }, { retries, label, baseDelayMs: 600 });
}

/**
 * Descarga texto plano (para los CSV históricos).
 */
export async function fetchText(url, { headers = {}, label = 'http-text', timeoutMs = 30000 } = {}) {
    return withBackoff(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { headers, signal: controller.signal });
            if (!res.ok) throw new Error(`${label} respondió ${res.status}`);
            return await res.text();
        } finally {
            clearTimeout(timer);
        }
    }, { retries: 3, label, baseDelayMs: 800 });
}

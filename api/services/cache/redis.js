import Redis from 'ioredis';
import CONFIG from '../../config/config.js';

/**
 * Cliente Redis para los snapshots con TTL y cualquier cache de la app.
 * Si Redis no está disponible, la app sigue andando (la base es la fuente de verdad):
 * los métodos degradan a no-op y devuelven null en las lecturas.
 */
let client = null;
let available = false;

try {
    client = new Redis(CONFIG.REDIS.URL, {
        lazyConnect: false,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    client.on('ready', () => {
        available = true;
        console.info('Conexión a Redis establecida (cache de snapshots activo)');
    });
    client.on('error', (err) => {
        if (available) console.warn('[redis] error:', err.message);
        available = false;
    });
    client.on('end', () => { available = false; });
} catch (error) {
    console.warn('[redis] no se pudo inicializar, el cache queda deshabilitado:', error.message);
    client = null;
}

export function isAvailable() {
    return available && client;
}

export async function cacheGet(key) {
    if (!isAvailable()) return null;
    try {
        const raw = await client.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('[redis] cacheGet falló:', error.message);
        return null;
    }
}

export async function cacheSet(key, value, ttlSeconds) {
    if (!isAvailable()) return false;
    try {
        const raw = JSON.stringify(value);
        if (ttlSeconds) {
            await client.set(key, raw, 'EX', ttlSeconds);
        } else {
            await client.set(key, raw);
        }
        return true;
    } catch (error) {
        console.warn('[redis] cacheSet falló:', error.message);
        return false;
    }
}

export async function cacheDel(key) {
    if (!isAvailable()) return false;
    try {
        await client.del(key);
        return true;
    } catch (error) {
        return false;
    }
}

export default { isAvailable, cacheGet, cacheSet, cacheDel };

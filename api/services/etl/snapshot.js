import CONFIG from '../../config/config.js';
import TeamSnapshot from '../../models/TeamSnapshot.js';
import { cacheGet, cacheSet, cacheDel } from '../cache/redis.js';

/**
 * Gestión de la "foto de datos" por selección (4.3 / sección 9: cache y TTL).
 *
 * Dos capas: Redis (rápido, con TTL nativo) y la tabla team_snapshots (persistencia/
 * auditoría). El enriquecimiento bajo demanda consulta `isFresh` antes de pegarle a
 * la fuente; si está vigente, se evita la consulta externa.
 */

const ttlSeconds = () => CONFIG.REDIS.TEAM_SNAPSHOT_TTL;
const cacheKey = (teamId) => `mundial:snapshot:team:${teamId}`;

/**
 * Devuelve el snapshot vigente del equipo (features) o null si venció / no existe.
 */
export async function getFreshSnapshot(teamId) {
    // 1) Redis.
    const cached = await cacheGet(cacheKey(teamId));
    if (cached && cached.expires_at && new Date(cached.expires_at) > new Date()) {
        return cached;
    }
    // 2) Base (por si Redis está caído o vacío).
    const row = await TeamSnapshot.findOne({ where: { team_id: teamId } });
    if (row && new Date(row.expires_at) > new Date()) {
        const value = {
            team_id: teamId,
            features: row.features,
            updated_at: row.updated_at_snapshot,
            expires_at: row.expires_at,
        };
        // Re-hidratar Redis.
        const remainingMs = new Date(row.expires_at) - new Date();
        if (remainingMs > 0) await cacheSet(cacheKey(teamId), value, Math.ceil(remainingMs / 1000));
        return value;
    }
    return null;
}

/**
 * Guarda/actualiza el snapshot del equipo con un nuevo TTL.
 */
export async function saveSnapshot(teamId, features, { recentCount = null } = {}) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds() * 1000);

    await TeamSnapshot.upsert({
        team_id: teamId,
        features,
        recent_matches_count: recentCount,
        updated_at_snapshot: now,
        expires_at: expiresAt,
    });

    const value = { team_id: teamId, features, updated_at: now, expires_at: expiresAt };
    await cacheSet(cacheKey(teamId), value, ttlSeconds());
    return value;
}

/**
 * Invalida el snapshot (p.ej. al cerrar un partido, para forzar recálculo de la forma).
 */
export async function invalidateSnapshot(teamId) {
    await cacheDel(cacheKey(teamId));
    await TeamSnapshot.update(
        { expires_at: new Date(0) },
        { where: { team_id: teamId } }
    );
}

export function snapshotIsFresh(snapshot) {
    return Boolean(snapshot && snapshot.expires_at && new Date(snapshot.expires_at) > new Date());
}

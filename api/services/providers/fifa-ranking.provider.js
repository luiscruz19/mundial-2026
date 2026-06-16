import { parse } from 'csv-parse/sync';
import CONFIG from '../../config/config.js';
import { fetchText } from './http-client.js';

/**
 * Fuente del ranking FIFA (los puntos por selección) — el ANCLA del modelo.
 * Se configura con FIFA_RANKING_URL. Acepta JSON o CSV:
 *   JSON: [{ code|tla, points, rank, name }]  ó  { ranking: [...] }
 *   CSV : columnas code/tla, points, rank, name
 * Si no hay URL configurada, devuelve vacío (la base conserva el último ranking).
 */
const { FIFA_RANKING_URL } = CONFIG.PROVIDERS;

export const fifaRankingProvider = {
    name: 'fifa-ranking',
    enabled() { return Boolean(FIFA_RANKING_URL); },

    /**
     * @returns {Array<{ code, name, points, rank }>}
     */
    async getRanking() {
        if (!FIFA_RANKING_URL) {
            console.warn('[fifa-ranking] sin FIFA_RANKING_URL, devolviendo vacío');
            return [];
        }
        const text = await fetchText(FIFA_RANKING_URL, { label: 'fifa-ranking' });

        // Intentar JSON primero.
        try {
            const json = JSON.parse(text);
            const arr = Array.isArray(json) ? json : (json.ranking || json.data || []);
            return arr.map(normalizeEntry).filter(Boolean);
        } catch {
            // Si no es JSON, parsear como CSV.
            const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
            return records.map(normalizeEntry).filter(Boolean);
        }
    },
};

function normalizeEntry(r) {
    if (!r) return null;
    const code = (r.code || r.tla || r.country_abrv || r.abbreviation || '').toUpperCase();
    const points = Number(r.points ?? r.total_points ?? r.pts);
    const rank = Number(r.rank ?? r.position ?? r.rank_position);
    if (!code || !Number.isFinite(points)) return null;
    return {
        code,
        name: r.name || r.country_full || r.team || null,
        points,
        rank: Number.isFinite(rank) ? rank : null,
    };
}

export default fifaRankingProvider;

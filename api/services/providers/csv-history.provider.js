import { parse } from 'csv-parse/sync';
import CONFIG from '../../config/config.js';
import { fetchText } from './http-client.js';

/**
 * Carga histórica de resultados internacionales desde un CSV (se baja de una vez y
 * se cachea fuerte; el histórico no cambia). Sirve para SEMBRAR la forma y el
 * head-to-head de cada selección (13.2).
 *
 * Formato esperado por defecto (dataset de resultados internacionales, columnas):
 *   date, home_team, away_team, home_score, away_score, tournament, city, country, neutral
 *
 * Devuelve filas por equipo ya orientadas (goals_for/against, condición, tipo).
 * El mapeo nombre→código FIFA lo resuelve el ETL con la tabla de selecciones.
 */
const { HISTORY_CSV_URL } = CONFIG.PROVIDERS;

export const csvHistoryProvider = {
    name: 'csv-history',
    enabled() { return Boolean(HISTORY_CSV_URL); },

    /**
     * Devuelve TODOS los partidos del CSV, normalizados a un par de filas por partido
     * (una por cada equipo). El ETL filtra por las 48 selecciones y mapea a código.
     * @returns {Array<{ date, team_name, opponent_name, goals_for, goals_against, condition, competition_type, competition_name }>}
     */
    async getAllResults({ sinceYear } = {}) {
        if (!HISTORY_CSV_URL) {
            console.warn('[csv-history] sin HISTORY_CSV_URL, devolviendo vacío');
            return [];
        }
        const text = await fetchText(HISTORY_CSV_URL, { label: 'csv-history' });
        const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });

        const rows = [];
        for (const r of records) {
            const date = r.date || r.Date;
            if (!date) continue;
            if (sinceYear && Number(String(date).slice(0, 4)) < sinceYear) continue;

            const home = r.home_team || r.HomeTeam;
            const away = r.away_team || r.AwayTeam;
            const hs = toInt(r.home_score ?? r.FTHG);
            const as = toInt(r.away_score ?? r.FTAG);
            if (!home || !away || hs === null || as === null) continue;

            const tournament = r.tournament || r.competition || '';
            const isFriendly = /friendl/i.test(tournament);
            const neutral = String(r.neutral ?? '').toLowerCase() === 'true';
            const compType = isFriendly ? 'friendly' : 'official';

            // Fila orientada al local.
            rows.push({
                date, team_name: home, opponent_name: away,
                goals_for: hs, goals_against: as,
                condition: neutral ? 'neutral' : 'home',
                competition_type: compType, competition_name: tournament,
            });
            // Fila orientada al visitante.
            rows.push({
                date, team_name: away, opponent_name: home,
                goals_for: as, goals_against: hs,
                condition: neutral ? 'neutral' : 'away',
                competition_type: compType, competition_name: tournament,
            });
        }
        return rows;
    },

    /**
     * Devuelve los partidos CRUDOS (uno por fila, con ambos equipos) para el cálculo
     * de Elo, que necesita procesar TODO el dataset cronológicamente (no solo las 48).
     * @returns {Array<{ date, home, away, home_score, away_score, tournament, neutral }>}
     */
    async getRawMatches({ sinceYear } = {}) {
        if (!HISTORY_CSV_URL) return [];
        const text = await fetchText(HISTORY_CSV_URL, { label: 'csv-history' });
        const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });

        const out = [];
        for (const r of records) {
            const date = r.date || r.Date;
            if (!date) continue;
            if (sinceYear && Number(String(date).slice(0, 4)) < sinceYear) continue;
            const home = r.home_team || r.HomeTeam;
            const away = r.away_team || r.AwayTeam;
            const hs = toInt(r.home_score ?? r.FTHG);
            const as = toInt(r.away_score ?? r.FTAG);
            if (!home || !away || hs === null || as === null) continue; // saltar no jugados (NA)
            out.push({
                date, home, away, home_score: hs, away_score: as,
                tournament: r.tournament || r.competition || '',
                neutral: String(r.neutral ?? '').toLowerCase() === 'true',
            });
        }
        return out;
    },
};

function toInt(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
}

export default csvHistoryProvider;

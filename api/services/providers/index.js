import CONFIG from '../../config/config.js';
import apiFootballProvider from './api-football.provider.js';
import footballDataProvider from './football-data.provider.js';
import csvHistoryProvider from './csv-history.provider.js';
import fifaRankingProvider from './fifa-ranking.provider.js';

/**
 * CAPA DE ABSTRACCIÓN DE PROVEEDORES.
 *
 * El resto del sistema (ETL, jobs, simulación) habla SIEMPRE con esta interfaz
 * normalizada y nunca con un proveedor concreto. Así se puede cambiar de fuente
 * (o combinar varias) sin tocar la lógica de negocio.
 *
 * Estrategia: se usa el proveedor de fútbol configurado (DATA_PROVIDER) como
 * principal y el otro como respaldo (fallback) cuando el principal no está
 * habilitado o devuelve vacío para un método. El histórico (CSV) y el ranking FIFA
 * vienen de fuentes aparte.
 *
 * Contrato (lo que cualquier football-provider implementa):
 *   getTeams()        -> [{ external_id, name, code, country, flag_url, confederation }]
 *   getVenues()       -> [{ external_id, name, city, country }]
 *   getFixtures()     -> [{ external_id, kickoff_utc, status, stage?, group?, matchday?,
 *                           venue_name, home_external_id, away_external_id, home_name,
 *                           away_name, home_score, away_score }]
 *   getSquad(teamExtId)             -> [{ external_id, name, position, shirt_number, club }]
 *   getRecentMatches(teamExtId,opt) -> [{ date, opponent_name, opponent_code, goals_for,
 *                                         goals_against, condition, competition_type, competition_name }]
 *   getHeadToHead(aExtId,bExtId,opt)-> [{ date, home_external_id, away_external_id, home_score, away_score }]
 *   getLineups(matchExtId)          -> { home, away }
 *   getMatchStatus(matchExtId)      -> { status, home_score, away_score, minute, period }
 *   getStandings?()                 -> [{ group, team_external_id, ... }]   (opcional)
 */

const FOOTBALL_PROVIDERS = {
    'api-football': apiFootballProvider,
    'football-data': footballDataProvider,
};

function primary() {
    return FOOTBALL_PROVIDERS[CONFIG.PROVIDERS.DEFAULT] || apiFootballProvider;
}

function secondary() {
    const key = CONFIG.PROVIDERS.DEFAULT === 'api-football' ? 'football-data' : 'api-football';
    return FOOTBALL_PROVIDERS[key];
}

/**
 * Ejecuta `method` en el principal; si no está habilitado o devuelve vacío,
 * intenta con el secundario. Devuelve lo que haya (o vacío).
 */
async function withFallback(method, args = [], { allowEmpty = false } = {}) {
    const order = [primary(), secondary()].filter(Boolean);
    let lastResult = Array.isArray(args) ? [] : null;
    for (const provider of order) {
        if (typeof provider[method] !== 'function') continue;
        if (typeof provider.enabled === 'function' && !provider.enabled()) continue;
        try {
            const result = await provider[method](...args);
            const isEmpty = result == null
                || (Array.isArray(result) && result.length === 0);
            if (!isEmpty || allowEmpty) return result;
            lastResult = result;
        } catch (error) {
            console.warn(`[providers] ${provider.name}.${method} falló: ${error.message}`);
        }
    }
    return lastResult;
}

export const dataProvider = {
    getTeams: () => withFallback('getTeams'),
    getVenues: () => withFallback('getVenues'),
    getFixtures: () => withFallback('getFixtures'),
    getSquad: (teamExtId) => withFallback('getSquad', [teamExtId]),
    getRecentMatches: (teamExtId, opt) => withFallback('getRecentMatches', [teamExtId, opt]),
    getHeadToHead: (aExtId, bExtId, opt) => withFallback('getHeadToHead', [aExtId, bExtId, opt]),
    getLineups: (matchExtId) => withFallback('getLineups', [matchExtId], { allowEmpty: true }),
    getMatchStatus: (matchExtId) => withFallback('getMatchStatus', [matchExtId], { allowEmpty: true }),
    getStandings: () => withFallback('getStandings'),

    // Helpers para saber qué proveedor responde (debug/seed).
    primaryName: () => primary()?.name,
    secondaryName: () => secondary()?.name,
};

export { csvHistoryProvider, fifaRankingProvider };
export default dataProvider;

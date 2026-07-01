import CONFIG from '../../config/config.js';
import { fetchJson } from './http-client.js';

/**
 * Adapter de API-Football (API-SPORTS). La más completa para proyectos chicos:
 * fixtures, resultados, posiciones, alineaciones, planteles y head-to-head.
 * Plan gratis ~100 req/día → por eso todo se cachea y el enriquecimiento es bajo demanda.
 *
 * Todos los métodos NORMALIZAN al contrato común (ver providers/index.js).
 * Si no hay API key configurada, devuelven vacío en lugar de fallar (la base es la verdad).
 */
const { API_FOOTBALL } = CONFIG.PROVIDERS;

function headers() {
    return { 'x-apisports-key': API_FOOTBALL.KEY, Accept: 'application/json' };
}

function enabled() {
    return Boolean(API_FOOTBALL.KEY);
}

async function call(path, params = {}) {
    if (!enabled()) {
        console.warn('[api-football] sin APIFOOTBALL_KEY, devolviendo vacío');
        return { response: [] };
    }
    const qs = new URLSearchParams(params).toString();
    const url = `${API_FOOTBALL.BASE_URL}${path}${qs ? `?${qs}` : ''}`;
    return fetchJson(url, { headers: headers(), label: `api-football${path}` });
}

const CONFED = {
    Europe: 'UEFA', 'South America': 'CONMEBOL', 'North America': 'CONCACAF',
    Africa: 'CAF', Asia: 'AFC', Oceania: 'OFC',
};

export const apiFootballProvider = {
    name: 'api-football',
    enabled,

    async getTeams() {
        const data = await call('/teams', { league: API_FOOTBALL.LEAGUE_ID, season: API_FOOTBALL.SEASON });
        return (data.response || []).map(({ team }) => ({
            external_id: String(team.id),
            name: team.name,
            code: team.code || null,
            country: team.country || team.name,
            flag_url: team.logo || null,
            confederation: null,
        }));
    },

    async getVenues() {
        const data = await call('/venues', { country: 'USA' });
        const usa = (data.response || []).map(v => ({
            external_id: String(v.id), name: v.name, city: v.city, country: v.country,
        }));
        return usa;
    },

    async getFixtures() {
        const data = await call('/fixtures', { league: API_FOOTBALL.LEAGUE_ID, season: API_FOOTBALL.SEASON });
        return (data.response || []).map((f) => ({
            external_id: String(f.fixture.id),
            kickoff_utc: f.fixture.date, // ISO con zona; se normaliza a Date en el ETL
            status: normalizeStatus(f.fixture.status?.short),
            venue_name: f.fixture.venue?.name || null,
            venue_city: f.fixture.venue?.city || null,
            stage_label: f.league?.round || null,
            home_external_id: String(f.teams.home.id),
            away_external_id: String(f.teams.away.id),
            home_name: f.teams.home.name,
            away_name: f.teams.away.name,
            home_score: f.goals?.home ?? null,
            away_score: f.goals?.away ?? null,
        }));
    },

    async getSquad(teamExternalId) {
        const data = await call('/players/squads', { team: teamExternalId });
        const squad = data.response?.[0]?.players || [];
        return squad.map(p => ({
            external_id: String(p.id),
            name: p.name,
            position: mapPosition(p.position),
            shirt_number: p.number ?? null,
            club: null,
        }));
    },

    async getRecentMatches(teamExternalId, { last = 30 } = {}) {
        const data = await call('/fixtures', { team: teamExternalId, last });
        return (data.response || [])
            .filter(f => f.fixture.status?.short === 'FT')
            .map((f) => {
                const isHome = String(f.teams.home.id) === String(teamExternalId);
                const gf = isHome ? f.goals.home : f.goals.away;
                const ga = isHome ? f.goals.away : f.goals.home;
                const opp = isHome ? f.teams.away : f.teams.home;
                return {
                    date: f.fixture.date,
                    opponent_name: opp.name,
                    opponent_code: opp.code || null,
                    goals_for: gf ?? 0,
                    goals_against: ga ?? 0,
                    condition: f.fixture.venue ? (isHome ? 'home' : 'away') : 'neutral',
                    competition_type: /friendl/i.test(f.league?.name || '') ? 'friendly' : 'official',
                    competition_name: f.league?.name || null,
                };
            });
    },

    async getHeadToHead(homeExternalId, awayExternalId, { last = 10 } = {}) {
        const data = await call('/fixtures/headtohead', { h2h: `${homeExternalId}-${awayExternalId}`, last });
        return (data.response || [])
            .filter(f => f.fixture.status?.short === 'FT')
            .map((f) => ({
                date: f.fixture.date,
                home_external_id: String(f.teams.home.id),
                away_external_id: String(f.teams.away.id),
                home_score: f.goals.home ?? 0,
                away_score: f.goals.away ?? 0,
            }));
    },

    async getLineups(matchExternalId) {
        const data = await call('/fixtures/lineups', { fixture: matchExternalId });
        const sides = data.response || [];
        const toLineup = (s) => s ? ({
            formation: s.formation || null,
            players: (s.startXI || []).map(x => ({
                external_id: String(x.player?.id),
                name: x.player?.name,
                number: x.player?.number ?? null,
                pos: x.player?.pos || null,
            })),
        }) : null;
        return { home: toLineup(sides[0]), away: toLineup(sides[1]) };
    },

    async getMatchStatus(matchExternalId) {
        const data = await call('/fixtures', { id: matchExternalId });
        const f = data.response?.[0];
        if (!f) return null;
        return {
            status: normalizeStatus(f.fixture.status?.short),
            home_score: f.goals?.home ?? null,
            away_score: f.goals?.away ?? null,
            home_penalties: f.score?.penalty?.home ?? null,
            away_penalties: f.score?.penalty?.away ?? null,
            minute: f.fixture.status?.elapsed ?? null,
            period: f.fixture.status?.short ?? null,
        };
    },
};

function normalizeStatus(short) {
    if (!short) return 'scheduled';
    if (['NS', 'TBD', 'PST'].includes(short)) return 'scheduled';
    if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return 'finished';
    return 'live'; // 1H, HT, 2H, ET, BT, P, LIVE, INT, SUSP
}

function mapPosition(pos) {
    if (!pos) return null;
    const p = pos.toLowerCase();
    if (p.startsWith('goal')) return 'GK';
    if (p.startsWith('def')) return 'DF';
    if (p.startsWith('mid')) return 'MF';
    if (p.startsWith('att') || p.startsWith('for')) return 'FW';
    return null;
}

export default apiFootballProvider;

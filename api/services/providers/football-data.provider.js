import CONFIG from '../../config/config.js';
import { sleep } from '../../utils/helpers.js';
import { fetchJson } from './http-client.js';

/**
 * Adapter de football-data.org. Simple y confiable para calendario, resultados y
 * posiciones (gratis permanente, ~10 req/min). Tiene menos cobertura que API-Football
 * (sin head-to-head profundo ni planteles completos): esos métodos devuelven vacío
 * y la capa de abstracción (providers/index.js) cae al otro proveedor si hace falta.
 */
const { FOOTBALL_DATA } = CONFIG.PROVIDERS;

function headers() {
    return { 'X-Auth-Token': FOOTBALL_DATA.KEY, Accept: 'application/json' };
}

function enabled() {
    return Boolean(FOOTBALL_DATA.KEY);
}

// Rate guard: el free tier permite ~10 req/min. Espaciamos las llamadas ~6.5s
// (≈9/min) para no gatillar el limitador (recomendación del proveedor en el alta).
let _lastRequestAt = 0;
const MIN_SPACING_MS = 6500;
async function rateGuard() {
    const wait = _lastRequestAt + MIN_SPACING_MS - Date.now();
    if (wait > 0) await sleep(wait);
    _lastRequestAt = Date.now();
}

async function call(path, params = {}) {
    if (!enabled()) {
        console.warn('[football-data] sin FOOTBALLDATA_KEY, devolviendo vacío');
        return {};
    }
    await rateGuard();
    const qs = new URLSearchParams(params).toString();
    const url = `${FOOTBALL_DATA.BASE_URL}${path}${qs ? `?${qs}` : ''}`;
    return fetchJson(url, { headers: headers(), label: `football-data${path}` });
}

// Normaliza el grupo de football-data ("GROUP_A" / "Group A" → "A").
function normalizeGroup(g) {
    if (!g) return null;
    const m = String(g).match(/([A-L])\s*$/i);
    return m ? m[1].toUpperCase() : null;
}

const STAGE_MAP = {
    GROUP_STAGE: 'group',
    LAST_32: 'round_of_32',
    LAST_16: 'round_of_16',
    QUARTER_FINALS: 'quarter_final',
    SEMI_FINALS: 'semi_final',
    THIRD_PLACE: 'third_place',
    FINAL: 'final',
};

export const footballDataProvider = {
    name: 'football-data',
    enabled,

    async getTeams() {
        const comp = FOOTBALL_DATA.COMPETITION;
        const data = await call(`/competitions/${comp}/teams`);
        return (data.teams || []).map(t => ({
            external_id: String(t.id),
            name: t.name,
            code: t.tla || null, // tla = three-letter abbreviation
            country: t.name,
            flag_url: t.crest || null,
            confederation: null,
        }));
    },

    async getVenues() {
        // football-data no expone un catálogo de sedes; se obtiene del fixture.
        return [];
    },

    async getFixtures() {
        const comp = FOOTBALL_DATA.COMPETITION;
        const data = await call(`/competitions/${comp}/matches`);
        return (data.matches || []).map((m) => ({
            external_id: String(m.id),
            kickoff_utc: m.utcDate,
            status: normalizeStatus(m.status),
            stage: STAGE_MAP[m.stage] || 'group',
            group: normalizeGroup(m.group),
            matchday: m.matchday ?? null,
            venue_name: m.venue || null,
            home_external_id: m.homeTeam?.id ? String(m.homeTeam.id) : null,
            away_external_id: m.awayTeam?.id ? String(m.awayTeam.id) : null,
            home_name: m.homeTeam?.name || null,
            away_name: m.awayTeam?.name || null,
            home_score: m.score?.fullTime?.home ?? null,
            away_score: m.score?.fullTime?.away ?? null,
        }));
    },

    async getStandings() {
        const comp = FOOTBALL_DATA.COMPETITION;
        const data = await call(`/competitions/${comp}/standings`);
        const out = [];
        for (const s of data.standings || []) {
            if (s.type !== 'TOTAL') continue;
            const group = normalizeGroup(s.group);
            for (const row of s.table || []) {
                out.push({
                    group,
                    team_external_id: String(row.team.id),
                    team_name: row.team.name,
                    played: row.playedGames, won: row.won, drawn: row.draw, lost: row.lost,
                    goals_for: row.goalsFor, goals_against: row.goalsAgainst,
                    goal_difference: row.goalDifference, points: row.points, position: row.position,
                });
            }
        }
        return out;
    },

    async getSquad() { return []; },
    async getRecentMatches() { return []; },
    async getHeadToHead() { return []; },
    async getLineups() { return { home: null, away: null }; },

    async getMatchStatus(matchExternalId) {
        const data = await call(`/matches/${matchExternalId}`);
        const m = data;
        if (!m || !m.status) return null;
        return {
            status: normalizeStatus(m.status),
            home_score: m.score?.fullTime?.home ?? null,
            away_score: m.score?.fullTime?.away ?? null,
            home_penalties: m.score?.penalties?.home ?? null,
            away_penalties: m.score?.penalties?.away ?? null,
            minute: m.minute ?? null,
            period: m.status ?? null,
        };
    },
};

function normalizeStatus(status) {
    if (!status) return 'scheduled';
    if (['SCHEDULED', 'TIMED', 'POSTPONED'].includes(status)) return 'scheduled';
    if (['FINISHED', 'AWARDED'].includes(status)) return 'finished';
    return 'live'; // IN_PLAY, PAUSED
}

export default footballDataProvider;

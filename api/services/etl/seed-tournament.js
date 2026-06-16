import { Op } from 'sequelize';
import Team from '../../models/Team.js';
import Venue from '../../models/Venue.js';
import Match from '../../models/Match.js';
import Player from '../../models/Player.js';
import HistoricalMatch from '../../models/HistoricalMatch.js';
import CONFIG from '../../config/config.js';
import dataProvider, { fifaRankingProvider, csvHistoryProvider } from '../providers/index.js';
import { ingestTeamData, normalizeName } from './ingest-team-data.js';
import { refreshEloRatings } from './refresh-elo-ratings.js';
import { nameToCode } from './team-name-map.js';
import { recomputeAllStandings } from './standings.js';
import {
    buildTeams, VENUES, buildGroupFixtures, buildKnockoutSkeleton, RAW_TEAMS,
} from '../../db/seed-data.js';

// Puntos FIFA y nombre en español por código (de mi dataset verificado), para anclar
// la fuerza del modelo y mostrar nombres en español cuando los equipos vienen del
// proveedor (football-data da nombres en inglés y no expone puntos FIFA).
const FIFA_POINTS_BY_CODE = new Map(RAW_TEAMS.map(([code, , , , points]) => [code, points]));
const NAME_ES_BY_CODE = new Map(RAW_TEAMS.map(([code, name]) => [code, name]));

// Algunos proveedores usan códigos ISO en vez de los FIFA. Los normalizamos a los míos
// (así coinciden con el mapa de banderas y mis puntos). Ej: football-data usa URY (Uruguay).
const CODE_ALIASES = { URY: 'URU' };
const canonCode = (code) => CODE_ALIASES[code] || code;

// Sede oficial por cruce (de mi fixture verificado), para completar la sede de los
// partidos del proveedor (que no trae estadio). Indexado por par de códigos (ambos órdenes).
const VENUE_BY_PAIRING = (() => {
    const m = new Map();
    for (const f of buildGroupFixtures()) {
        m.set(`${f.home_code}-${f.away_code}`, f.venue_name);
        m.set(`${f.away_code}-${f.home_code}`, f.venue_name);
    }
    return m;
})();

/**
 * CARGA INICIAL DEL TORNEO (13.1 + 13.2).
 *
 * Deja la base sembrada con todo el esqueleto del Mundial y la ingeniería de datos
 * previa, ANTES de que nadie simule. Idempotente (upsert por clave natural).
 *
 * Usa el proveedor real cuando hay claves; si no, cae al dataset estático de
 * respaldo para que el sistema sea demostrable de punta a punta.
 */
export async function seedTournament(opts = {}) {
    const log = opts.log || console.info;
    const summary = {};

    log('── Carga inicial del Mundial 2026 ──');
    log(`Proveedor principal: ${dataProvider.primaryName()} | respaldo: ${dataProvider.secondaryName()}`);

    summary.teams = await loadTeams(log);
    summary.venues = await loadVenues(log);
    summary.ranking = await refreshRanking(log);
    summary.fixtures = await loadFixtures(log);
    await backfillGroupsFromMatches(log);
    await backfillVenuesFromPairings(log);
    await backfillKnockoutFromStatic(log);
    summary.squads = await loadSquads(log);
    summary.history = await loadHistory(log);

    // Elo (ancla principal del modelo) desde el dataset internacional real.
    summary.elo = await refreshEloRatings({ log });

    // Ingeniería de datos sobre todas las selecciones (forma + snapshot).
    log('Calculando features (forma con decaimiento) de las 48 selecciones…');
    const teams = await Team.findAll();
    let ingested = 0;
    for (const t of teams) {
        try {
            await ingestTeamData(t.id, { force: true, fetchRemote: false });
            ingested++;
        } catch (error) {
            log(`  · ${t.code}: ${error.message}`);
        }
    }
    summary.ingested = ingested;

    // Tablas de grupos (al inicio quedan en cero).
    await recomputeAllStandings();

    summary.verification = await verify(log);
    log('── Carga inicial completada ──');
    return summary;
}

async function loadTeams(log) {
    let remote = [];
    try { remote = await dataProvider.getTeams(); } catch (e) { log(`getTeams falló: ${e.message}`); }

    // Solo usamos el proveedor si trae el plantel completo de selecciones (>=48);
    // si no, conservamos el dataset oficial verificado.
    if (remote && remote.length >= 48) {
        for (const t of remote) {
            const code = canonCode((t.code || '').toUpperCase());
            if (!code) continue;
            await Team.upsert({
                code,
                // Nombre en español desde el dataset verificado; si no está, el del proveedor.
                name: NAME_ES_BY_CODE.get(code) || t.name,
                confederation: mapConfederation(t.confederation),
                flag_url: t.flag_url || null,
                is_host: ['USA', 'MEX', 'CAN'].includes(code),
                // Anclamos los puntos FIFA desde el dataset verificado (el grupo se completa
                // luego desde los partidos, en backfillGroupsFromMatches).
                fifa_points: FIFA_POINTS_BY_CODE.get(code) ?? null,
                external_ids: t.external_id ? { [dataProvider.primaryName()]: String(t.external_id) } : null,
            });
        }
        // Rank global por puntos.
        await assignFifaRanks();
        log(`Selecciones (proveedor): ${remote.length}`);
        return remote.length;
    }

    // Respaldo estático.
    const teams = buildTeams();
    for (const t of teams) {
        await Team.upsert({
            code: t.code, name: t.name, confederation: t.confederation,
            group: t.group, fifa_points: t.fifa_points, fifa_rank: t.fifa_rank,
            is_host: t.is_host,
        });
    }
    log(`Selecciones (respaldo estático): ${teams.length}`);
    return teams.length;
}

async function loadVenues(log) {
    let remote = [];
    try { remote = await dataProvider.getVenues(); } catch (e) { log(`getVenues falló: ${e.message}`); }
    const list = (remote && remote.length > 0)
        ? remote.map(v => ({ name: v.name, city: v.city, country: v.country, external_id: v.external_id ? String(v.external_id) : null }))
        : VENUES;
    for (const v of list) {
        const [row] = await Venue.findOrCreate({ where: { name: v.name }, defaults: v });
        if (row) await row.update({ city: v.city ?? row.city, country: v.country ?? row.country });
    }
    log(`Sedes: ${list.length}`);
    return list.length;
}

async function refreshRanking(log) {
    if (!fifaRankingProvider.enabled()) {
        log('Ranking FIFA: sin fuente configurada (se conservan los puntos cargados)');
        return 0;
    }
    let ranking = [];
    try { ranking = await fifaRankingProvider.getRanking(); } catch (e) { log(`ranking falló: ${e.message}`); }
    let updated = 0;
    const now = new Date();
    for (const r of ranking) {
        const [n] = await Team.update(
            { fifa_points: r.points, fifa_rank: r.rank, fifa_points_updated_at: now },
            { where: { code: r.code } }
        );
        updated += n;
    }
    log(`Ranking FIFA actualizado: ${updated} selecciones`);
    return updated;
}

async function loadFixtures(log) {
    const teams = await Team.findAll();
    const byCode = new Map(teams.map(t => [t.code, t]));
    const byExt = new Map();
    for (const t of teams) {
        const ext = t.external_ids || {};
        for (const id of Object.values(ext)) byExt.set(String(id), t);
    }
    const venues = await Venue.findAll();
    const venueByName = new Map(venues.map(v => [normalizeName(v.name), v]));

    let remote = [];
    try { remote = await dataProvider.getFixtures(); } catch (e) { log(`getFixtures falló: ${e.message}`); }

    // Solo reemplazamos el fixture oficial verificado si el proveedor trae el torneo
    // completo (>=100 de los 104 partidos); si trae menos, conservamos el verificado.
    if (remote && remote.length >= 100) {
        let count = 0;
        for (const f of remote) {
            const home = byExt.get(String(f.home_external_id)) || byCode.get((f.home_name || '').toUpperCase());
            const away = byExt.get(String(f.away_external_id)) || byCode.get((f.away_name || '').toUpperCase());
            const venue = f.venue_name ? venueByName.get(normalizeName(f.venue_name)) : null;
            await upsertMatch({
                stage: f.stage || 'group',
                group: f.group || null,
                matchday: f.matchday || null,
                home_team_id: home?.id || null,
                away_team_id: away?.id || null,
                kickoff_utc: f.kickoff_utc ? new Date(f.kickoff_utc) : null,
                venue_id: venue?.id || null,
                status: f.status || 'scheduled',
                home_score: f.home_score, away_score: f.away_score,
                external_ids: f.external_id ? { [dataProvider.primaryName()]: String(f.external_id) } : null,
            });
            count++;
        }
        log(`Fixture (proveedor): ${count} partidos`);
        return count;
    }

    // Dataset oficial (fixture real, sede por nombre, resultados ya jugados).
    const groupFixtures = buildGroupFixtures();
    let count = 0;
    for (const f of groupFixtures) {
        const home = byCode.get(f.home_code), away = byCode.get(f.away_code);
        const venue = venueByName.get(normalizeName(f.venue_name));
        await upsertMatch({
            stage: 'group', group: f.group, matchday: f.matchday,
            home_team_id: home?.id || null, away_team_id: away?.id || null,
            kickoff_utc: new Date(f.kickoff_utc), venue_id: venue?.id || null,
            status: f.status,
            home_score: f.home_score, away_score: f.away_score,
        }, { naturalKey: 'group' });
        count++;
    }
    const knockout = buildKnockoutSkeleton();
    for (const m of knockout) {
        const venue = venueByName.get(normalizeName(m.venue_name));
        await upsertMatch({
            stage: m.stage, bracket_slot: m.bracket_slot,
            home_placeholder: m.home_placeholder, away_placeholder: m.away_placeholder,
            kickoff_utc: new Date(m.kickoff_utc), venue_id: venue?.id || null,
            status: 'scheduled',
        }, { naturalKey: 'bracket' });
        count++;
    }
    log(`Fixture (oficial): ${count} partidos (72 grupos + ${knockout.length} fase final)`);
    return count;
}

async function upsertMatch(data, { naturalKey } = {}) {
    let where = null;
    if (naturalKey === 'bracket' && data.bracket_slot) {
        where = { bracket_slot: data.bracket_slot };
    } else if (naturalKey === 'group' && data.home_team_id && data.away_team_id) {
        where = { stage: 'group', group: data.group, home_team_id: data.home_team_id, away_team_id: data.away_team_id };
    } else if (data.external_ids) {
        // Buscar por external id del proveedor principal.
        const provName = dataProvider.primaryName();
        const extId = data.external_ids[provName];
        const all = await Match.findAll({ where: { stage: data.stage } });
        const found = all.find(m => m.external_ids && m.external_ids[provName] === extId);
        if (found) { await found.update(data); return found; }
    }

    if (where) {
        const existing = await Match.findOne({ where });
        if (existing) { await existing.update(data); return existing; }
    }
    return Match.create(data);
}

async function loadSquads(log) {
    const teams = await Team.findAll();
    let total = 0;
    for (const t of teams) {
        const ext = t.external_ids?.[dataProvider.primaryName()] || t.external_ids?.[dataProvider.secondaryName()];
        if (!ext) continue;
        try {
            const squad = await dataProvider.getSquad(ext);
            for (const p of squad) {
                const [row, created] = await Player.findOrCreate({
                    where: { team_id: t.id, name: p.name },
                    defaults: { ...p, team_id: t.id, external_id: p.external_id || null },
                });
                if (!created) await row.update({ position: p.position ?? row.position, shirt_number: p.shirt_number ?? row.shirt_number });
                total++;
            }
        } catch (error) {
            // Plantel opcional; se confirma poco antes del torneo.
        }
    }
    log(`Jugadores cargados: ${total}`);
    return total;
}

async function loadHistory(log) {
    const teams = await Team.findAll();
    // El dataset trae nombres en inglés → se resuelven a código FIFA con el name-map.
    const byCode = new Map(teams.map(t => [t.code, t]));

    if (csvHistoryProvider.enabled()) {
        let rows = [];
        try { rows = await csvHistoryProvider.getAllResults({ sinceYear: 2010 }); } catch (e) { log(`CSV histórico falló: ${e.message}`); }
        let count = 0;
        for (const r of rows) {
            const team = byCode.get(nameToCode(r.team_name));
            if (!team) continue; // solo las 48
            const opp = byCode.get(nameToCode(r.opponent_name));
            try {
                await HistoricalMatch.upsert({
                    team_id: team.id, team_code: team.code,
                    opponent_code: opp?.code || null, opponent_name: r.opponent_name,
                    match_date: String(r.date).slice(0, 10),
                    goals_for: r.goals_for, goals_against: r.goals_against,
                    condition: r.condition, competition_type: r.competition_type,
                    competition_name: r.competition_name, source: 'csv',
                });
                count++;
            } catch { /* clave natural duplicada */ }
        }
        log(`Histórico (CSV): ${count} filas`);
        return count;
    }

    // Sin CSV: sintetizar un histórico plausible para que la forma sea demostrable.
    if (process.env.SEED_SYNTHETIC_HISTORY === 'false') {
        log('Histórico: sin CSV y síntesis desactivada');
        return 0;
    }
    const count = await synthesizeHistory(teams);
    log(`Histórico (sintético para demo): ${count} filas — configurá HISTORY_CSV_URL para datos reales`);
    return count;
}

/**
 * Genera ~12 partidos pasados por selección, con marcadores plausibles según la
 * diferencia de puntos FIFA entre rivales. Solo para que el demo muestre forma/h2h
 * sin una fuente real; el CSV los reemplaza. Determinístico (sin azar).
 */
async function synthesizeHistory(teams) {
    const sorted = [...teams].sort((a, b) => (b.fifa_points || 0) - (a.fifa_points || 0));
    let count = 0;
    const baseDate = new Date('2025-09-01T00:00:00Z');
    for (let i = 0; i < sorted.length; i++) {
        const team = sorted[i];
        for (let k = 1; k <= 12; k++) {
            const opp = sorted[(i + k * 3) % sorted.length];
            if (opp.id === team.id) continue;
            const diff = ((team.fifa_points || 1500) - (opp.fifa_points || 1500)) / 200;
            const gf = clampInt(Math.round(1.3 + diff * 0.6), 0, 6);
            const ga = clampInt(Math.round(1.3 - diff * 0.6), 0, 6);
            const d = new Date(baseDate.getTime());
            d.setUTCDate(baseDate.getUTCDate() - k * 12 - i);
            try {
                await HistoricalMatch.upsert({
                    team_id: team.id, team_code: team.code,
                    opponent_code: opp.code, opponent_name: opp.name,
                    match_date: d.toISOString().slice(0, 10),
                    goals_for: gf, goals_against: ga,
                    condition: k % 2 === 0 ? 'home' : 'away',
                    competition_type: k % 4 === 0 ? 'friendly' : 'official',
                    competition_name: 'Synthetic', source: 'synthetic',
                });
                count++;
            } catch { /* dup */ }
        }
    }
    return count;
}

async function verify(log) {
    const teams = await Team.count();
    const groups = await Team.count({ distinct: true, col: 'group' });
    const groupMatches = await Match.count({ where: { stage: 'group' } });
    const venues = await Venue.count();
    const v = { teams, groups, groupMatches, venues };
    log(`Verificación → selecciones: ${teams}, grupos: ${groups}, partidos de grupo: ${groupMatches}, sedes: ${venues}`);
    if (teams !== 48) log('  ⚠ se esperaban 48 selecciones');
    if (groupMatches !== 72 && CONFIG.PROVIDERS.DEFAULT) log('  ⚠ se esperaban 72 partidos de grupo (con datos completos)');
    return v;
}

function mapConfederation(c) {
    const valid = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];
    return valid.includes(c) ? c : null;
}

/**
 * Asigna el rank FIFA global (1..N) por puntos descendentes.
 */
async function assignFifaRanks() {
    const teams = await Team.findAll({ order: [['fifa_points', 'DESC']] });
    let rank = 1;
    for (const t of teams) {
        if (t.fifa_points == null) continue;
        await t.update({ fifa_rank: rank++ });
    }
}

/**
 * Completa el grupo de cada selección a partir de los partidos de fase de grupos
 * (cada partido trae su grupo y ambos equipos). Necesario cuando los equipos vienen
 * del proveedor sin grupo confiable; idempotente para el dataset estático.
 */
async function backfillGroupsFromMatches(log) {
    const groupMatches = await Match.findAll({
        where: { stage: 'group', group: { [Op.ne]: null } },
        attributes: ['group', 'home_team_id', 'away_team_id'],
    });
    let updated = 0;
    for (const m of groupMatches) {
        for (const teamId of [m.home_team_id, m.away_team_id]) {
            if (!teamId) continue;
            const [n] = await Team.update(
                { group: m.group },
                { where: { id: teamId, [Op.or]: [{ group: null }, { group: { [Op.ne]: m.group } }] } }
            );
            updated += n;
        }
    }
    if (updated > 0) log(`Grupos completados desde el fixture: ${updated} asignaciones`);
}

/**
 * Completa la sede de los partidos de grupos que quedaron sin estadio (p. ej. cuando
 * el proveedor no la informa), usando la sede oficial de mi fixture verificado por cruce.
 */
async function backfillVenuesFromPairings(log) {
    const venues = await Venue.findAll();
    const venueByName = new Map(venues.map(v => [normalizeName(v.name), v]));

    const matches = await Match.findAll({
        where: { stage: 'group', venue_id: null },
        include: [
            { model: Team, as: 'homeTeam', required: false, attributes: ['code'] },
            { model: Team, as: 'awayTeam', required: false, attributes: ['code'] },
        ],
    });
    let updated = 0;
    for (const m of matches) {
        const hc = m.homeTeam?.code, ac = m.awayTeam?.code;
        if (!hc || !ac) continue;
        const venueName = VENUE_BY_PAIRING.get(`${hc}-${ac}`);
        if (!venueName) continue;
        const venue = venueByName.get(normalizeName(venueName));
        if (venue) { await m.update({ venue_id: venue.id }); updated++; }
    }
    if (updated > 0) log(`Sedes completadas desde el fixture oficial: ${updated} partidos`);
}

/**
 * Completa la fase final cuando viene del proveedor sin sede ni rótulos: superpone
 * sede, bracket_slot y placeholders ("2A", "1C", "W:R32-1"…) de mi cuadro oficial,
 * emparejando por ronda y fecha. No pisa equipos ya definidos.
 */
async function backfillKnockoutFromStatic(log) {
    const venues = await Venue.findAll();
    const venueByName = new Map(venues.map(v => [normalizeName(v.name), v]));

    const byStage = {};
    for (const k of buildKnockoutSkeleton()) (byStage[k.stage] = byStage[k.stage] || []).push(k);
    for (const s of Object.keys(byStage)) {
        byStage[s].sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc));
    }

    let updated = 0;
    for (const stage of Object.keys(byStage)) {
        const dbMatches = await Match.findAll({ where: { stage }, order: [['kickoff_utc', 'ASC'], ['id', 'ASC']] });
        const tmpl = byStage[stage];
        for (let i = 0; i < dbMatches.length && i < tmpl.length; i++) {
            const m = dbMatches[i], t = tmpl[i];
            const patch = {};
            if (!m.bracket_slot) patch.bracket_slot = t.bracket_slot;
            if (!m.home_placeholder && !m.home_team_id) patch.home_placeholder = t.home_placeholder;
            if (!m.away_placeholder && !m.away_team_id) patch.away_placeholder = t.away_placeholder;
            if (!m.venue_id) {
                const v = venueByName.get(normalizeName(t.venue_name));
                if (v) patch.venue_id = v.id;
            }
            if (Object.keys(patch).length) { await m.update(patch); updated++; }
        }
    }
    if (updated > 0) log(`Fase final completada desde el cuadro oficial: ${updated} partidos`);
}

const clampInt = (x, min, max) => Math.min(max, Math.max(min, x));

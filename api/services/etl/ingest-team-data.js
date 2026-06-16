import Team from '../../models/Team.js';
import HistoricalMatch from '../../models/HistoricalMatch.js';
import dataProvider from '../providers/index.js';
import { computeForm } from './compute-form.js';
import { getFreshSnapshot, saveSnapshot, snapshotIsFresh } from './snapshot.js';

/**
 * MÓDULO ÚNICO DE INGENIERÍA DE DATOS (4.2 / 4.3).
 *
 * El mismo código corre en dos momentos: en la carga inicial (sobre las 48) y en
 * cada simulación (acotado a las 2 selecciones del cruce). El flujo es siempre:
 *   EXTRAER de la fuente → NORMALIZAR → CALCULAR features → GUARDAR.
 *
 * El histórico vive en la base (fuente de verdad); el enriquecimiento solo AGREGA
 * lo nuevo de la fuente y recalcula la forma. Respeta el TTL del snapshot: si la
 * foto está vigente y no se fuerza, no le pega a la fuente.
 *
 * @param {number} teamId
 * @param {object} opts { force=false, fetchRemote=true, recentLast=30 }
 * @returns {{ team_id, features, fromCache }}
 */
export async function ingestTeamData(teamId, opts = {}) {
    const { force = false, fetchRemote = true, recentLast = 30 } = opts;

    // 0) Si hay snapshot vigente y no se fuerza, reusarlo (rápido, sin tocar la fuente).
    if (!force) {
        const fresh = await getFreshSnapshot(teamId);
        if (snapshotIsFresh(fresh)) {
            return { team_id: teamId, features: fresh.features, fromCache: true };
        }
    }

    const team = await Team.findByPk(teamId);
    if (!team) throw new Error(`Selección ${teamId} no encontrada`);

    // 1) EXTRAER lo nuevo de la fuente (solo si corresponde) y AGREGAR al histórico.
    const externalId = team.external_ids?.['api-football'] || team.external_ids?.['football-data'];
    if (fetchRemote && externalId) {
        try {
            const recent = await dataProvider.getRecentMatches(externalId, { last: recentLast });
            await upsertHistory(team, recent);
        } catch (error) {
            // La base es la fuente de verdad: si la fuente falla, seguimos con lo guardado.
            console.warn(`[ingest] no se pudo refrescar ${team.code}: ${error.message}`);
        }
    }

    // 2) LEER el histórico desde la base (incluye lo recién agregado).
    const history = await HistoricalMatch.findAll({
        where: { team_id: teamId },
        order: [['match_date', 'DESC']],
        limit: 60,
    });

    // 3) CALCULAR features: forma con decaimiento + ancla de ranking.
    const form = computeForm(history.map(h => ({
        date: h.match_date,
        goals_for: h.goals_for,
        goals_against: h.goals_against,
        competition_type: h.competition_type,
    })));

    const features = {
        team_id: team.id,
        code: team.code,
        name: team.name,
        is_host: team.is_host,
        fifa_points: team.fifa_points != null ? Number(team.fifa_points) : null,
        fifa_rank: team.fifa_rank,
        elo: team.elo != null ? Number(team.elo) : null,
        form,
    };

    // 4) GUARDAR: forma derivada en el equipo + snapshot con TTL.
    await team.update({ form });
    await saveSnapshot(team.id, features, { recentCount: history.length });

    return { team_id: teamId, features, fromCache: false };
}

/**
 * Upsert idempotente de partidos al histórico (clave natural: code+opponent+fecha).
 * Resuelve el código del rival contra la tabla de selecciones cuando se puede.
 */
async function upsertHistory(team, matches) {
    if (!matches || matches.length === 0) return 0;

    // Mapa nombre→código para resolver rivales conocidos.
    const allTeams = await Team.findAll({ attributes: ['code', 'name'] });
    const nameToCode = new Map(allTeams.map(t => [normalizeName(t.name), t.code]));

    let count = 0;
    for (const m of matches) {
        const date = toDateOnly(m.date);
        if (!date) continue;
        const oppCode = m.opponent_code || nameToCode.get(normalizeName(m.opponent_name)) || null;
        try {
            await HistoricalMatch.upsert({
                team_id: team.id,
                team_code: team.code,
                opponent_code: oppCode,
                opponent_name: m.opponent_name || null,
                match_date: date,
                goals_for: m.goals_for ?? 0,
                goals_against: m.goals_against ?? 0,
                condition: m.condition || 'neutral',
                competition_type: m.competition_type || 'official',
                competition_name: m.competition_name || null,
                source: 'provider',
            });
            count++;
        } catch (error) {
            // Conflictos de clave natural: ignorar (ya existía).
        }
    }
    return count;
}

export function normalizeName(name) {
    return String(name || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toDateOnly(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

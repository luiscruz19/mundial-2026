import { Op } from 'sequelize';
import Team from '../../models/Team.js';
import Match from '../../models/Match.js';
import Standing from '../../models/Standing.js';

/**
 * Recalcula la tabla de posiciones de un grupo a partir de los partidos FINALIZADOS
 * (13.3). Materializa el resultado en la tabla `standings` y actualiza la posición
 * de cada selección en `teams.group_position`. Idempotente.
 *
 * Criterios de desempate (simplificados): puntos → diferencia de gol → goles a favor.
 */
export async function recomputeGroupStandings(group) {
    const teams = await Team.findAll({ where: { group } });
    if (teams.length === 0) return [];

    const rows = new Map(teams.map(t => [t.id, blankRow(group, t.id)]));

    const matches = await Match.findAll({
        where: {
            group,
            stage: 'group',
            status: 'finished',
            home_score: { [Op.ne]: null },
            away_score: { [Op.ne]: null },
        },
    });

    for (const m of matches) {
        const home = rows.get(m.home_team_id);
        const away = rows.get(m.away_team_id);
        if (!home || !away) continue;

        const hs = m.home_score, as = m.away_score;
        home.played++; away.played++;
        home.goals_for += hs; home.goals_against += as;
        away.goals_for += as; away.goals_against += hs;

        if (hs > as) { home.won++; home.points += 3; away.lost++; }
        else if (hs < as) { away.won++; away.points += 3; home.lost++; }
        else { home.drawn++; away.drawn++; home.points++; away.points++; }
    }

    const ranked = [...rows.values()].map(r => {
        r.goal_difference = r.goals_for - r.goals_against;
        return r;
    }).sort(compareStandingRows);

    ranked.forEach((r, i) => { r.position = i + 1; });

    // Persistir (upsert por group+team) y actualizar group_position.
    for (const r of ranked) {
        await Standing.upsert(r);
        await Team.update({ group_position: r.position }, { where: { id: r.team_id } });
    }

    return ranked;
}

/**
 * Recalcula TODOS los grupos (A..L) en una pasada.
 */
export async function recomputeAllStandings() {
    const groups = await Team.findAll({
        attributes: ['group'],
        where: { group: { [Op.ne]: null } },
        group: ['group'],
    });
    const out = [];
    for (const g of groups) {
        if (!g.group) continue;
        out.push({ group: g.group, table: await recomputeGroupStandings(g.group) });
    }
    return out;
}

function blankRow(group, teamId) {
    return {
        group, team_id: teamId,
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, position: null,
    };
}

export function compareStandingRows(x, y) {
    if (y.points !== x.points) return y.points - x.points;
    const gdx = x.goals_for - x.goals_against;
    const gdy = y.goals_for - y.goals_against;
    if (gdy !== gdx) return gdy - gdx;
    return y.goals_for - x.goals_for;
}

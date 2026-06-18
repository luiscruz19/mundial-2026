/**
 * Serializadores: dan forma a las entidades para el contrato de la app mobile.
 * Mantienen la respuesta estable y desacoplada del esquema interno.
 */

export function serializeTeam(team) {
    if (!team) return null;
    return {
        id: team.id,
        name: team.name,
        code: team.code,
        confederation: team.confederation,
        group: team.group,
        group_position: team.group_position,
        fifa_points: team.fifa_points != null ? Number(team.fifa_points) : null,
        fifa_rank: team.fifa_rank,
        rank: team.fifa_rank,
        is_host: team.is_host,
        flag_url: team.flag_url,
        form: team.form || null,
        elo: team.elo != null ? Math.round(Number(team.elo)) : null,
    };
}

export function serializeVenue(venue) {
    if (!venue) return null;
    return { id: venue.id, name: venue.name, city: venue.city, country: venue.country };
}

export function serializeSimulation(sim) {
    if (!sim) return null;
    const out = sim.output || {};
    return {
        match_id: sim.match_id,
        computed_at: sim.computed_at,
        most_likely_score: out.most_likely_score || null,
        win_prob: out.win_prob || null,
        expected_goals: out.expected_goals || null,
        scoreline_ranking: out.scoreline_ranking || [],
        comparison: sim.comparison || null,
        params: sim.params || null,
    };
}

/**
 * Serializa un partido. `team` puede venir como instancia incluida (homeTeam/awayTeam)
 * o resolverse con el mapa `teamsById`. La simulación se adjunta si se pasa.
 */
export function serializeMatch(match, { teamsById = null, simulation = undefined } = {}) {
    if (!match) return null;

    const resolveTeam = (id, included) => {
        if (included) return serializeTeam(included);
        if (teamsById && id != null) return serializeTeam(teamsById.get(id));
        return null;
    };

    const homeTeam = resolveTeam(match.home_team_id, match.homeTeam);
    const awayTeam = resolveTeam(match.away_team_id, match.awayTeam);

    const finished = match.status === 'finished';

    return {
        id: match.id,
        stage: match.stage,
        group: match.group,
        matchday: match.matchday,
        bracket_slot: match.bracket_slot,
        kickoff_utc: match.kickoff_utc,
        status: match.status,
        home_team: homeTeam,
        away_team: awayTeam,
        home_placeholder: match.home_placeholder,
        away_placeholder: match.away_placeholder,
        venue: serializeVenue(match.venue),
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: match.home_penalties,
        away_penalties: match.away_penalties,
        lineups: { home: match.home_lineup || null, away: match.away_lineup || null },
        goals: match.goals || null,
        live: match.status === 'live' ? (match.live || null) : null,
        official_result: finished ? { home: match.home_score, away: match.away_score } : null,
        simulation: simulation !== undefined ? serializeSimulation(simulation) : undefined,
    };
}

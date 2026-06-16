/**
 * Puntuación Elo de selecciones (estilo World Football Elo, eloratings.net).
 *
 * Es el ANCLA de fuerza del modelo: a diferencia del ranking FIFA, el Elo se
 * deriva de resultados reales e incorpora margen de goles, localía e importancia
 * del partido. Se recalcula recorriendo el historial cronológicamente y se mantiene
 * vivo actualizándolo al cerrar cada partido del Mundial.
 *
 * Fórmula:
 *   Rn = Ro + K · G · (W − We)
 *   We = 1 / (10^(−dr/400) + 1),  dr = (Rlocal + ventajaLocal) − Rvisitante
 *   W  = 1 victoria / 0.5 empate / 0 derrota
 *   K  = importancia del torneo (amistoso 20 … Mundial 60)
 *   G  = factor por diferencia de goles (1 / 1.5 / (11+gd)/8)
 */

export const ELO_BASE = 1500;
export const ELO_HOME_FIELD = 100; // ventaja de localía en puntos Elo (no neutral)

/** Peso por importancia del torneo (campo `tournament` del dataset). */
export function tournamentWeight(tournament) {
    const t = String(tournament || '').toLowerCase();
    if (t.includes('friendl')) return 20;
    if (t.includes('qualif')) return 40;                 // eliminatorias
    if (t.includes('fifa world cup')) return 60;         // fase final del Mundial
    if (
        t.includes('uefa euro') || t.includes('copa américa') || t.includes('copa america') ||
        t.includes('african cup') || t.includes('africa cup') || t.includes('asian cup') ||
        t.includes('gold cup') || t.includes('confederations') ||
        t.includes('oceania nations') || t.includes('nations cup')
    ) return 50;                                          // finales continentales
    if (t.includes('nations league')) return 40;
    return 30;                                            // resto de competiciones
}

/** Multiplicador por diferencia de goles. */
export function goalDiffMultiplier(goalDiff) {
    const gd = Math.abs(goalDiff);
    if (gd <= 1) return 1.0;
    if (gd === 2) return 1.5;
    return (11 + gd) / 8.0;
}

/** Probabilidad esperada del local (incluye ventaja de localía si no es neutral). */
export function expectedScore(ratingHome, ratingAway, { neutral = false } = {}) {
    const dr = (ratingHome + (neutral ? 0 : ELO_HOME_FIELD)) - ratingAway;
    return 1 / (Math.pow(10, -dr / 400) + 1);
}

/**
 * Aplica un partido y devuelve los Elo actualizados de ambos equipos.
 * @param {object} p { ratingHome, ratingAway, homeScore, awayScore, tournament, neutral }
 * @returns {{ ratingHome:number, ratingAway:number, delta:number }}
 */
export function applyMatch({ ratingHome, ratingAway, homeScore, awayScore, tournament, neutral = false }) {
    const We = expectedScore(ratingHome, ratingAway, { neutral });
    const W = homeScore > awayScore ? 1 : homeScore === awayScore ? 0.5 : 0;
    const K = tournamentWeight(tournament) * goalDiffMultiplier(homeScore - awayScore);
    const delta = K * (W - We);
    return { ratingHome: ratingHome + delta, ratingAway: ratingAway - delta, delta };
}

/**
 * Recorre TODOS los partidos (cronológicamente) y devuelve el Elo final por equipo.
 * Procesa el dataset completo (no solo las 48) para que los ratings sean correctos.
 * @param {Array<{date,home,away,home_score,away_score,tournament,neutral}>} matches
 * @returns {Map<string, number>}  nombre del equipo -> Elo
 */
export function computeEloTable(matches) {
    const ratings = new Map();
    const get = (name) => (ratings.has(name) ? ratings.get(name) : ELO_BASE);

    const sorted = [...matches].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    for (const m of sorted) {
        if (m.home_score == null || m.away_score == null) continue;
        const r = applyMatch({
            ratingHome: get(m.home), ratingAway: get(m.away),
            homeScore: m.home_score, awayScore: m.away_score,
            tournament: m.tournament, neutral: m.neutral,
        });
        ratings.set(m.home, r.ratingHome);
        ratings.set(m.away, r.ratingAway);
    }
    return ratings;
}

export default { ELO_BASE, ELO_HOME_FIELD, tournamentWeight, goalDiffMultiplier, expectedScore, applyMatch, computeEloTable };

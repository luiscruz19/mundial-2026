import CONFIG from '../../config/config.js';
import Match from '../../models/Match.js';
import Team from '../../models/Team.js';
import Simulation from '../../models/Simulation.js';
import { enrichMatch } from '../etl/enrich-match.js';
import { simulateMatch } from './simulate-match.js';

/**
 * Orquesta la simulación de un partido de punta a punta (8 / 13.4):
 *   1) verifica que sea simulable (programado, con ambas selecciones, no jugado);
 *   2) corre el enriquecimiento bajo demanda (1ª + 2ª ingeniería de datos);
 *   3) corre el motor (Poisson + Dixon-Coles);
 *   4) guarda la simulación atada al partido (params, salida y foto de datos).
 *
 * @param {number} matchId
 * @param {object} opts { force=false }  force = ignorar TTL y refrescar de la fuente
 * @returns {{ simulation, output }}
 */
export async function runSimulation(matchId, opts = {}) {
    const match = await Match.findByPk(matchId);
    if (!match) {
        const err = new Error('Partido no encontrado');
        err.code = 'MATCH_NOT_FOUND';
        throw err;
    }
    if (match.status === 'finished') {
        const err = new Error('No se puede simular un partido que ya se jugó');
        err.code = 'MATCH_ALREADY_PLAYED';
        throw err;
    }
    if (!match.home_team_id || !match.away_team_id) {
        const err = new Error('El partido aún no tiene definidas ambas selecciones');
        err.code = 'MATCH_NOT_READY';
        throw err;
    }

    // 1ª + 2ª ingeniería de datos.
    const { home, away, adjustments } = await enrichMatch(match, { force: opts.force });

    // Parámetros del modelo (calibrables) usados en esta corrida.
    const params = {
        k: CONFIG.SIMULATION.K,
        kElo: CONFIG.SIMULATION.K_ELO,
        rankingWeight: CONFIG.SIMULATION.RANKING_WEIGHT,
        totalGoals: CONFIG.SIMULATION.TOTAL_GOALS,
        rho: CONFIG.SIMULATION.RHO,
        homeAdvantage: CONFIG.SIMULATION.HOME_ADVANTAGE,
    };

    const output = simulateMatch(home, away, { params, adjustments });

    // Guardar la simulación (una vigente por partido: se reemplaza la anterior).
    const payload = {
        match_id: match.id,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        params,
        output: {
            most_likely_score: output.most_likely_score,
            win_prob: output.win_prob,
            expected_goals: output.expected_goals,
            scoreline_ranking: output.scoreline_ranking,
        },
        data_snapshot: { home, away, adjustments },
        computed_at: new Date(),
    };

    const existing = await Simulation.findOne({ where: { match_id: match.id }, order: [['computed_at', 'DESC']] });
    let simulation;
    if (existing) {
        simulation = await existing.update(payload);
    } else {
        simulation = await Simulation.create(payload);
    }

    return { simulation, output: payload.output };
}

/**
 * Arma y guarda la comparación oficial vs simulado al cerrarse el partido (13.5).
 */
export async function buildComparison(match) {
    if (match.home_score == null || match.away_score == null) return null;
    const simulation = await Simulation.findOne({ where: { match_id: match.id }, order: [['computed_at', 'DESC']] });
    if (!simulation) return null;

    const predicted = simulation.output?.most_likely_score;
    const official = { home: match.home_score, away: match.away_score };

    const resultOf = (h, a) => (h > a ? 'home' : h < a ? 'away' : 'draw');
    const predicted_result = predicted ? resultOf(predicted.home, predicted.away) : null;
    const official_result = resultOf(official.home, official.away);

    const comparison = {
        official,
        predicted,
        predicted_result_hit: predicted_result === official_result,
        exact_score_hit: predicted ? (predicted.home === official.home && predicted.away === official.away) : false,
    };

    await simulation.update({ comparison });
    return comparison;
}

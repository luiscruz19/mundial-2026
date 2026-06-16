import Team from '../../models/Team.js';
import { monteCarloProjection } from '../../services/simulation/monte-carlo.js';
import { cacheGet, cacheSet } from '../../services/cache/redis.js';
import { successMessage, errorMessage } from '../../utils/messages.js';

const CACHE_KEY = 'mundial:tournament:projection';
const CACHE_TTL = 3600; // 1h: el Monte Carlo es costoso y cambia poco entre partidos.

// ==================== PROYECCIÓN DEL TORNEO (Monte Carlo) ====================
// Quién llega más lejos y probabilidad de campeón (4.4 / 13.4 Paso 4).
export async function projection(req, res) {
    try {
        const force = req.query.force === 'true';
        if (!force) {
            const cached = await cacheGet(CACHE_KEY);
            if (cached) return res.status(200).json(successMessage({ extra: { data: cached } }));
        }

        const teams = await Team.findAll();
        const teamById = new Map(teams.map(t => [t.id, t]));
        const input = teams.map(t => ({
            id: t.id,
            code: t.code,
            name: t.name,
            group: t.group,
            is_host: t.is_host,
            fifa_points: t.fifa_points != null ? Number(t.fifa_points) : 1500,
            elo: t.elo != null ? Number(t.elo) : null,
            form: t.form || null,
        }));

        const proj = monteCarloProjection(input, {});
        const data = {
            updated_at: new Date().toISOString(),
            runs: proj.runs,
            teams: proj.teams.map(r => {
                const t = teamById.get(r.team_id);
                return {
                    team: t ? { id: t.id, name: t.name, code: t.code, group: t.group, flag_url: t.flag_url } : { id: r.team_id, code: r.code, name: r.name },
                    prob_champion: r.prob_champion,
                    prob_final: r.prob_final,
                    prob_semi: r.prob_semi,
                    prob_round_of_16: r.prob_round_of_16,
                    expected_round: Math.round(r.expected_round * 100) / 100,
                    expected_round_label: roundLabel(r.expected_round),
                };
            }),
        };

        await cacheSet(CACHE_KEY, data, CACHE_TTL);
        return res.status(200).json(successMessage({ extra: { data } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al proyectar el torneo', extra: { error: error.message } }));
    }
}

// Convierte la ronda esperada (0=fase de grupos .. 6=campeón) a etiqueta.
function roundLabel(r) {
    const labels = ['Fase de grupos', '16avos', 'Octavos', 'Cuartos', 'Semifinal', 'Final', 'Campeón'];
    const idx = Math.round(r);
    return labels[Math.min(labels.length - 1, Math.max(0, idx))];
}

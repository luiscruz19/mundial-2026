/**
 * Smoke test del motor de simulación (no requiere base de datos).
 * Valida que, con datos plausibles del Mundial 2026, el motor devuelve un
 * favorito y porcentajes coherentes (caso de referencia: Canadá–Bosnia, donde
 * Canadá —anfitrión y mejor ranking— debe quedar favorito).
 *
 * Uso: node services/simulation/smoke-test.js
 */
import { simulateMatch, monteCarloProjection } from './index.js';

function assert(cond, msg) {
    if (!cond) {
        console.error('✗ FALLÓ:', msg);
        process.exitCode = 1;
    } else {
        console.info('✓', msg);
    }
}

// Features plausibles.
const canada = {
    id: 1, code: 'CAN', name: 'Canadá', group: 'A', is_host: true,
    fifa_points: 1530, form: { attack: 1.7, defense: 0.9 },
};
const bosnia = {
    id: 2, code: 'BIH', name: 'Bosnia', group: 'A', is_host: false,
    fifa_points: 1380, form: { attack: 1.3, defense: 1.2 },
};

console.info('\n== Simulación Canadá vs Bosnia ==');
const sim = simulateMatch(canada, bosnia);
console.info('Marcador más probable:', `${sim.most_likely_score.home}-${sim.most_likely_score.away}`);
console.info('Prob (CAN / X / BIH):',
    `${(sim.win_prob.home * 100).toFixed(1)}% / ${(sim.win_prob.draw * 100).toFixed(1)}% / ${(sim.win_prob.away * 100).toFixed(1)}%`);
console.info('Goles esperados:', `${sim.expected_goals.home} - ${sim.expected_goals.away}`);
console.info('Top marcadores:', sim.scoreline_ranking.slice(0, 5)
    .map(s => `${s.home}-${s.away} (${(s.prob * 100).toFixed(1)}%)`).join(', '));

const total = sim.win_prob.home + sim.win_prob.draw + sim.win_prob.away;
assert(Math.abs(total - 1) < 0.02, 'las probabilidades 1/X/2 suman ~1');
assert(sim.win_prob.home > sim.win_prob.away, 'Canadá (anfitrión + mejor ranking) es favorito sobre Bosnia');
assert(sim.expected_goals.home > sim.expected_goals.away, 'goles esperados de Canadá > Bosnia');
assert(sim.scoreline_ranking.length > 0, 'hay ranking de marcadores');

// Mini Monte Carlo de torneo con 4 grupos de 4.
console.info('\n== Monte Carlo (8 equipos, 1000 corridas) ==');
const teams = [];
const groups = ['A', 'B'];
let id = 1;
for (const g of groups) {
    for (let i = 0; i < 4; i++) {
        teams.push({
            id: id++, code: `${g}${i}`, name: `${g}${i}`, group: g,
            is_host: false,
            fifa_points: 1600 - (i * 120) - (g === 'B' ? 30 : 0),
            form: { attack: 1.6 - i * 0.15, defense: 0.9 + i * 0.12 },
        });
    }
}
const proj = monteCarloProjection(teams, { runs: 1000 });
const top = proj.teams[0];
console.info('Favorito al título:', top.code, `${(top.prob_champion * 100).toFixed(1)}%`);
const champSum = proj.teams.reduce((a, t) => a + t.prob_champion, 0);
assert(Math.abs(champSum - 1) < 0.05, 'las probabilidades de campeón suman ~1');
assert(proj.teams[0].prob_champion >= proj.teams[proj.teams.length - 1].prob_champion, 'el mejor ranqueado tiene mayor prob. de campeón');

console.info('\nSmoke test del motor completado.\n');

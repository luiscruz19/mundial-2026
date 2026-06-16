/**
 * Motor de simulación del Mundial 2026.
 *
 * Método (sección 7): modelo de goles tipo Poisson anclado en el ranking FIFA,
 * combinado con la forma reciente (decaimiento temporal) y el head-to-head,
 * ventaja de anfitrión y corrección Dixon-Coles para los marcadores bajos.
 *
 * El cálculo por partido es cerrado (Poisson + corrección) → instantáneo; el
 * Monte Carlo del torneo corre en milisegundos. No usa ML ni servicios externos.
 */
export { simulateMatch, buildScoreMatrix } from './simulate-match.js';
export { computeLambdas } from './strength.js';
export { monteCarloProjection, samplePoisson } from './monte-carlo.js';
export { calibrate, evaluate, brierScore, logLoss } from './calibration.js';
export { poissonPmf, poissonVector } from './poisson.js';
export { dixonColesTau } from './dixon-coles.js';

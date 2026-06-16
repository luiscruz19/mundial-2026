import { factorial } from '../../utils/math.js';

/**
 * Distribución de Poisson: P(k goles | tasa λ) = e^(−λ)·λ^k / k!
 */
export function poissonPmf(k, lambda) {
    if (k < 0 || lambda <= 0) return k === 0 && lambda <= 0 ? 1 : 0;
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/**
 * Vector de probabilidades P(0..maxGoals) para una tasa λ.
 */
export function poissonVector(lambda, maxGoals) {
    const v = new Array(maxGoals + 1);
    for (let k = 0; k <= maxGoals; k++) v[k] = poissonPmf(k, lambda);
    return v;
}

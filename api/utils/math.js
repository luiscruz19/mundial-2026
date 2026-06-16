/**
 * Utilidades matemáticas sin dependencias externas (las usa el motor de simulación).
 */

const _factCache = [1, 1];

/**
 * Factorial cacheado, para la fórmula de Poisson.
 */
export function factorial(n) {
    if (n < 0) return NaN;
    if (_factCache[n] !== undefined) return _factCache[n];
    for (let i = _factCache.length; i <= n; i++) {
        _factCache[i] = _factCache[i - 1] * i;
    }
    return _factCache[n];
}

export const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

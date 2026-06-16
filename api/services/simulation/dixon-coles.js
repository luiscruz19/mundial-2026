/**
 * Corrección Dixon-Coles para los marcadores bajos (0-0, 1-0, 0-1, 1-1).
 * El Poisson puro subestima los empates y los resultados de pocos goles; el
 * parámetro ρ (rho) ajusta justamente esas cuatro celdas. ρ ≈ −0.05/−0.1 típico.
 *
 * τ(i, j) =
 *   1 − λ·μ·ρ      si (i,j) = (0,0)
 *   1 + λ·ρ        si (i,j) = (0,1)
 *   1 + μ·ρ        si (i,j) = (1,0)
 *   1 − ρ          si (i,j) = (1,1)
 *   1              en cualquier otro caso
 *
 * donde λ = tasa del local, μ = tasa del visitante.
 */
export function dixonColesTau(i, j, lambda, mu, rho) {
    if (i === 0 && j === 0) return 1 - lambda * mu * rho;
    if (i === 0 && j === 1) return 1 + lambda * rho;
    if (i === 1 && j === 0) return 1 + mu * rho;
    if (i === 1 && j === 1) return 1 - rho;
    return 1;
}

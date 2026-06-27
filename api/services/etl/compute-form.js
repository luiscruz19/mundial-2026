import CONFIG from '../../config/config.js';

/**
 * FORMA con decaimiento temporal (13.4).
 *
 * Sobre los últimos N partidos (~12), cada uno pesa w_i = exp(−díasAtrás_i / vidaMedia):
 * los recientes pesan más que los viejos. Además, el TIPO de partido modula el peso
 * (los amistosos pesan menos que los oficiales). La forma es el promedio ponderado
 * del rendimiento: goles a favor (ataque) y en contra (defensa).
 *
 * @param {Array} matches [{ date, goals_for, goals_against, competition_type, competition_name }]
 * @param {object} opts { halflifeDays, formMatches, now, friendlyWeight }
 * @returns {{ attack, defense, rating, sample, decayed_gf, decayed_ga }}
 */
export function computeForm(matches, opts = {}) {
    const S = CONFIG.SIMULATION;
    const halflife = opts.halflifeDays ?? S.FORM_HALFLIFE_DAYS;
    const limit = opts.formMatches ?? S.FORM_MATCHES;
    const weights = S.FORM_COMPETITION_WEIGHTS || {};
    const friendlyWeight = opts.friendlyWeight ?? weights.friendly ?? 0.5;
    const now = opts.now ? new Date(opts.now) : new Date();

    // Orden descendente por fecha y recorte a los N más recientes.
    const recent = [...(matches || [])]
        .filter(m => m && m.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);

    if (recent.length === 0) {
        return { attack: null, defense: null, rating: null, sample: 0, decayed_gf: null, decayed_ga: null };
    }

    let sumW = 0, sumGF = 0, sumGA = 0;
    for (const m of recent) {
        const daysAgo = Math.max(0, (now - new Date(m.date)) / (1000 * 3600 * 24));
        const decay = Math.exp(-daysAgo / halflife);
        const typeW = competitionWeight(m, weights, friendlyWeight);
        const w = decay * typeW;
        sumW += w;
        sumGF += w * Number(m.goals_for || 0);
        sumGA += w * Number(m.goals_against || 0);
    }

    if (sumW === 0) {
        return { attack: null, defense: null, rating: null, sample: recent.length, decayed_gf: null, decayed_ga: null };
    }

    const attack = sumGF / sumW;
    const defense = sumGA / sumW;
    return {
        attack: round3(attack),
        defense: round3(defense),
        rating: round3(attack - defense),
        sample: recent.length,
        decayed_gf: round3(sumGF),
        decayed_ga: round3(sumGA),
    };
}

/**
 * Peso de un partido por jerarquía de competición. Reconoce el Mundial 2026 (tanto
 * 'World Cup 2026' del cierre como 'FIFA World Cup' del dataset), eliminatorias,
 * finales continentales, Nations League y amistosos. El orden importa: 'qualification'
 * se evalúa antes que 'world cup' para no confundir eliminatoria con fase final.
 */
function competitionWeight(m, weights, friendlyWeight) {
    const name = String(m.competition_name || '').toLowerCase();
    const w = weights || {};
    const def = w.default ?? 1;
    if (name) {
        if (name.includes('qualif')) return w.qualifier ?? def;            // eliminatorias
        if (name.includes('nations league')) return w.nations_league ?? def;
        if (name.includes('world cup')) return w.world_cup ?? def;         // fase final
        if (/(euro|copa am|africa|african|asian cup|gold cup|confederations|nations cup)/.test(name)) {
            return w.continental ?? def;
        }
        if (name.includes('friendl')) return w.friendly ?? friendlyWeight;
    }
    // Sin nombre de competición: caer al tipo (amistoso vs resto).
    return m.competition_type === 'friendly' ? (w.friendly ?? friendlyWeight) : def;
}

const round3 = (x) => Math.round(x * 1000) / 1000;

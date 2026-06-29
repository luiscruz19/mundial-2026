import { THIRD_PLACE_ALLOCATION } from './third-place-allocation-table.js';

/**
 * Asignación oficial de los mejores terceros a sus cruces de 16avos (R32).
 *
 * FIFA no deja libre el emparejamiento: el Anexo C fija, para cada una de las 495
 * combinaciones posibles de "qué 8 grupos clasifican su 3°", a qué cruce va cada tercero
 * (garantizando que ningún tercero choque con un rival de su propio grupo). Antes
 * resolvíamos esto con un matching por candidatos (backtracking), que devolvía UNA
 * asignación válida pero no necesariamente la oficial: por eso aparecían cruces como
 * "Alemania (1E) vs Suecia (3F)" cuando lo correcto era "Alemania (1E) vs Paraguay (3D)".
 *
 * @see THIRD_PLACE_ALLOCATION (tabla autogenerada del Anexo C).
 */

/**
 * Busca la fila oficial para un conjunto de 8 grupos con tercero clasificado.
 * @param {string[]} thirdGroups grupos (A–L) cuyos terceros clasificaron (debe ser 8).
 * @returns {Record<string,string>|null} { "1X": "Y" } o null si no aplica.
 */
export function lookupThirdAllocation(thirdGroups) {
    if (!Array.isArray(thirdGroups) || thirdGroups.length !== 8) return null;
    const key = [...thirdGroups].sort().join('');
    return THIRD_PLACE_ALLOCATION[key] || null;
}

/**
 * Asigna los terceros a sus slots de R32.
 *
 * @param {string[]} thirdGroups grupos cuyos terceros clasificaron.
 * @param {{key:string, hostGroup:string, candidates:Set<string>}[]} slots
 *   key: identificador del slot (p.ej. "R32-3:away").
 *   hostGroup: letra del grupo cuyo 1° enfrenta a ese tercero (el "1X" del otro lado del cruce).
 *   candidates: grupos candidatos del slot (para el fallback provisorio).
 * @returns {Map<string,string>|null} Map(key → grupo del tercero) o null si no se pudo armar.
 */
export function assignThirdPlaces(thirdGroups, slots) {
    if (slots.length === 0) return new Map();

    // Caso oficial: los 8 terceros están definidos y forman una combinación del Anexo C.
    const alloc = lookupThirdAllocation(thirdGroups);
    if (alloc && slots.length === 8) {
        const map = new Map();
        let ok = true;
        for (const s of slots) {
            const g = alloc[`1${s.hostGroup}`];
            if (!g || !thirdGroups.includes(g)) { ok = false; break; }
            map.set(s.key, g);
        }
        if (ok) return map;
    }

    // Fallback (llave provisoria: aún no hay 8 terceros definidos): matching por candidatos.
    return matchThirdsByCandidates(thirdGroups, slots);
}

/** Matching perfecto grupos-con-tercero → slots, según candidatos (backtracking). Provisorio. */
function matchThirdsByCandidates(thirdGroups, slotDefs) {
    if (slotDefs.length === 0) return new Map();
    const slots = [...slotDefs].sort((a, b) => a.candidates.size - b.candidates.size);
    const assignment = new Map();
    const used = new Set();
    const bt = (i) => {
        if (i === slots.length) return true;
        for (const g of thirdGroups) {
            if (used.has(g) || !slots[i].candidates.has(g)) continue;
            assignment.set(slots[i].key, g); used.add(g);
            if (bt(i + 1)) return true;
            assignment.delete(slots[i].key); used.delete(g);
        }
        return false;
    };
    return bt(0) ? assignment : null;
}

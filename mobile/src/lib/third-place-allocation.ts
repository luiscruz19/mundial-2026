import { THIRD_PLACE_ALLOCATION } from './third-place-allocation-table';

/**
 * Asignación oficial de los mejores terceros a sus cruces de 16avos (R32). Espejo del
 * backend (api/services/etl/third-place-allocation.js).
 *
 * FIFA fija en el Anexo C, para cada una de las 495 combinaciones de "qué 8 grupos
 * clasifican su 3°", a qué cruce va cada tercero. Antes lo resolvíamos con un matching por
 * candidatos, que daba una asignación válida pero no la oficial (de ahí cruces erróneos
 * tipo "Alemania (1E) vs Suecia (3F)" en vez de "Alemania (1E) vs Paraguay (3D)").
 */

export interface ThirdSlot {
  key: string;
  hostGroup: string; // grupo cuyo 1° enfrenta a este tercero (el "1X" del otro lado del cruce)
  candidates: Set<string>;
}

/** Fila oficial para un conjunto de 8 grupos con tercero clasificado, o null. */
export function lookupThirdAllocation(thirdGroups: string[]): Record<string, string> | null {
  if (thirdGroups.length !== 8) return null;
  const key = [...thirdGroups].sort().join('');
  return THIRD_PLACE_ALLOCATION[key] ?? null;
}

/**
 * Asigna los terceros a sus slots de R32: tabla oficial cuando los 8 están definidos,
 * matching por candidatos (provisorio) mientras falten. Devuelve Map(key → grupo) o null.
 */
export function assignThirdPlaces(thirdGroups: string[], slots: ThirdSlot[]): Map<string, string> | null {
  if (slots.length === 0) return new Map();

  const alloc = lookupThirdAllocation(thirdGroups);
  if (alloc && slots.length === 8) {
    const map = new Map<string, string>();
    let ok = true;
    for (const s of slots) {
      const g = alloc[`1${s.hostGroup}`];
      if (!g || !thirdGroups.includes(g)) {
        ok = false;
        break;
      }
      map.set(s.key, g);
    }
    if (ok) return map;
  }

  return matchThirdsByCandidates(thirdGroups, slots);
}

/** Matching perfecto grupos-con-tercero → slots, según candidatos (backtracking). Provisorio. */
function matchThirdsByCandidates(thirdGroups: string[], slotDefs: ThirdSlot[]): Map<string, string> | null {
  if (slotDefs.length === 0) return new Map();
  const slots = [...slotDefs].sort((a, b) => a.candidates.size - b.candidates.size);
  const assignment = new Map<string, string>();
  const used = new Set<string>();
  const bt = (i: number): boolean => {
    if (i === slots.length) return true;
    for (const g of thirdGroups) {
      if (used.has(g) || !slots[i]!.candidates.has(g)) continue;
      assignment.set(slots[i]!.key, g);
      used.add(g);
      if (bt(i + 1)) return true;
      assignment.delete(slots[i]!.key);
      used.delete(g);
    }
    return false;
  };
  return bt(0) ? assignment : null;
}

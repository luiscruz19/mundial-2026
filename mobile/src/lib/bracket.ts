/**
 * Resolución del cuadro de eliminación en el cliente (F4/F5).
 *
 * Los partidos del bracket vienen con placeholders ("1A", "2B", "3 A/B/C/D/F", "W:R32-1").
 * Con la tabla de posiciones real (/standings) se resuelven a selecciones concretas:
 *  - "1A"/"2B": el 1°/2° del grupo según standings.
 *  - "3 X/Y/Z": uno de los 8 mejores terceros, asignado a su slot por los grupos candidatos
 *    (mismo matching que usa el backend en monte-carlo.js).
 *  - "W:R32-1": el ganador de ese cruce si ya se jugó; si no, queda como rótulo legible.
 */
import type { BracketStage, GroupStanding, Match, Team } from '@/types';

export interface ResolvedSide {
  team: Team | null; // selección resuelta, o null si todavía indeterminada
  label: string; // qué mostrar: código real o un placeholder legible
  placeholder: string;
}

/** Criterio de orden de terceros: puntos → diferencia de gol → goles a favor (como el backend). */
function cmpThird(a: GroupStanding['rows'][number], b: GroupStanding['rows'][number]) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  return b.gf - a.gf;
}

/** Matching perfecto grupos-con-tercero → slots de tercero, según candidatos (backtracking). */
function matchThirds(thirdGroups: string[], slotDefs: { key: string; candidates: Set<string> }[]) {
  if (slotDefs.length === 0) return new Map<string, string>();
  const slots = [...slotDefs].sort((a, b) => a.candidates.size - b.candidates.size);
  const assignment = new Map<string, string>();
  const used = new Set<string>();
  const bt = (i: number): boolean => {
    if (i === slots.length) return true;
    const slot = slots[i]!;
    for (const g of thirdGroups) {
      if (used.has(g) || !slot.candidates.has(g)) continue;
      assignment.set(slot.key, g);
      used.add(g);
      if (bt(i + 1)) return true;
      assignment.delete(slot.key);
      used.delete(g);
    }
    return false;
  };
  return bt(0) ? assignment : null;
}

/** Ganador de un cruce ya jugado (por goles, o penales si empató). */
function winnerOf(m: Match): Team | null {
  if (m.status !== 'finished' || !m.home_team || !m.away_team) return null;
  const s1 = m.home_score ?? 0;
  const s2 = m.away_score ?? 0;
  if (s1 > s2) return m.home_team;
  if (s2 > s1) return m.away_team;
  const p1 = m.home_penalties;
  const p2 = m.away_penalties;
  if (p1 != null && p2 != null) return p1 > p2 ? m.home_team : m.away_team;
  return null;
}

export interface BracketResolver {
  resolve: (placeholder: string | null, slot: string, side: 'home' | 'away') => ResolvedSide;
  bySlot: Map<string, Match>;
}

/**
 * Construye un resolutor de placeholders a partir de los standings y los stages del bracket.
 */
export function buildBracketResolver(standings: GroupStanding[], stages: BracketStage[]): BracketResolver {
  const byGroup: Record<string, GroupStanding> = {};
  for (const s of standings) byGroup[s.group] = s;

  // Todos los partidos del bracket por slot (para resolver W:slot).
  const bySlot = new Map<string, Match>();
  for (const st of stages) for (const m of st.matches) if (m.bracket_slot) bySlot.set(m.bracket_slot, m);

  // 8 mejores terceros (de los grupos cuyo 3° ya jugó).
  const thirds = standings
    .map((s) => ({ group: s.group, row: s.rows[2] }))
    .filter((x): x is { group: string; row: GroupStanding['rows'][number] } => !!x.row && x.row.played > 0);
  const bestThirds = [...thirds].sort((a, b) => cmpThird(a.row, b.row)).slice(0, 8);
  const thirdGroups = bestThirds.map((t) => t.group);

  // Slots de tercero con candidatos (de los cruces de R32).
  const r32 = stages.find((s) => s.round === 'R32')?.matches ?? [];
  const thirdSlots: { key: string; candidates: Set<string> }[] = [];
  for (const m of r32) {
    for (const side of ['home', 'away'] as const) {
      const ph = side === 'home' ? m.home_placeholder : m.away_placeholder;
      if (ph && ph.startsWith('3 ')) {
        thirdSlots.push({ key: `${m.bracket_slot}:${side}`, candidates: new Set(ph.slice(2).split('/').map((s) => s.trim())) });
      }
    }
  }
  const thirdAssignment = thirdGroups.length >= thirdSlots.length ? matchThirds(thirdGroups, thirdSlots) : null;

  const resolve = (placeholder: string | null, slot: string, side: 'home' | 'away'): ResolvedSide => {
    const ph = placeholder ?? '';
    if (!ph) return { team: null, label: '—', placeholder: '' };

    if (ph.startsWith('W:')) {
      const prev = bySlot.get(ph.slice(2));
      const w = prev ? winnerOf(prev) : null;
      if (w) return { team: w, label: w.code, placeholder: ph };
      return { team: null, label: `Ganador ${ph.slice(2)}`, placeholder: ph };
    }
    if (ph.startsWith('L:')) {
      return { team: null, label: `Perdedor ${ph.slice(2)}`, placeholder: ph };
    }
    if (ph.startsWith('3 ')) {
      const g = thirdAssignment?.get(`${slot}:${side}`);
      const team = g ? byGroup[g]?.rows[2]?.team ?? null : null;
      return { team, label: team?.code ?? `3º ${ph.slice(2)}`, placeholder: ph };
    }
    // "1A" / "2B"
    const pos = Number(ph[0]);
    const grp = ph.slice(1);
    const team = byGroup[grp]?.rows[pos - 1]?.team ?? null;
    return { team, label: team?.code ?? ph, placeholder: ph };
  };

  return { resolve, bySlot };
}

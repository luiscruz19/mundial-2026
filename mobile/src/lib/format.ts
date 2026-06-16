/**
 * Helpers de presentación derivados de las formas reales del backend:
 * etiquetas de etapa, nombres/códigos de equipos de un Match (con placeholders),
 * estado simplificado y muestreo ponderado de marcadores para el simulador.
 */
import type { Match, MatchStage, ScoreProb, Team } from '@/types';

const STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Fase de grupos',
  round_of_32: '16avos de final',
  round_of_16: 'Octavos de final',
  quarter_final: 'Cuartos de final',
  semi_final: 'Semifinal',
  third_place: 'Tercer puesto',
  final: 'Final',
};

const ROUND_SHORT: Record<string, string> = {
  R32: '16avos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semis',
  '3P': '3er puesto',
  F: 'Final',
};

/** Etiqueta legible de la etapa de un partido (incluye grupo/jornada). */
export function stageLabel(m: Pick<Match, 'stage' | 'group' | 'matchday'>): string {
  if (m.stage === 'group') {
    const j = m.matchday ? ` · Jornada ${m.matchday}` : '';
    return `Grupo ${m.group ?? ''}${j}`.trim();
  }
  return STAGE_LABELS[m.stage] ?? m.stage;
}

/** Etiqueta corta de una ronda de la llave. */
export function roundShort(round: string): string {
  return ROUND_SHORT[round] ?? round;
}

/** Nombre a mostrar para el lado local/visitante (equipo real o placeholder). */
export function sideName(team: Team | null, placeholder: string | null): string {
  return team?.name ?? placeholder ?? 'Por definir';
}

/** Código FIFA del lado (para la bandera dibujada); '' si aún no está definido. */
export function sideCode(team: Team | null): string {
  return team?.code ?? '';
}

/** ¿El partido se está jugando ahora? */
export function isLive(m: Pick<Match, 'status'>): boolean {
  return m.status === 'live';
}

/** ¿El partido ya terminó? */
export function isFinished(m: Pick<Match, 'status'>): boolean {
  return m.status === 'finished';
}

/**
 * Muestrea un marcador del ranking real ponderado por probabilidad.
 * Si el ranking está vacío, cae a 0-0.
 */
export function sampleScoreline(ranking: ScoreProb[]): { home: number; away: number } {
  if (!ranking.length) return { home: 0, away: 0 };
  const total = ranking.reduce((a, s) => a + s.prob, 0) || 1;
  let r = Math.random() * total;
  for (const s of ranking) {
    r -= s.prob;
    if (r <= 0) return { home: s.home, away: s.away };
  }
  const last = ranking[ranking.length - 1]!;
  return { home: last.home, away: last.away };
}

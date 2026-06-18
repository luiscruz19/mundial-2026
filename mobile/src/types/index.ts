/**
 * Interfaces TypeScript de todas las entidades del contrato de la API.
 * Estas formas reflejan exactamente lo que el backend expone (ver _serializers.js).
 */

// ---------------------------------------------------------------------------
// Respuesta genérica de la API: { status: 1, ... } éxito / { status: 0, message } error.
// Los datos útiles vienen siempre en `data`.
// ---------------------------------------------------------------------------
export interface ApiSuccess<T> {
  status: 1;
  data: T;
  message?: string;
}

export interface ApiError {
  status: 0;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Tema / idioma
// ---------------------------------------------------------------------------
export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'es';

// ---------------------------------------------------------------------------
// Selecciones (teams)
// ---------------------------------------------------------------------------
export interface TeamForm {
  attack: number;
  defense: number;
  rating: number;
  sample: number;
}

export interface Team {
  id: number;
  name: string;
  code: string; // ej. "ARG"
  confederation: string; // ej. "CONMEBOL", "UEFA", ...
  group: string; // ej. "A" ... "L"
  group_position: number;
  fifa_points: number | null;
  fifa_rank: number | null;
  rank: number | null;
  is_host: boolean;
  flag_url: string | null;
  form: TeamForm | null;
}

// ---------------------------------------------------------------------------
// Dispositivo y preferencias
// ---------------------------------------------------------------------------
export interface NotificationPrefs {
  reminder_day: boolean; // recordatorio un día antes
  reminder_hour: boolean; // recordatorio una hora antes
  match_start: boolean; // inicio del partido
  goal: boolean; // gol
  final_result: boolean; // resultado final
}

export interface DevicePrefs {
  device_uuid: string;
  platform?: string;
  timezone: string;
  theme: ThemeMode;
  language: Language;
  onboarding_completed?: boolean;
  teams_of_interest: number[]; // ids de selecciones
  notifications: NotificationPrefs;
}

export interface RegisterDeviceBody {
  device_uuid: string;
  platform: string;
  push_token: string | null;
  timezone: string;
}

export interface UpdatePushTokenBody {
  device_uuid: string;
  push_token: string;
}

export interface UpdatePreferencesBody {
  device_uuid: string;
  teams_of_interest: number[];
  notifications: NotificationPrefs;
  timezone: string;
  theme: ThemeMode;
  language: Language;
}

// ---------------------------------------------------------------------------
// Partidos (matches)
// ---------------------------------------------------------------------------
export type MatchStage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Venue {
  id: number;
  name: string;
  city: string;
  country: string;
}

export interface LineupPlayer {
  name: string;
  number: number | null;
  pos: string | null;
}

export interface LineupSide {
  formation: string | null;
  players: LineupPlayer[];
}

export interface MatchLineups {
  home: LineupSide | null;
  away: LineupSide | null;
}

export interface MatchGoal {
  minute: number;
  team: 'home' | 'away';
  player: string;
}

export interface LiveState {
  minute: number;
  period: string;
  home_score: number;
  away_score: number;
  updated_at: string;
}

export interface OfficialResult {
  home: number;
  away: number;
}

export interface Match {
  id: number;
  stage: MatchStage;
  group: string | null;
  matchday: number | null;
  bracket_slot: string | null;
  kickoff_utc: string; // ISO 8601 en UTC
  status: MatchStatus;
  home_team: Team | null;
  away_team: Team | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue: Venue | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  lineups: MatchLineups | null;
  goals: MatchGoal[] | null;
  live: LiveState | null;
  official_result: OfficialResult | null;
  simulation: Simulation | null;
  home_recent?: RecentMatch[];
  away_recent?: RecentMatch[];
}

/** Partido reciente del Mundial de una selección (orientado desde su óptica). */
export interface RecentMatch {
  match_id: number;
  date: string; // ISO
  stage: MatchStage;
  group: string | null;
  opponent_code: string | null;
  opponent_name: string | null;
  goals_for: number;
  goals_against: number;
  result: 'W' | 'D' | 'L';
}

// ---------------------------------------------------------------------------
// Simulaciones
// ---------------------------------------------------------------------------
export interface ScoreProb {
  home: number;
  away: number;
  prob: number; // 0..1
}

export interface SimulationComparison {
  official: { home: number; away: number };
  predicted: { home: number; away: number };
  predicted_result_hit: boolean;
  exact_score_hit: boolean;
}

export interface Simulation {
  match_id: number;
  computed_at: string; // ISO
  most_likely_score: { home: number; away: number };
  win_prob: { home: number; draw: number; away: number }; // 0..1 cada uno
  expected_goals: { home: number; away: number };
  scoreline_ranking: ScoreProb[];
  comparison: SimulationComparison | null;
  params: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Tabla de posiciones (standings)
// ---------------------------------------------------------------------------
export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goles a favor
  ga: number; // goles en contra
  gd: number; // diferencia de gol
  points: number;
  position: number;
}

export interface GroupStanding {
  group: string;
  rows: StandingRow[];
}

// ---------------------------------------------------------------------------
// Detalle de una selección
// ---------------------------------------------------------------------------
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW' | null;

export interface TeamPlayer {
  id: number;
  name: string;
  position: PlayerPosition;
  shirt_number: number | null;
  club: string | null;
  status: string | null;
}

export interface RecentResult {
  date: string;
  opponent_code: string;
  opponent_name: string;
  goals_for: number;
  goals_against: number;
  result: 'W' | 'D' | 'L';
}

export interface TeamDetailStanding {
  group: string;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
}

export interface TeamDetail {
  team: Team;
  standing: TeamDetailStanding | null;
  matches: Match[];
  players: TeamPlayer[];
  recent: RecentResult[];
}

// ---------------------------------------------------------------------------
// Bracket / llave
// ---------------------------------------------------------------------------
export type BracketRound = 'R32' | 'R16' | 'QF' | 'SF' | '3P' | 'F';

export interface BracketStage {
  round: BracketRound;
  stage: MatchStage;
  matches: Match[];
}

// ---------------------------------------------------------------------------
// Proyección del torneo (Monte Carlo)
// ---------------------------------------------------------------------------
export interface ProjectionTeam {
  id: number;
  name: string;
  code: string;
  group: string;
  flag_url: string | null;
}

export interface TeamProjection {
  team: ProjectionTeam;
  prob_champion: number; // 0..1
  prob_final: number;
  prob_semi: number;
  prob_round_of_16: number;
  expected_round: number; // 0..6
  expected_round_label: string;
}

export interface TournamentProjection {
  updated_at: string;
  runs: number;
  teams: TeamProjection[];
}

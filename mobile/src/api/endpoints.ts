/**
 * Funciones tipadas por recurso. Cada una mapea 1:1 con un endpoint del contrato.
 */
import { apiClient } from './client';
import type {
  BracketStage,
  DevicePrefs,
  GroupStanding,
  Match,
  RegisterDeviceBody,
  Simulation,
  Team,
  TeamDetail,
  TournamentProjection,
  UpdatePreferencesBody,
  UpdatePushTokenBody,
} from '@/types';

// ----------------------------- Devices -----------------------------
export const DevicesApi = {
  /** POST /devices/register */
  register: (body: RegisterDeviceBody) =>
    apiClient.post<DevicePrefs>('/devices/register', body),

  /** PATCH /devices/push-token */
  updatePushToken: (body: UpdatePushTokenBody) =>
    apiClient.patch<{ device_uuid: string }>('/devices/push-token', body),

  /** GET /devices/me?device_uuid=... */
  me: (deviceUuid: string) =>
    apiClient.get<DevicePrefs>('/devices/me', { device_uuid: deviceUuid }),

  /** PUT /devices/preferences */
  updatePreferences: (body: UpdatePreferencesBody) =>
    apiClient.put<DevicePrefs>('/devices/preferences', body),
};

// ----------------------------- Teams -----------------------------
export const TeamsApi = {
  /** GET /teams */
  list: (signal?: AbortSignal) => apiClient.get<Team[]>('/teams', undefined, signal),

  /** GET /teams/:id */
  detail: (id: number | string, signal?: AbortSignal) =>
    apiClient.get<TeamDetail>(`/teams/${id}`, undefined, signal),
};

// ----------------------------- Matches -----------------------------
export interface MatchesFilter {
  day?: string; // YYYY-MM-DD
  group?: string;
  team?: number | string; // id
  stage?: string;
  status?: string;
  // Compatible con QueryParams (buildQuery) sin perder el tipado de arriba.
  [key: string]: string | number | undefined;
}

export const MatchesApi = {
  /** GET /matches?day=&group=&team=&stage=&status= */
  list: (filter: MatchesFilter = {}, signal?: AbortSignal) =>
    apiClient.get<Match[]>('/matches', filter, signal),

  /** GET /matches/:id */
  detail: (id: number | string, signal?: AbortSignal) =>
    apiClient.get<{ match: Match }>(`/matches/${id}`, undefined, signal).then((d) => d.match),
};

// ----------------------------- Standings -----------------------------
export const StandingsApi = {
  /** GET /standings */
  list: (signal?: AbortSignal) => apiClient.get<GroupStanding[]>('/standings', undefined, signal),
};

// ----------------------------- Bracket -----------------------------
export const BracketApi = {
  /** GET /bracket */
  list: (signal?: AbortSignal) => apiClient.get<BracketStage[]>('/bracket', undefined, signal),
};

// ----------------------------- Simulations -----------------------------
export const SimulationsApi = {
  /** POST /simulations { device_uuid, match_id, force? } */
  run: (deviceUuid: string, matchId: number | string, force = false) =>
    apiClient
      .post<{ simulation: Simulation }>('/simulations', {
        device_uuid: deviceUuid,
        match_id: matchId,
        force,
      })
      .then((d) => d.simulation),

  /** GET /simulations/:matchId (puede dar 404 si no existe) */
  get: (matchId: number | string, signal?: AbortSignal) =>
    apiClient.get<Simulation>(`/simulations/${matchId}`, undefined, signal),
};

// ----------------------------- Tournament -----------------------------
export const TournamentApi = {
  /** GET /tournament/projection */
  projection: (signal?: AbortSignal) =>
    apiClient.get<TournamentProjection>('/tournament/projection', undefined, signal),
};

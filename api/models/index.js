import sequelize from '../db/sequelize.js';

import Team from './Team.js';
import Player from './Player.js';
import Venue from './Venue.js';
import Match from './Match.js';
import HistoricalMatch from './HistoricalMatch.js';
import Standing from './Standing.js';
import Simulation from './Simulation.js';
import TeamSnapshot from './TeamSnapshot.js';
import Device from './Device.js';
import DeviceTeam from './DeviceTeam.js';
import ScheduledNotification from './ScheduledNotification.js';

/**
 * Asociaciones.
 * Se usan FK lógicas (constraints:false): la relación existe para los includes/queries
 * pero no se crea una FK física en la base, igual que en el resto de los proyectos.
 * Evita conflictos de sync con paranoid (soft-delete) y orden de creación de tablas.
 */

// Selección ─< Jugadores (plantel)
Team.hasMany(Player, { foreignKey: 'team_id', as: 'players', constraints: false });
Player.belongsTo(Team, { foreignKey: 'team_id', as: 'team', constraints: false });

// Partido ─ local / visitante
Match.belongsTo(Team, { foreignKey: 'home_team_id', as: 'homeTeam', constraints: false });
Match.belongsTo(Team, { foreignKey: 'away_team_id', as: 'awayTeam', constraints: false });
Team.hasMany(Match, { foreignKey: 'home_team_id', as: 'homeMatches', constraints: false });
Team.hasMany(Match, { foreignKey: 'away_team_id', as: 'awayMatches', constraints: false });

// Partido ─ sede
Match.belongsTo(Venue, { foreignKey: 'venue_id', as: 'venue', constraints: false });
Venue.hasMany(Match, { foreignKey: 'venue_id', as: 'matches', constraints: false });

// Partido ─< Simulaciones
Match.hasMany(Simulation, { foreignKey: 'match_id', as: 'simulations', constraints: false });
Simulation.belongsTo(Match, { foreignKey: 'match_id', as: 'match', constraints: false });

// Selección ─< Histórico (por team_id; la clave natural usa team_code)
Team.hasMany(HistoricalMatch, { foreignKey: 'team_id', as: 'history', constraints: false });
HistoricalMatch.belongsTo(Team, { foreignKey: 'team_id', as: 'team', constraints: false });

// Selección ─ Tabla de posiciones
Standing.belongsTo(Team, { foreignKey: 'team_id', as: 'team', constraints: false });
Team.hasOne(Standing, { foreignKey: 'team_id', as: 'standing', constraints: false });

// Selección ─ Snapshot de datos (1:1)
Team.hasOne(TeamSnapshot, { foreignKey: 'team_id', as: 'snapshot', constraints: false });
TeamSnapshot.belongsTo(Team, { foreignKey: 'team_id', as: 'team', constraints: false });

// Dispositivo ─< Selecciones de interés (N:M vía device_teams)
Device.belongsToMany(Team, { through: DeviceTeam, foreignKey: 'device_id', otherKey: 'team_id', as: 'teamsOfInterest', constraints: false });
Team.belongsToMany(Device, { through: DeviceTeam, foreignKey: 'team_id', otherKey: 'device_id', as: 'interestedDevices', constraints: false });
Device.hasMany(DeviceTeam, { foreignKey: 'device_id', as: 'deviceTeams', constraints: false });
DeviceTeam.belongsTo(Device, { foreignKey: 'device_id', as: 'device', constraints: false });
DeviceTeam.belongsTo(Team, { foreignKey: 'team_id', as: 'team', constraints: false });

// Dispositivo ─< Notificaciones programadas
Device.hasMany(ScheduledNotification, { foreignKey: 'device_id', as: 'scheduledNotifications', constraints: false });
ScheduledNotification.belongsTo(Device, { foreignKey: 'device_id', as: 'device', constraints: false });
ScheduledNotification.belongsTo(Match, { foreignKey: 'match_id', as: 'match', constraints: false });

export {
    sequelize,
    Team,
    Player,
    Venue,
    Match,
    HistoricalMatch,
    Standing,
    Simulation,
    TeamSnapshot,
    Device,
    DeviceTeam,
    ScheduledNotification,
};

export default {
    sequelize,
    Team,
    Player,
    Venue,
    Match,
    HistoricalMatch,
    Standing,
    Simulation,
    TeamSnapshot,
    Device,
    DeviceTeam,
    ScheduledNotification,
};

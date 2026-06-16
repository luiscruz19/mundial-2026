import { Op } from 'sequelize';
import Device from '../../models/Device.js';
import DeviceTeam from '../../models/DeviceTeam.js';
import Match from '../../models/Match.js';
import ScheduledNotification from '../../models/ScheduledNotification.js';
import Team from '../../models/Team.js';

/**
 * Planificador de notificaciones (4.5). Conoce los horarios de los partidos y, para
 * cada dispositivo, programa los avisos de los partidos de SUS selecciones de interés
 * según su configuración: recordatorio un día antes, una hora antes, y al inicio.
 *
 * El aviso de GOL y el de RESULTADO FINAL son por evento (capa en vivo / cierre del
 * partido), no se pre-programan acá. Idempotente vía `dedupe_key`.
 */

const PRE_TYPES = [
    { type: 'reminder_day', pref: 'reminder_day', offsetMs: 24 * 3600 * 1000 },
    { type: 'reminder_hour', pref: 'reminder_hour', offsetMs: 1 * 3600 * 1000 },
    { type: 'match_start', pref: 'match_start', offsetMs: 0 },
];

/**
 * (Re)programa las notificaciones futuras de un dispositivo.
 */
export async function rescheduleForDevice(deviceId) {
    const device = await Device.findByPk(deviceId);
    if (!device || device.status !== 'active') return 0;

    const prefs = device.notifications || {};
    const teamRows = await DeviceTeam.findAll({ where: { device_id: deviceId }, attributes: ['team_id'] });
    const teamIds = teamRows.map(t => t.team_id);

    // Cancelar lo programado aún no enviado (se vuelve a crear lo que corresponda).
    await ScheduledNotification.destroy({
        where: { device_id: deviceId, status: 'scheduled', type: { [Op.in]: PRE_TYPES.map(p => p.type) } },
    });

    if (teamIds.length === 0) return 0;

    const now = new Date();
    const matches = await Match.findAll({
        where: {
            status: 'scheduled',
            kickoff_utc: { [Op.gt]: now },
            [Op.or]: [{ home_team_id: { [Op.in]: teamIds } }, { away_team_id: { [Op.in]: teamIds } }],
        },
        include: [
            { model: Team, as: 'homeTeam', required: false },
            { model: Team, as: 'awayTeam', required: false },
        ],
        order: [['kickoff_utc', 'ASC']],
    });

    let created = 0;
    for (const match of matches) {
        const teamId = teamIds.includes(match.home_team_id) ? match.home_team_id : match.away_team_id;
        const label = matchLabel(match);
        for (const p of PRE_TYPES) {
            if (prefs[p.pref] === false) continue;
            const when = new Date(new Date(match.kickoff_utc).getTime() - p.offsetMs);
            if (when <= now) continue; // ya pasó el momento del aviso
            const dedupe = `device:${deviceId}:match:${match.id}:${p.type}`;
            const [, isNew] = await ScheduledNotification.findOrCreate({
                where: { dedupe_key: dedupe },
                defaults: {
                    device_id: deviceId, match_id: match.id, team_id: teamId,
                    type: p.type, scheduled_for: when, status: 'scheduled',
                    title: titleFor(p.type, label), body: bodyFor(p.type, label, match),
                    payload: { match_id: match.id, type: p.type }, dedupe_key: dedupe,
                },
            });
            if (isNew) created++;
        }
    }
    return created;
}

/**
 * Reprograma todos los dispositivos activos (para el cron diario, por si entraron
 * partidos nuevos o cambiaron horarios).
 */
export async function rescheduleAllDevices() {
    const devices = await Device.findAll({ where: { status: 'active' }, attributes: ['id'] });
    let total = 0;
    for (const d of devices) total += await rescheduleForDevice(d.id);
    return total;
}

function matchLabel(match) {
    const h = match.homeTeam?.name || match.home_placeholder || 'Local';
    const a = match.awayTeam?.name || match.away_placeholder || 'Visitante';
    return `${h} vs ${a}`;
}

function titleFor(type, label) {
    switch (type) {
        case 'reminder_day': return `Mañana juega: ${label}`;
        case 'reminder_hour': return `En 1 hora: ${label}`;
        case 'match_start': return `¡Empieza! ${label}`;
        default: return label;
    }
}

function bodyFor(type, label, match) {
    switch (type) {
        case 'reminder_day': return 'Recordá que mañana juega tu selección.';
        case 'reminder_hour': return 'Falta una hora para el partido.';
        case 'match_start': return 'El partido está por comenzar.';
        default: return label;
    }
}

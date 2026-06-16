import { Op } from 'sequelize';
import Device from '../../models/Device.js';
import DeviceTeam from '../../models/DeviceTeam.js';
import ScheduledNotification from '../../models/ScheduledNotification.js';
import { sendPushToDevice } from './send-push.js';

/**
 * Notificación por EVENTO (gol / resultado final). A diferencia de los recordatorios,
 * no se pre-programa: se dispara en el momento a todos los dispositivos que siguen a
 * alguna de las dos selecciones del partido y tienen ese aviso activado.
 *
 * Idempotente por `dedupe_key` (ej: incluye el marcador del gol para no repetir).
 *
 * @param {object} match  instancia del partido (con home_team_id / away_team_id)
 * @param {'goal'|'final_result'} type
 * @param {object} content { title, body, dedupeSuffix }
 */
export async function notifyMatchEvent(match, type, content = {}) {
    const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean);
    if (teamIds.length === 0) return { sent: 0 };

    const deviceLinks = await DeviceTeam.findAll({ where: { team_id: { [Op.in]: teamIds } }, attributes: ['device_id', 'team_id'] });
    if (deviceLinks.length === 0) return { sent: 0 };

    // device_id → team_id de interés (el primero que matchee).
    const deviceTeam = new Map();
    for (const l of deviceLinks) if (!deviceTeam.has(l.device_id)) deviceTeam.set(l.device_id, l.team_id);

    const deviceIds = [...deviceTeam.keys()];
    const devices = await Device.findAll({ where: { id: { [Op.in]: deviceIds }, status: 'active' } });

    let sent = 0;
    for (const device of devices) {
        const prefs = device.notifications || {};
        if (prefs[type] === false) continue;

        const dedupe = `device:${device.id}:match:${match.id}:${type}:${content.dedupeSuffix || ''}`;
        const [notif, isNew] = await ScheduledNotification.findOrCreate({
            where: { dedupe_key: dedupe },
            defaults: {
                device_id: device.id, match_id: match.id, team_id: deviceTeam.get(device.id),
                type, scheduled_for: new Date(), status: 'scheduled',
                title: content.title, body: content.body,
                payload: { match_id: match.id, type }, dedupe_key: dedupe,
            },
        });
        if (!isNew && notif.status === 'sent') continue; // ya se mandó

        const result = await sendPushToDevice(device.id, {
            title: content.title, body: content.body, data: { match_id: match.id, type },
        });
        await notif.update({ status: result.sent ? 'sent' : 'failed', sent_at: result.sent ? new Date() : null });
        if (result.sent) sent++;
    }
    return { sent };
}

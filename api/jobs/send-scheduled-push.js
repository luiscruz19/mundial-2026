import cron from 'node-cron';
import { Op } from 'sequelize';
import ScheduledNotification from '../models/ScheduledNotification.js';
import { sendPushToDevice } from '../services/notification/send-push.js';

/**
 * Despacho de las notificaciones programadas cuyo momento ya llegó (recordatorio
 * un día antes, una hora antes, inicio). El gol y el resultado final son por evento.
 */
export async function runSendScheduledPush(now = new Date()) {
    const due = await ScheduledNotification.findAll({
        where: {
            status: 'scheduled',
            scheduled_for: { [Op.lte]: now },
            type: { [Op.in]: ['reminder_day', 'reminder_hour', 'match_start'] },
        },
        limit: 500,
        order: [['scheduled_for', 'ASC']],
    });

    let sent = 0, failed = 0;
    for (const notif of due) {
        const result = await sendPushToDevice(notif.device_id, {
            title: notif.title,
            body: notif.body,
            data: notif.payload || { match_id: notif.match_id, type: notif.type },
        });
        await notif.update({
            status: result.sent ? 'sent' : 'failed',
            sent_at: result.sent ? new Date() : null,
        });
        result.sent ? sent++ : failed++;
    }

    if (sent > 0 || failed > 0) console.info(`[send-push] enviadas: ${sent}, fallidas: ${failed}`);
    return { sent, failed };
}

export default function scheduleSendScheduledPush() {
    // Cada minuto, para respetar los horarios de los recordatorios.
    cron.schedule('* * * * *', () => {
        runSendScheduledPush().catch(e => console.error('[send-push]', e.message));
    });
}

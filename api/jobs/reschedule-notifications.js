import cron from 'node-cron';
import { rescheduleAllDevices } from '../services/notification/scheduler.js';

/**
 * Reprograma las notificaciones de todos los dispositivos (por si entraron partidos
 * nuevos, se resolvieron cruces de la fase final o cambiaron horarios). Corre 1 vez
 * por día; el guardado de preferencias del usuario ya reprograma su propio dispositivo.
 */
export async function runRescheduleNotifications() {
    const created = await rescheduleAllDevices();
    if (created > 0) console.info(`[reschedule] ${created} notificaciones programadas`);
    return { created };
}

export default function scheduleRescheduleNotifications() {
    // 05:00 UTC todos los días.
    cron.schedule('0 5 * * *', () => {
        runRescheduleNotifications().catch(e => console.error('[reschedule]', e.message));
    });
}

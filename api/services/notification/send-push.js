import Device from '../../models/Device.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envía una notificación push a un Expo push token (por debajo, FCM en Android y
 * APNs en iOS). El envío por Expo es gratis y sin límite (4.5 / sección 12).
 */
export async function sendExpoPush(token, { title, body, data = {} }) {
    if (!token) return { sent: false, reason: 'sin push token' };
    try {
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
        });
        const json = await res.json().catch(() => null);
        // Expo devuelve { data: { status: 'ok'|'error' } }.
        const ok = res.ok && json?.data?.status !== 'error';
        return { sent: ok, response: json };
    } catch (e) {
        return { sent: false, reason: e.message };
    }
}

/**
 * Envía varias push en lote (Expo acepta un array en `to`/cuerpo).
 */
export async function sendExpoPushBatch(messages) {
    const valid = messages.filter(m => m.to);
    if (valid.length === 0) return { sent: 0 };
    try {
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(valid.map(m => ({ to: m.to, title: m.title, body: m.body, data: m.data || {}, sound: 'default' }))),
        });
        const json = await res.json().catch(() => null);
        return { sent: res.ok ? valid.length : 0, response: json };
    } catch (e) {
        return { sent: 0, reason: e.message };
    }
}

/**
 * Resuelve el token del dispositivo y le manda la push.
 */
export async function sendPushToDevice(deviceId, payload) {
    const device = await Device.findOne({ where: { id: deviceId, status: 'active' } });
    if (!device?.push_token) return { sent: false, reason: 'sin push token' };
    return sendExpoPush(device.push_token, payload);
}

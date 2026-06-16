import { Op } from 'sequelize';
import Device from '../../models/Device.js';
import DeviceTeam from '../../models/DeviceTeam.js';
import Team from '../../models/Team.js';
import { successMessage, errorMessage } from '../../utils/messages.js';
import { rescheduleForDevice } from '../../services/notification/scheduler.js';

// ==================== REGISTRAR / ACTUALIZAR DISPOSITIVO ====================
// Identidad anónima: al instalar, la app registra su uuid + push token + zona horaria.
export async function register(req, res) {
    try {
        const { device_uuid, platform, push_token, timezone } = req.body;

        const [device] = await Device.findOrCreate({
            where: { device_uuid },
            defaults: {
                device_uuid,
                platform: platform ?? null,
                push_token: push_token ?? null,
                timezone: timezone || 'UTC',
                last_seen_at: new Date(),
            },
        });

        await device.update({
            platform: platform ?? device.platform,
            push_token: push_token ?? device.push_token,
            timezone: timezone ?? device.timezone,
            status: 'active',
            last_seen_at: new Date(),
        });

        return res.status(200).json(successMessage({ message: 'Dispositivo registrado', extra: { data: await serializeDevice(device) } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al registrar el dispositivo', extra: { error: error.message } }));
    }
}

// ==================== ACTUALIZAR PUSH TOKEN ====================
export async function updatePushToken(req, res) {
    try {
        const { device_uuid, push_token } = req.body;
        const device = await Device.findOne({ where: { device_uuid, status: 'active' } });
        if (!device) return res.status(404).json(errorMessage({ message: 'Dispositivo no encontrado' }));
        await device.update({ push_token, last_seen_at: new Date() });
        return res.status(200).json(successMessage({ message: 'Token actualizado', extra: { data: await serializeDevice(device) } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al actualizar el token', extra: { error: error.message } }));
    }
}

// ==================== MIS PREFERENCIAS ====================
export async function getMe(req, res) {
    try {
        const device_uuid = req.query.device_uuid;
        const device = await Device.findOne({ where: { device_uuid } });
        if (!device) return res.status(404).json(errorMessage({ message: 'Dispositivo no encontrado' }));
        return res.status(200).json(successMessage({ extra: { data: await serializeDevice(device) } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al obtener las preferencias', extra: { error: error.message } }));
    }
}

// ==================== GUARDAR PREFERENCIAS (onboarding / ajustes) ====================
export async function updatePreferences(req, res) {
    try {
        const { device_uuid, teams_of_interest, notifications, timezone, theme, language } = req.body;
        const device = await Device.findOne({ where: { device_uuid } });
        if (!device) return res.status(404).json(errorMessage({ message: 'Dispositivo no encontrado' }));

        await device.update({
            notifications: notifications ?? device.notifications,
            timezone: timezone ?? device.timezone,
            theme: theme ?? device.theme,
            language: language ?? device.language,
            onboarding_completed: true,
            last_seen_at: new Date(),
        });

        // Reconciliar selecciones de interés (N:M).
        if (Array.isArray(teams_of_interest)) {
            const ids = [...new Set(teams_of_interest.map(Number).filter(Boolean))];
            // Validar que existan.
            const valid = ids.length
                ? (await Team.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id'] })).map(t => t.id)
                : [];
            await DeviceTeam.destroy({ where: { device_id: device.id } });
            for (const teamId of valid) {
                await DeviceTeam.findOrCreate({ where: { device_id: device.id, team_id: teamId } });
            }
        }

        // (Re)programar las notificaciones según el nuevo set de selecciones/preferencias.
        try {
            await rescheduleForDevice(device.id);
        } catch (e) {
            console.warn('[device] no se pudieron reprogramar notificaciones:', e.message);
        }

        return res.status(200).json(successMessage({ message: 'Preferencias guardadas', extra: { data: await serializeDevice(device) } }));
    } catch (error) {
        return res.status(500).json(errorMessage({ message: 'Error al guardar las preferencias', extra: { error: error.message } }));
    }
}

async function serializeDevice(device) {
    const teams = await DeviceTeam.findAll({ where: { device_id: device.id }, attributes: ['team_id'] });
    return {
        device_uuid: device.device_uuid,
        platform: device.platform,
        timezone: device.timezone,
        theme: device.theme,
        language: device.language,
        notifications: device.notifications,
        onboarding_completed: device.onboarding_completed,
        teams_of_interest: teams.map(t => t.team_id),
    };
}

import { Router } from 'express';
import {
    register,
    updatePushToken,
    getMe,
    updatePreferences,
} from '../../controllers/device/device.controllers.js';
import {
    registerDeviceValidation,
    updatePushTokenValidation,
    getMeValidation,
    preferencesValidation,
} from '../../validations/device.validation.js';
import { validate } from '../../utils/helpers.js';

const devices = Router();

devices.post('/register', validate(registerDeviceValidation), register);
devices.patch('/push-token', validate(updatePushTokenValidation), updatePushToken);
devices.get('/me', validate(getMeValidation), getMe);
devices.put('/preferences', validate(preferencesValidation), updatePreferences);

export default devices;

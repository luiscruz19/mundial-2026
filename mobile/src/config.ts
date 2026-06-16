/**
 * Configuración de la app leída de variables de entorno nativas.
 * Usa react-native-config (.env -> Config.API_URL), con fallback al server
 * de producción si no hay .env (p.ej. en un checkout limpio).
 *
 * Para builds/ejecución local copiá .env.example a .env y elegí la URL:
 *   - Server HTTPS (recomendado):  https://mundial.sda.ovh
 *   - Backend local + emulador:    http://10.0.2.2:4000
 *   - Backend local + celular LAN: http://IP_DE_TU_PC:4000
 */
import Config from 'react-native-config';

const FALLBACK_API_URL = 'https://mundial.sda.ovh';

export const API_URL: string = Config.API_URL || FALLBACK_API_URL;

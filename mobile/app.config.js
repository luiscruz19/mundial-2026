// Config dinámica de Expo: toma todo de app.json y solo resuelve el
// google-services.json desde el secret de EAS (GOOGLE_SERVICES_JSON) en los builds,
// con fallback al archivo local (gitignored) para desarrollo. Así el archivo con la
// API key de cliente no se commitea al repo.
module.exports = ({ config }) => {
  if (!config.android) config.android = {};
  config.android.googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON || config.android.googleServicesFile || './google-services.json';
  return config;
};

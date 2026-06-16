/**
 * Configuración de React Native CLI.
 * `assets` registra las fuentes propias del diseño (Bricolage Grotesque +
 * Hanken Grotesk). Tras instalar deps, correr:  npx react-native-asset
 * para copiarlas a android/app/src/main/assets/fonts (y a iOS si aplica).
 */
module.exports = {
  project: {
    android: {},
  },
  assets: ['./assets/fonts'],
};

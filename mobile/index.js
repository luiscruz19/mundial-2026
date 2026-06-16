/**
 * Punto de entrada de la app (React Native CLI, sin Expo).
 * Registra el componente raíz con el mismo nombre que MainActivity
 * (getMainComponentName) y app.json (name).
 */
import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

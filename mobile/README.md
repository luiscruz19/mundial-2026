# Mundial 2026 — App de Hinchas (mobile)

App mobile en **Expo (React Native + TypeScript)** para hinchas del Mundial 2026.
Identidad anónima por dispositivo (sin login), partidos, grupos, llave, simulaciones
bajo demanda, proyección del torneo (Monte Carlo) y notificaciones push.

## Stack

- Expo SDK 52 · React Native · TypeScript estricto
- **expo-router** (navegación file-based, tabs)
- **expo-notifications** (push: token de Expo + permisos + deep-link)
- **expo-localization** (autodetección de zona horaria)
- **zustand** (estado global: device + preferencias)
- Cliente HTTP propio con `fetch` (sin axios)
- **@react-native-async-storage/async-storage** (device_uuid + caché de prefs)
- Tema claro/oscuro, textos en español

## Cómo correr

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el bundler de Expo
npx expo start
```

Después, escaneá el QR con la app **Expo Go** (Android/iOS) o usá:

```bash
npm run android   # emulador/dispositivo Android
npm run ios       # simulador iOS (solo macOS)
npm run web       # navegador
```

> Las notificaciones push reales requieren un dispositivo físico (no funcionan en
> simuladores). El resto de la app funciona en cualquier entorno.

## Apuntar al backend

La URL base de la API se lee desde `app.json` en `expo.extra.apiUrl`
(con fallback a `http://localhost:4000` en `src/api/client.ts`).

```json
// app.json
{
  "expo": {
    "extra": { "apiUrl": "http://localhost:4000" }
  }
}
```

Cambiá ese valor por la URL de tu backend. Si usás un dispositivo físico, no uses
`localhost`: poné la IP de tu máquina en la red local, por ejemplo
`http://192.168.0.10:4000`.

## Estructura

```
mobile/
├── app.json, eas.json, tsconfig.json, babel.config.js, package.json
├── app/                      # rutas (expo-router)
│   ├── _layout.tsx           # raíz: hidratación, tema, notificaciones, onboarding vs tabs
│   ├── onboarding.tsx        # alta de primer ingreso (3 pasos)
│   ├── (tabs)/               # Partidos · Grupos · Llave · Mis selecciones · Ajustes
│   ├── match/[id].tsx        # detalle de partido (+ simulación bajo demanda)
│   ├── team/[id].tsx         # página de selección
│   └── projection.tsx        # proyección del torneo (Monte Carlo)
└── src/
    ├── api/                  # client.ts (fetch) + endpoints.ts (tipados por recurso)
    ├── store/                # zustand: device + preferencias
    ├── components/           # MatchCard, StandingsTable, BracketView, TeamBadge, ProbBar, ...
    ├── lib/                  # device (uuid), notifications, datetime (TZ), theme, useFetch
    ├── theme/                # paletas claro/oscuro
    └── types/                # interfaces de Team, Match, Simulation, Standing, Device, ...
```

## Identidad anónima

Al primer arranque se genera un `device_uuid` (UUID v4 con `expo-crypto`) que se
persiste en AsyncStorage. El dispositivo se registra en el backend
(`POST /devices/register`) junto con su push token y zona horaria. Todas las
preferencias (selecciones de interés, notificaciones, tema, idioma, TZ) se atan a
ese device y se sincronizan con `PUT /devices/preferences`.

## Notas

- Los assets en `assets/*.png` son placeholders sólidos (verde/azul de marca).
  Reemplazalos por los íconos/splash definitivos antes de un build de producción.
- No se ejecutó `npm install` en este entorno: instalá las dependencias localmente.

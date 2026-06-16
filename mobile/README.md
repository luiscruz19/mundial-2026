# Mundial 2026 — App mobile (React Native CLI)

App de hinchas para seguir y simular el Mundial 2026. **React Native puro
(RN CLI 0.76, sin Expo)**. Consume el backend en `https://mundial.sda.ovh`
(configurable por `.env`). Diseño "Estadio" (crema/verde/rojo/dorado).

> Migrada desde Expo a RN CLI: navegación con React Navigation, fuentes
> bundleadas como assets nativos, push **stubbeado** (ver más abajo).

---

## Prerrequisitos (PC con Android Studio)

- **Node** ≥ 18
- **JDK 17** (Temurin/Adoptium recomendado)
- **Android Studio** con:
  - Android SDK Platform 35 (compileSdk/targetSdk)
  - Android SDK Build-Tools 35.0.0
  - NDK 26.1.10909125
  - Un AVD (emulador) o un dispositivo físico con depuración USB
- Variables de entorno: `ANDROID_HOME` (y `ANDROID_HOME/platform-tools`,
  `emulator`, `tools/bin` en el `PATH`).

Verificá el entorno con:

```bash
npx react-native doctor
```

---

## Instalación

```bash
cd mobile
npm install

# Backend: copiá el ejemplo y editá la URL si hace falta
cp .env.example .env

# Enlazar las fuentes del diseño (Bricolage Grotesque + Hanken Grotesk).
# Copia los .ttf de assets/fonts a android/app/src/main/assets/fonts.
# Necesario SOLO la primera vez (y cuando agregues/quites fuentes).
npx react-native-asset
```

> Las fuentes de `react-native-vector-icons` (Ionicons, etc.) se copian
> automáticamente en build vía `fonts.gradle` (ya cableado en
> `android/app/build.gradle`).

### `.env` (react-native-config)

El cliente HTTP lee `Config.API_URL` (ver `src/config.ts`); si no hay `.env`,
usa como fallback `https://mundial.sda.ovh`.

```
# Server HTTPS (recomendado, funciona en emulador y físico):
API_URL=https://mundial.sda.ovh

# Backend local en tu PC:
#  - Emulador Android: API_URL=http://10.0.2.2:4000   (10.0.2.2 = host de la PC)
#  - Celular físico en la misma WiFi: API_URL=http://IP_LAN_DE_TU_PC:4000
```

El `AndroidManifest.xml` ya tiene `android:usesCleartextTraffic="true"` para
poder pegarle a backends HTTP locales.

---

## Correr en el emulador / dispositivo

```bash
# 1) Levantá un emulador desde Android Studio (o conectá un teléfono)
# 2) Arrancá Metro + compilá e instalá la app:
npx react-native run-android
# (equivalente: npm run android)
```

Para arrancar solo el bundler:

```bash
npm start
```

---

## Generar el APK

```bash
cd android

# APK de DEBUG (instalable directo, firmado con la debug.keystore):
./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk

# APK de RELEASE:
./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

> El `assembleRelease` viene firmado con la **debug keystore** por defecto.
> Para publicar en Play Store generá tu propia keystore y configurala en
> `android/app/build.gradle` (`signingConfigs.release`). Ver
> https://reactnative.dev/docs/signed-apk-android

Datos del paquete:
- **applicationId / namespace**: `com.hinchas.mundial2026`
- **Nombre visible**: `Mundial 2026`

---

## Notificaciones push (FCM) — STUB

El push está **stubbeado** (`src/lib/notifications.ts`): la app compila y corre
sin notificaciones. `registerForPushNotifications`/`ensurePushRegistered`
devuelven `null`/`false` y `useNotificationObserver` es no-op.

Para cablear FCM cuando tengas el proyecto de Firebase:

1. Agregá `google-services.json` en `android/app/`.
2. Instalá `@react-native-firebase/app`, `@react-native-firebase/messaging` y
   `@notifee/react-native`.
3. Aplicá el plugin de Google Services en `android/build.gradle` (classpath
   `com.google.gms:google-services`) y `apply plugin: "com.google.gms.google-services"`
   en `android/app/build.gradle`.
4. Implementá en `src/lib/notifications.ts` (hay TODOs):
   - permiso + `messaging().getToken()` → `useDeviceStore.getState().setPushToken(token)`
   - canal Android `default` con `@notifee/react-native`
   - al tocar la notificación, navegá con `navigate('Match', { id: data.match_id })`
     desde `@/navigation/navigationRef`.

---

## Estructura

```
mobile/
├─ index.js                 # AppRegistry (registra "MundialHinchas")
├─ App.tsx                  # Providers (SafeArea) + StatusBar + hidratación store
├─ app.json                 # name/displayName (RN CLI, no Expo)
├─ react-native.config.js   # assets: ['./assets/fonts']
├─ assets/fonts/            # .ttf del diseño (Bricolage + Hanken)
├─ android/                 # proyecto Gradle nativo
└─ src/
   ├─ config.ts             # API_URL desde react-native-config
   ├─ navigation/           # RootNavigator (stack) + TabsNavigator + types + navigationRef
   ├─ screens/              # Onboarding/Home/Grupos/Llave/Proyeccion/Ajustes/Match/Team/Live/Simular
   ├─ components/ui/        # kit visual "Estadio" (SVG + linear-gradient)
   ├─ api/                  # client (fetch) + endpoints
   ├─ lib/                  # device/datetime/notifications(stub)/theme/format/useFetch/flags
   ├─ store/                # zustand (identidad del device + prefs)
   └─ theme/                # tokens + colors
```

---

## Scripts

| Script              | Acción                     |
|---------------------|----------------------------|
| `npm start`         | Metro bundler              |
| `npm run android`   | `react-native run-android` |
| `npm run typecheck` | `tsc --noEmit`             |

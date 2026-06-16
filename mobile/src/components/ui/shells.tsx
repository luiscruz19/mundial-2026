/**
 * Shells de navegación / cabecera (Mundial 26). Portados de app.jsx:
 *  - TeamBig: bandera redonda grande + nombre.
 *  - AppMast: cabecera sticky de las tabs (kicker MUNDIAL 26 + título display
 *    + subtítulo + botón sol/luna que alterna el tema).
 *  - PushScreen: cabecera de pantalla push (atrás + título + compartir) con
 *    soporte de barra de acento, LiveDot y bloque hero a sangre.
 */
import { type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { Flag } from './Flag';
import { Display } from './Txt';
import { LiveDot } from './kit';
import { useTokens, fonts } from '@/theme/tokens';
import { useThemeToggle } from '@/lib/theme';

// --- TeamBig -----------------------------------------------------------------

export function TeamBig({
  code,
  name,
  align = 'left',
  onLight = false,
}: {
  code: string;
  name: string;
  align?: 'left' | 'right';
  onLight?: boolean;
}) {
  const { t } = useTokens();
  const right = align === 'right';
  return (
    <View style={{ alignItems: right ? 'flex-end' : 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
      <Flag code={code} size={44} round ring />
      <Text
        numberOfLines={2}
        style={{
          fontFamily: fonts.textExtra,
          fontSize: 13.5,
          lineHeight: 15,
          color: onLight ? '#fff' : t.ink,
          textAlign: right ? 'right' : 'left',
          maxWidth: 92,
        }}
      >
        {name}
      </Text>
    </View>
  );
}

// --- iconBtn redondo ---------------------------------------------------------

function IconBtn({
  onPress,
  children,
  size = 38,
}: {
  onPress?: () => void;
  children: ReactNode;
  size?: number;
}) {
  const { t } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: t.line,
        backgroundColor: t.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

// --- TabScreen (AppMast fijo + contenido scrolleable) ------------------------

/**
 * Estructura base de una pantalla de tab: AppMast arriba (fijo) y el resto
 * scrolleable debajo. Centraliza el padding inferior con safe area.
 */
export function TabScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { t } = useTokens();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <AppMast title={title} subtitle={subtitle} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 14 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

// --- AppMast (cabecera sticky de tabs) ---------------------------------------

export function AppMast({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t, isDark } = useTokens();
  const insets = useSafeAreaInsets();
  const toggle = useThemeToggle();
  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        backgroundColor: t.bg,
        borderBottomWidth: 1,
        borderBottomColor: t.line,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Image
              source={require('../../../assets/mark-256.png')}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 10.5,
                letterSpacing: 1.5,
                color: t.ink3,
                textTransform: 'uppercase',
              }}
            >
              Mundial 26
            </Text>
          </View>
          <Display style={{ marginTop: 3, fontSize: 28, color: t.ink, lineHeight: 30 }}>{title}</Display>
          {subtitle ? (
            <Text style={{ fontSize: 12.5, color: t.ink2, marginTop: 4, fontFamily: fonts.text }}>{subtitle}</Text>
          ) : null}
        </View>
        <IconBtn onPress={toggle}>
          <Icon name={isDark ? 'sun' : 'moon'} size={19} color={t.ink} fill={!isDark} stroke={2} />
        </IconBtn>
      </View>
    </View>
  );
}

// --- PushScreen (cabecera + contenido de pantalla apilada) -------------------

export function PushScreen({
  title,
  children,
  hero,
  accent,
  live,
}: {
  title: string;
  children: ReactNode;
  hero?: ReactNode;
  accent?: boolean;
  live?: boolean;
}) {
  const { t } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: t.bg,
          borderBottomWidth: 1,
          borderBottomColor: t.line,
          zIndex: 30,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 10,
          }}
        >
          <IconBtn size={36} onPress={() => router.back()}>
            <Icon name="back" size={20} stroke={2.4} color={t.ink} />
          </IconBtn>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {live ? <LiveDot size={8} /> : null}
            <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 16, color: t.ink, flex: 1 }}>
              {title}
            </Text>
          </View>
          <IconBtn size={36}>
            <Icon name="share" size={17} stroke={2.2} color={t.ink} />
          </IconBtn>
        </View>
        {accent ? <AccentBar /> : null}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {hero}
        {children}
      </ScrollView>
    </View>
  );
}

/** Barra de acento degradado brand→gold (3px). */
function AccentBar() {
  const { t } = useTokens();
  return (
    <LinearGradient
      colors={[t.brand, t.gold]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: 3 }}
    />
  );
}

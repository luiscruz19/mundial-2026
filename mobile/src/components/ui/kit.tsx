/**
 * Kit visual base (Mundial 26 — estilo Estadio). Portado de components.jsx.
 * Exporta: Pill, Tag, Btn, Card, SectionTitle, Segmented, ProbTriBar,
 * StatBar, StatRow, LiveDot, Avatar, Toggle, Stepper, Sparkbars, Empty.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { Flag } from './Flag';
import { Display } from './Txt';
import {
  useTokens,
  fonts,
  radii,
  cardShadow,
  brandGlow,
  alpha,
  type ThemeTokens,
} from '@/theme/tokens';
import type { TeamCode } from '@/lib/flags';

// --- Pill --------------------------------------------------------------------

type PillTone = 'default' | 'brand' | 'accent' | 'live' | 'gold';

const PILL_TONES = (t: ThemeTokens): Record<PillTone, { bg: string; col: string }> => ({
  default: { bg: t.surface2, col: t.ink2 },
  brand: { bg: alpha(t.brand, 0.16), col: t.brandStrong },
  accent: { bg: alpha(t.accent, 0.16), col: t.accent },
  live: { bg: t.live, col: '#fff' },
  gold: { bg: alpha(t.gold, 0.26), col: t.goldInk },
});

/**
 * Pill. Acepta texto (`children`) y, opcionalmente, un ícono a la izquierda
 * (`icon`) o un nodo libre antes del texto (`leading`, ej. LiveDot).
 */
export function Pill({
  children,
  tone = 'default',
  size = 'md',
  icon,
  leading,
  style,
}: {
  children: ReactNode;
  tone?: PillTone;
  size?: 'sm' | 'md';
  icon?: IconName;
  leading?: ReactNode;
  style?: ViewStyle;
}) {
  const { t } = useTokens();
  const tt = PILL_TONES(t)[tone];
  const fs = size === 'sm' ? 11 : 12.5;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 5,
          borderRadius: radii.pill,
          backgroundColor: tt.bg,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? 8 : 11,
        },
        style,
      ]}
    >
      {leading}
      {icon ? <Icon name={icon} size={fs + 1} color={tt.col} stroke={2.4} /> : null}
      <Text
        style={{
          color: tt.col,
          fontSize: fs,
          fontFamily: fonts.textBold,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

// --- Tag ---------------------------------------------------------------------

export function Tag({ children, color, style }: { children: ReactNode; color?: string; style?: TextStyle }) {
  const { t } = useTokens();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.display,
          fontSize: 11,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
          color: color ?? t.ink3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// --- Btn ---------------------------------------------------------------------

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'outline';

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  full,
  onPress,
  style,
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  full?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const { t } = useTokens();
  const variants: Record<BtnVariant, ViewStyle & { _col: string }> = {
    primary: { backgroundColor: t.brand, _col: t.brandInk, ...brandGlow(t.brand) },
    accent: { backgroundColor: t.accent, _col: '#fff' },
    ghost: { backgroundColor: t.surface2, _col: t.ink },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.lineStrong, _col: t.ink },
  };
  const v = variants[variant];
  const { _col, ...vStyle } = v;
  const fs = size === 'lg' ? 16 : size === 'sm' ? 13 : 14.5;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: radii.pill,
          paddingVertical: size === 'lg' ? 15 : size === 'sm' ? 8 : 12,
          paddingHorizontal: size === 'lg' ? 22 : size === 'sm' ? 14 : 18,
          width: full ? '100%' : undefined,
          opacity: pressed ? 0.92 : 1,
        },
        vStyle,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 17} stroke={2.4} color={_col} /> : null}
      <Text style={{ color: _col, fontSize: fs, fontFamily: fonts.textBold }}>{children}</Text>
    </Pressable>
  );
}

// --- Card --------------------------------------------------------------------

export function Card({
  children,
  pad = 16,
  onPress,
  accent,
  style,
}: {
  children: ReactNode;
  pad?: number;
  onPress?: () => void;
  accent?: string;
  style?: ViewStyle;
}) {
  const { t } = useTokens();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: radii.card,
    padding: pad,
    borderWidth: 1,
    borderColor: t.line,
    borderLeftWidth: accent ? 3 : 1,
    borderLeftColor: accent ?? t.line,
    ...cardShadow,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.97 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// --- SectionTitle ------------------------------------------------------------

export function SectionTitle({
  children,
  action,
  onAction,
  style,
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const { t } = useTokens();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
        style,
      ]}
    >
      <Display style={{ fontSize: 18, color: t.ink }}>{children}</Display>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={{ color: t.brandStrong, fontFamily: fonts.textBold, fontSize: 13.5 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// --- Segmented ---------------------------------------------------------------

export type SegOption = string | { v: string; label: string };

export function Segmented({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}) {
  const { t } = useTokens();
  return (
    <View
      style={[
        { flexDirection: 'row', backgroundColor: t.surface2, borderRadius: radii.chip, padding: 3, gap: 2 },
        style,
      ]}
    >
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.v;
        const label = typeof o === 'string' ? o : o.label;
        const active = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={[
              {
                flex: 1,
                borderRadius: radii.chip - 2,
                paddingVertical: size === 'sm' ? 6 : 8,
                paddingHorizontal: 6,
                alignItems: 'center',
                backgroundColor: active ? t.surface : 'transparent',
              },
              active ? segShadow : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.textBold,
                fontSize: size === 'sm' ? 12 : 13.5,
                color: active ? t.ink : t.ink3,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.13,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
};

// --- ProbTriBar (1X2) --------------------------------------------------------

export function ProbTriBar({
  w1,
  draw,
  w2,
  height = 10,
  showLabels = false,
  labels,
}: {
  w1: number;
  draw: number;
  w2: number;
  height?: number;
  showLabels?: boolean;
  labels?: [string, string];
}) {
  const { t } = useTokens();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          height,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: t.surface2,
          gap: 2,
        }}
      >
        <View style={{ width: `${w1}%`, backgroundColor: t.cWin, height: '100%' }} />
        <View style={{ width: `${draw}%`, backgroundColor: t.cDraw, height: '100%' }} />
        <View style={{ width: `${w2}%`, backgroundColor: t.cLoss, height: '100%' }} />
      </View>
      {showLabels ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
          <Text style={{ color: t.cWin, fontFamily: fonts.display, fontSize: 13 }}>
            {labels ? labels[0] : 'L'} {w1}%
          </Text>
          <Text style={{ color: t.ink3, fontFamily: fonts.display, fontSize: 13 }}>X {draw}%</Text>
          <Text style={{ color: t.cLoss, fontFamily: fonts.display, fontSize: 13 }}>
            {w2}% {labels ? labels[1] : 'V'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// --- StatRow (barra doble con etiqueta central) ------------------------------

export function StatRow({
  label,
  lv,
  rv,
  lvn,
  rvn,
  last,
}: {
  label: string;
  lv: string | number;
  rv: string | number;
  lvn: number;
  rvn: number;
  last?: boolean;
}) {
  const { t } = useTokens();
  const totalv = lvn + rvn || 1;
  return (
    <View style={{ paddingTop: last ? 10 : 0, paddingBottom: last ? 0 : 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 14, color: t.ink }}>{lv}</Text>
        <Text style={{ fontFamily: fonts.textSemi, fontSize: 12.5, color: t.ink3 }}>{label}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 14, color: t.ink }}>{rv}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, height: 6 }}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: t.surface2, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: `${(lvn / totalv) * 100}%`, backgroundColor: t.brand, borderRadius: 999 }} />
        </View>
        <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: `${(rvn / totalv) * 100}%`, backgroundColor: t.accent, borderRadius: 999 }} />
        </View>
      </View>
    </View>
  );
}

// --- LiveDot (con pulso animado) ---------------------------------------------

export function LiveDot({ size = 7 }: { size?: number }) {
  const { t } = useTokens();
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scale, { toValue: 1, duration: 1600, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  const ringScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = scale.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 0, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.live,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.live }} />
    </View>
  );
}

// --- Avatar ------------------------------------------------------------------

export function Avatar({ n, team, size = 38 }: { n: ReactNode; team?: TeamCode; size?: number }) {
  const { t } = useTokens();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.4, color: t.ink2 }}>{n}</Text>
      {team ? (
        <View style={{ position: 'absolute', bottom: -2, right: -2 }}>
          <Flag code={team} size={size * 0.46} round />
        </View>
      ) : null}
    </View>
  );
}

// --- Toggle ------------------------------------------------------------------

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTokens();
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={{
        width: 50,
        height: 30,
        borderRadius: 999,
        padding: 3,
        backgroundColor: on ? t.brand : t.surface2,
        alignItems: on ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}

// --- Stepper -----------------------------------------------------------------

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const { t } = useTokens();
  const btn = (icon: IconName, fn: () => void, dis: boolean) => (
    <Pressable
      onPress={dis ? undefined : fn}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: t.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dis ? 0.5 : 1,
      }}
    >
      <Icon name={icon} size={16} stroke={2.6} color={dis ? t.ink3 : t.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn('minus', () => onChange(Math.max(min, value - 1)), value <= min)}
      <Text style={{ fontFamily: fonts.display, fontSize: 20, minWidth: 22, textAlign: 'center', color: t.ink }}>
        {value}
      </Text>
      {btn('plus', () => onChange(Math.min(max, value + 1)), value >= max)}
    </View>
  );
}

// --- Sparkbars ---------------------------------------------------------------

export function Sparkbars({
  data,
  color,
  height = 40,
  active = -1,
}: {
  data: number[];
  color?: string;
  height?: number;
  active?: number;
}) {
  const { t } = useTokens();
  const max = Math.max(...data, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            borderRadius: 2,
            backgroundColor: i === active ? t.accent : color ?? t.brand,
            opacity: i === active ? 1 : 0.85,
          }}
        />
      ))}
    </View>
  );
}

// --- Empty -------------------------------------------------------------------

export function Empty({ text }: { text: string }) {
  const { t } = useTokens();
  return (
    <Text style={{ paddingVertical: 28, paddingHorizontal: 16, textAlign: 'center', color: t.ink3, fontSize: 13.5, fontFamily: fonts.text }}>
      {text}
    </Text>
  );
}

// --- StateView (loading / error genéricos) -----------------------------------

/** Spinner centrado para estado de carga. */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { t } = useTokens();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={t.brand} />
      <Text style={{ color: t.ink3, fontSize: 13, fontFamily: fonts.text }}>{label}</Text>
    </View>
  );
}

/** Estado de error con botón de reintento opcional. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTokens();
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center', gap: 14 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: alpha(t.accent, 0.14), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="info" size={24} color={t.accent} />
      </View>
      <Text style={{ color: t.ink2, fontSize: 13.5, fontFamily: fonts.text, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
      {onRetry ? <Btn variant="ghost" size="sm" icon="bolt" onPress={onRetry}>Reintentar</Btn> : null}
    </View>
  );
}

// re-export tokens helper para conveniencia de las pantallas
export { useTokens };
export type { ThemeTokens };
StyleSheet.create({});

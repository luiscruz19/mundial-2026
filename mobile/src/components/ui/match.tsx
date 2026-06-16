/**
 * Bloques compartidos de partido (Mundial 26): MatchRow, DayPills, ScoreHead,
 * Timeline, FormRow, MiniStat, ScorelineRow. Cableados a las formas reales del
 * backend (Match, MatchGoal, ScoreProb). Navegan con React Navigation.
 */
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { Flag } from './Flag';
import { Icon } from './Icon';
import { LiveDot, Pill, useTokens } from './kit';
import { fonts, radii, cardShadow, brandGlow, alpha } from '@/theme/tokens';
import { sideCode, sideName } from '@/lib/format';
import type { Match, MatchGoal, ScoreProb } from '@/types';

// --- MatchRow ----------------------------------------------------------------

export function MatchRow({ m, timeLabel }: { m: Match; timeLabel: string }) {
  const { t } = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const live = m.status === 'live';
  const done = m.status === 'finished';
  const s1 = m.live ? m.live.home_score : m.home_score;
  const s2 = m.live ? m.live.away_score : m.away_score;
  const win1 = done && (s1 ?? 0) > (s2 ?? 0);
  const win2 = done && (s2 ?? 0) > (s1 ?? 0);
  const slot = m.group ? `GR·${m.group}` : (m.bracket_slot ?? '');

  const TeamLine = ({
    code,
    name,
    score,
    dim,
    isWin,
  }: {
    code: string;
    name: string;
    score: number | null;
    dim: boolean;
    isWin: boolean;
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Flag code={code} size={26} ring />
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: isWin ? fonts.textExtra : fonts.textSemi,
          fontSize: 15,
          color: dim ? t.ink3 : t.ink,
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 19,
          minWidth: 18,
          textAlign: 'right',
          color: dim ? t.ink3 : t.ink,
        }}
      >
        {score == null ? '' : score}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => navigation.navigate('Match', { id: String(m.id) })}
      style={{
        backgroundColor: t.surface,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: t.line,
        flexDirection: 'row',
        overflow: 'hidden',
        ...cardShadow,
      }}
    >
      <View
        style={{
          width: 60,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          paddingVertical: 12,
          paddingHorizontal: 4,
          backgroundColor: live ? alpha(t.live, 0.09) : t.surface2,
          borderRightWidth: 1,
          borderRightColor: t.line,
        }}
      >
        {slot ? (
          <Text style={{ fontFamily: fonts.display, fontSize: 10.5, letterSpacing: 0.6, color: t.ink3 }}>
            {slot}
          </Text>
        ) : null}
        {live ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <LiveDot />
            <Text style={{ color: t.live, fontFamily: fonts.display, fontSize: 14 }}>{m.live?.minute ?? 0}&apos;</Text>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: done ? 12 : 15,
              color: done ? t.ink3 : t.ink,
            }}
          >
            {done ? 'Final' : timeLabel}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 14, gap: 9 }}>
        <TeamLine
          code={sideCode(m.home_team)}
          name={sideName(m.home_team, m.home_placeholder)}
          score={s1}
          dim={win2}
          isWin={win1}
        />
        <TeamLine
          code={sideCode(m.away_team)}
          name={sideName(m.away_team, m.away_placeholder)}
          score={s2}
          dim={win1}
          isWin={win2}
        />
      </View>
    </Pressable>
  );
}

// --- DayPills ----------------------------------------------------------------

export interface DayPillItem {
  key: string; // YYYY-MM-DD
  dow: string; // ej. "Vie"
  rest: string; // ej. "12 jun"
}

export function DayPills({
  days,
  value,
  onChange,
}: {
  days: DayPillItem[];
  value: number;
  onChange: (i: number) => void;
}) {
  const { t } = useTokens();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {days.map((d, i) => {
        const active = i === value;
        return (
          <Pressable
            key={d.key}
            onPress={() => onChange(i)}
            style={[
              {
                borderRadius: radii.chip,
                paddingVertical: 8,
                paddingHorizontal: 14,
                alignItems: 'center',
                backgroundColor: active ? t.brand : t.surface,
                borderWidth: active ? 0 : 1,
                borderColor: t.line,
              },
              active ? brandGlow(t.brand) : cardShadow,
            ]}
          >
            <Text style={{ fontSize: 11, fontFamily: fonts.textBold, color: active ? t.brandInk : t.ink3, opacity: active ? 0.85 : 1 }}>
              {d.dow.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: active ? t.brandInk : t.ink }}>{d.rest}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// --- ScoreHead (cabecera de marcador) ----------------------------------------

export function ScoreHead({ m, onLight = false }: { m: Match; onLight?: boolean }) {
  const { t } = useTokens();
  const live = m.status === 'live';
  const done = m.status === 'finished';
  const s1 = m.live ? m.live.home_score : m.home_score;
  const s2 = m.live ? m.live.away_score : m.away_score;
  const col = onLight ? '#fff' : t.ink;
  const showScore = live || done;
  const pens =
    done && m.home_penalties != null && m.away_penalties != null
      ? `${m.home_penalties}-${m.away_penalties} pen.`
      : null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 6, paddingBottom: 4 }}>
      <TeamBigInline code={sideCode(m.home_team)} name={sideName(m.home_team, m.home_placeholder)} align="left" onLight={onLight} />
      <View style={{ alignItems: 'center', paddingHorizontal: 8, paddingTop: 4, minWidth: 92 }}>
        {showScore ? (
          <Text style={{ fontFamily: fonts.display, fontSize: 46, lineHeight: 48, color: col }}>
            {s1 ?? 0}
            <Text style={{ opacity: 0.4 }}> : </Text>
            {s2 ?? 0}
          </Text>
        ) : (
          <Text style={{ fontFamily: fonts.display, fontSize: 30, color: col, opacity: 0.85 }}>VS</Text>
        )}
        <View style={{ marginTop: 8, alignItems: 'center', gap: 4 }}>
          {live ? (
            <Pill tone="live" size="sm" leading={<LiveDot size={7} />}>{`${m.live?.minute ?? 0}'`}</Pill>
          ) : done ? (
            <Pill size="sm">FINAL</Pill>
          ) : null}
          {pens ? <Text style={{ fontSize: 11, color: onLight ? '#fff' : t.ink3, fontFamily: fonts.display }}>{pens}</Text> : null}
        </View>
      </View>
      <TeamBigInline code={sideCode(m.away_team)} name={sideName(m.away_team, m.away_placeholder)} align="right" onLight={onLight} />
    </View>
  );
}

function TeamBigInline({
  code,
  name,
  align,
  onLight,
}: {
  code: string;
  name: string;
  align: 'left' | 'right';
  onLight: boolean;
}) {
  const { t } = useTokens();
  const right = align === 'right';
  return (
    <View style={{ alignItems: right ? 'flex-end' : 'flex-start', gap: 8, flex: 1 }}>
      <Flag code={code} size={44} round ring />
      <Text numberOfLines={2} style={{ fontFamily: fonts.textExtra, fontSize: 13.5, lineHeight: 15, color: onLight ? '#fff' : t.ink, textAlign: right ? 'right' : 'left', maxWidth: 92 }}>
        {name}
      </Text>
    </View>
  );
}

// --- Timeline (goles minuto a minuto) ----------------------------------------

export function Timeline({
  goals,
  homeCode,
  awayCode,
}: {
  goals: MatchGoal[];
  homeCode: string;
  awayCode: string;
}) {
  const { t } = useTokens();
  return (
    <View>
      {goals
        .slice()
        .sort((a, b) => a.minute - b.minute)
        .map((e, i, arr) => {
          const home = e.team === 'home';
          return (
            <View
              key={`${e.minute}-${i}`}
              style={{
                flexDirection: home ? 'row' : 'row-reverse',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 9,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: t.line,
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: t.ink3, width: 30, textAlign: home ? 'left' : 'right' }}>
                {e.minute}&apos;
              </Text>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(t.brand, 0.16),
                }}
              >
                <Icon name="pitch" size={15} color={t.brandStrong} />
              </View>
              <View style={{ flex: 1, alignItems: home ? 'flex-start' : 'flex-end' }}>
                <Text style={{ fontFamily: fonts.textBold, fontSize: 14, color: t.ink }}>{e.player || 'Gol'}</Text>
              </View>
              <Flag code={home ? homeCode : awayCode} size={20} ring />
            </View>
          );
        })}
    </View>
  );
}

// --- FormRow (forma reciente) ------------------------------------------------

export function FormRow({ code, name, form }: { code: string; name: string; form: ('W' | 'D' | 'L')[] }) {
  const { t } = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Flag code={code} size={26} ring />
      <Text style={{ flex: 1, fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink }}>{name}</Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {form.length === 0 ? (
          <Text style={{ color: t.ink3, fontSize: 12, fontFamily: fonts.text }}>Sin datos</Text>
        ) : null}
        {form.map((r, i) => {
          const c = r === 'W' ? t.brand : r === 'D' ? t.ink3 : t.accent;
          return (
            <View
              key={i}
              style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: alpha(c, 0.18), alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: c, fontFamily: fonts.display, fontSize: 11.5 }}>{r}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// --- MiniStat ----------------------------------------------------------------

export function MiniStat({ label, v }: { label: string; v: string }) {
  const { t } = useTokens();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: radii.chip, paddingVertical: 11, paddingHorizontal: 13 }}>
      <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.textSemi, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 17, color: t.ink }}>{v}</Text>
    </View>
  );
}

// --- ScorelineRow ------------------------------------------------------------

/** Fila de marcador del ranking real (prob 0..1). */
export function ScorelineRow({ s, max }: { s: ScoreProb; max: number }) {
  const { t } = useTokens();
  const who = s.home > s.away ? 1 : s.away > s.home ? 2 : 0;
  const colr = who === 1 ? t.cWin : who === 2 ? t.cLoss : t.cDraw;
  const pct = Math.round(s.prob * 1000) / 10;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ width: 42, fontFamily: fonts.display, fontSize: 16, color: t.ink }}>{s.home}–{s.away}</Text>
      <View style={{ flex: 1, height: 8, backgroundColor: t.surface2, borderRadius: 999, overflow: 'hidden' }}>
        <View style={{ width: `${max > 0 ? (s.prob / max) * 100 : 0}%`, height: '100%', backgroundColor: colr, borderRadius: 999 }} />
      </View>
      <Text style={{ width: 42, textAlign: 'right', fontFamily: fonts.display, fontSize: 13.5, color: t.ink2 }}>{pct}%</Text>
    </View>
  );
}

/**
 * En vivo (ScreenLive del diseño). Scoreboard en degradado con barra de minuto,
 * card "Probabilidad" (si hay simulación, la del modelo) y goles minuto a minuto.
 * Cableado: si llega id usa Matches.detail(id); si no, toma el primer status:'live'.
 */
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PushScreen,
  Card,
  Pill,
  Tag,
  ProbTriBar,
  Timeline,
  TeamBig,
  LiveDot,
  Empty,
  Loading,
  ErrorState,
  Icon,
} from '@/components/ui';
import { useTokens, fonts, radii } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { MatchesApi } from '@/api/endpoints';
import { stageLabel, sideName, sideCode } from '@/lib/format';
import type { Match } from '@/types';

export default function ScreenLive() {
  const { t } = useTokens();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Si hay id explícito, detalle directo; si no, el primer partido en vivo.
  const fetchState = useFetch<Match | null>(async (signal) => {
    if (id) return MatchesApi.detail(id, signal);
    const live = await MatchesApi.list({ status: 'live' }, signal);
    return live[0] ?? null;
  }, [id], { pollMs: 15000 });

  const m = fetchState.data;

  if (fetchState.loading) {
    return (
      <PushScreen title="En vivo" live>
        <Loading />
      </PushScreen>
    );
  }
  if (fetchState.error) {
    return (
      <PushScreen title="En vivo" live>
        <ErrorState message={fetchState.error} onRetry={fetchState.refetch} />
      </PushScreen>
    );
  }
  if (!m) {
    return (
      <PushScreen title="En vivo">
        <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="whistle" size={26} color={t.ink3} />
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 17, color: t.ink }}>No hay partidos en vivo</Text>
          <Text style={{ fontSize: 13.5, color: t.ink2, fontFamily: fonts.text, textAlign: 'center' }}>
            Volvé cuando ruede la pelota para seguir el minuto a minuto.
          </Text>
        </View>
      </PushScreen>
    );
  }

  const live = m.live;
  const minute = live?.minute ?? null;
  const s1 = live?.home_score ?? m.home_score ?? 0;
  const s2 = live?.away_score ?? m.away_score ?? 0;
  const goals = m.goals ?? [];
  const sim = m.simulation;

  return (
    <ScreenLiveBody
      m={m}
      minute={minute}
      s1={s1}
      s2={s2}
      goals={goals}
      sim={sim}
    />
  );
}

function ScreenLiveBody({
  m,
  minute,
  s1,
  s2,
  goals,
  sim,
}: {
  m: Match;
  minute: number | null;
  s1: number;
  s2: number;
  goals: NonNullable<Match['goals']>;
  sim: Match['simulation'];
}) {
  const { t } = useTokens();
  const homeName = sideName(m.home_team, m.home_placeholder);
  const awayName = sideName(m.away_team, m.away_placeholder);
  const homeCode = sideCode(m.home_team);
  const awayCode = sideCode(m.away_team);

  return (
    <PushScreen title="En vivo" live={m.status === 'live'}>
      <View style={{ paddingTop: 4, paddingHorizontal: 16 }}>
        <LinearGradient
          colors={[t.brand, t.brandDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.card, overflow: 'hidden', padding: 16 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            {m.status === 'live' ? (
              <Pill tone="live" size="sm" leading={<LiveDot size={7} />}>
                {minute != null ? `EN VIVO · ${minute}'` : 'EN VIVO'}
              </Pill>
            ) : (
              <Pill size="sm">{m.status === 'finished' ? 'FINAL' : 'PROGRAMADO'}</Pill>
            )}
            <Text style={{ color: '#fff', fontSize: 12, fontFamily: fonts.textSemi, opacity: 0.85 }}>{stageLabel(m)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TeamBig code={homeCode} name={homeName} align="left" onLight />
            <Text style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 50, color: '#fff' }}>
              {s1}–{s2}
            </Text>
            <TeamBig code={awayCode} name={awayName} align="right" onLight />
          </View>
          {/* barra de minuto (solo si el feed da el minuto en vivo) */}
          {minute != null ? (
            <>
              <View style={{ marginTop: 16, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (minute / 90) * 100)}%`, height: '100%', backgroundColor: '#fff', borderRadius: 999 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#fff', fontSize: 11, opacity: 0.8, fontFamily: fonts.display }}>1&apos;</Text>
                <Text style={{ color: '#fff', fontSize: 11, opacity: 0.8, fontFamily: fonts.display }}>{minute}&apos;</Text>
                <Text style={{ color: '#fff', fontSize: 11, opacity: 0.8, fontFamily: fonts.display }}>90&apos;</Text>
              </View>
            </>
          ) : null}
        </LinearGradient>
      </View>

      {/* probabilidad (del modelo, si hay simulación) */}
      {sim ? (
        <View style={{ padding: 16 }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Tag>Probabilidad del modelo</Tag>
            </View>
            <Text style={{ fontSize: 11.5, color: t.ink3, marginBottom: 5, fontFamily: fonts.textSemi }}>ANTES DEL PARTIDO</Text>
            <ProbTriBar
              w1={Math.round(sim.win_prob.home * 100)}
              draw={Math.round(sim.win_prob.draw * 100)}
              w2={Math.round(sim.win_prob.away * 100)}
              height={11}
              showLabels
              labels={[homeCode || 'L', awayCode || 'V']}
            />
          </Card>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: sim ? 0 : 16 }}>
        <Card>
          <View style={{ marginBottom: 12 }}>
            <Tag>Goles</Tag>
          </View>
          {goals.length > 0 ? (
            <Timeline goals={goals} homeCode={homeCode} awayCode={awayCode} />
          ) : (
            <Empty text="Todavía no hay goles." />
          )}
        </Card>
      </View>
    </PushScreen>
  );
}

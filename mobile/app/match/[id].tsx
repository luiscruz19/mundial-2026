/**
 * Detalle de partido (ScreenMatch del diseño). Card scoreboard + Segmented
 * Oficial/Simulado. Cableado a Matches.detail(id).
 *  - Oficial: si finished → goles (timeline) + alineaciones; si no → "no se jugó"
 *    + previa con la valoración de forma de cada selección.
 *  - Simulado: si hay simulación la muestra; botón para simular si scheduled.
 */
import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PushScreen,
  Card,
  Btn,
  Tag,
  Pill,
  Segmented,
  SectionTitle,
  ScoreHead,
  Timeline,
  MiniStat,
  ScorelineRow,
  ProbTriBar,
  RecentList,
  Empty,
  Loading,
  ErrorState,
  Icon,
  Flag,
} from '@/components/ui';
import { useTokens, fonts } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { MatchesApi } from '@/api/endpoints';
import { stageLabel, sideName, sideCode } from '@/lib/format';
import type { LineupSide, Match, Team } from '@/types';

const pct = (p: number) => Math.round(p * 1000) / 10;

export default function ScreenMatch() {
  const { t } = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState('oficial');

  const fetchState = useFetch<Match>((signal) => MatchesApi.detail(id ?? '', signal), [id], { pollMs: 20000 });
  const m = fetchState.data;

  if (fetchState.loading) {
    return (
      <PushScreen title="Partido">
        <Loading />
      </PushScreen>
    );
  }
  if (fetchState.error || !m) {
    return (
      <PushScreen title="Partido">
        <ErrorState message={fetchState.error ?? 'No se encontró el partido.'} onRetry={fetchState.refetch} />
      </PushScreen>
    );
  }

  const stage = stageLabel(m);
  const sim = m.simulation;
  const goals = m.goals ?? [];
  const finished = m.status === 'finished';
  const hasLineups = Boolean((m.lineups?.home?.players?.length ?? 0) || (m.lineups?.away?.players?.length ?? 0));

  return (
    <PushScreen title={stage} live={m.status === 'live'}>
      <View style={{ paddingTop: 4, paddingHorizontal: 16 }}>
        <Card pad={16}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Tag>{stage}</Tag>
          </View>
          <ScoreHead m={m} />
          {m.venue ? (
            <Text style={{ textAlign: 'center', marginTop: 12, color: t.ink3, fontSize: 12.5, fontFamily: fonts.text }}>
              {m.venue.name} · {m.venue.city}
            </Text>
          ) : null}
        </Card>
      </View>

      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Segmented
          options={[
            { v: 'oficial', label: 'Oficial' },
            { v: 'simulado', label: 'Simulado' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'oficial' ? (
        <View style={{ padding: 16 }}>
          {finished ? (
            <>
              {/* Goles y alineaciones SOLO si el proveedor los entrega (no mostramos vacíos). */}
              {goals.length > 0 ? (
                <>
                  <SectionTitle>Goles</SectionTitle>
                  <Card>
                    <Timeline goals={goals} homeCode={sideCode(m.home_team)} awayCode={sideCode(m.away_team)} />
                  </Card>
                </>
              ) : null}
              {hasLineups ? (
                <>
                  <SectionTitle style={{ marginTop: goals.length > 0 ? 24 : 0, marginBottom: 12 }}>Alineaciones</SectionTitle>
                  <Lineups m={m} />
                </>
              ) : null}
              {/* Lo que SÍ tenemos siempre: forma + últimos partidos. */}
              <SectionTitle style={{ marginTop: goals.length > 0 || hasLineups ? 24 : 0 }}>Forma de cada selección</SectionTitle>
              <Card style={{ gap: 14 }}>
                <FormStat team={m.home_team} placeholder={m.home_placeholder} />
                <View style={{ height: 1, backgroundColor: t.line }} />
                <FormStat team={m.away_team} placeholder={m.away_placeholder} />
              </Card>
              <RecentBlock m={m} />
            </>
          ) : (
            <>
              <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 20 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon name="whistle" size={26} color={t.ink3} />
                </View>
                <Text style={{ fontFamily: fonts.display, fontSize: 17, color: t.ink }}>Todavía no se jugó</Text>
                <Text style={{ fontSize: 13.5, color: t.ink2, marginTop: 2, fontFamily: fonts.text, textAlign: 'center' }}>
                  Mientras tanto, mirá la previa o simulá el resultado.
                </Text>
              </View>
              <SectionTitle>Forma de cada selección</SectionTitle>
              <Card style={{ gap: 14 }}>
                <FormStat team={m.home_team} placeholder={m.home_placeholder} />
                <View style={{ height: 1, backgroundColor: t.line }} />
                <FormStat team={m.away_team} placeholder={m.away_placeholder} />
              </Card>
              <RecentBlock m={m} />
            </>
          )}
        </View>
      ) : (
        <View style={{ padding: 16 }}>
          {sim ? (
            <>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Icon name="bolt" size={16} color={t.goldInk} />
                  <Tag>Predicción del modelo</Tag>
                </View>
                <ProbTriBar
                  w1={Math.round(sim.win_prob.home * 100)}
                  draw={Math.round(sim.win_prob.draw * 100)}
                  w2={Math.round(sim.win_prob.away * 100)}
                  height={12}
                  showLabels
                  labels={[sideCode(m.home_team) || 'L', sideCode(m.away_team) || 'V']}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                  <MiniStat label="xG previsto" v={`${sim.expected_goals.home.toFixed(2)} – ${sim.expected_goals.away.toFixed(2)}`} />
                  <MiniStat label="Más probable" v={`${sim.most_likely_score.home}–${sim.most_likely_score.away}`} />
                </View>
              </Card>
              <SectionTitle style={{ marginTop: 22, marginBottom: 12 }}>Marcadores más probables</SectionTitle>
              <Card style={{ gap: 11 }}>
                {sim.scoreline_ranking.slice(0, 5).map((s, i) => (
                  <ScorelineRow key={i} s={s} max={sim.scoreline_ranking[0]?.prob ?? 1} />
                ))}
              </Card>
              <View style={{ marginTop: 18 }}>
                <Btn full size="lg" icon="dice" onPress={() => router.push(`/simular?id=${m.id}`)}>
                  Abrir simulador completo
                </Btn>
              </View>
              <RecentBlock m={m} />
            </>
          ) : m.status === 'scheduled' ? (
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 12 }}>
              <Pill tone="gold" size="sm" icon="dice">SIN SIMULAR</Pill>
              <Text style={{ fontSize: 13.5, color: t.ink2, fontFamily: fonts.text, textAlign: 'center', maxWidth: 260 }}>
                Este partido todavía no tiene una simulación. Corré el modelo en el simulador.
              </Text>
              <Btn full size="lg" icon="dice" onPress={() => router.push(`/simular?id=${m.id}`)}>
                Simular partido
              </Btn>
            </View>
          ) : (
            <Empty text="No hay simulación disponible para este partido." />
          )}
        </View>
      )}
    </PushScreen>
  );
}

/** Últimos partidos del Mundial de cada selección (de la API: home_recent/away_recent). */
function RecentBlock({ m }: { m: Match }) {
  const { t } = useTokens();
  const home = m.home_recent ?? [];
  const away = m.away_recent ?? [];
  if (home.length === 0 && away.length === 0) return null;
  return (
    <>
      <SectionTitle style={{ marginTop: 24, marginBottom: 12 }}>Últimos partidos en el Mundial</SectionTitle>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Flag code={sideCode(m.home_team)} size={20} ring />
          <Text style={{ fontFamily: fonts.textBold, fontSize: 13.5, color: t.ink }}>{sideName(m.home_team, m.home_placeholder)}</Text>
        </View>
        <RecentList recent={home} />
        <View style={{ height: 1, backgroundColor: t.line, marginVertical: 2 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Flag code={sideCode(m.away_team)} size={20} ring />
          <Text style={{ fontFamily: fonts.textBold, fontSize: 13.5, color: t.ink }}>{sideName(m.away_team, m.away_placeholder)}</Text>
        </View>
        <RecentList recent={away} />
      </Card>
    </>
  );
}

/** Valoración de forma (rating/ataque/defensa) de una selección, si la trae la API. */
function FormStat({ team, placeholder }: { team: Team | null; placeholder: string | null }) {
  const { t } = useTokens();
  const form = team?.form ?? null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Flag code={sideCode(team)} size={26} ring />
      <Text style={{ flex: 1, fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink }}>{sideName(team, placeholder)}</Text>
      {form ? (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Metric label="ATK" v={form.attack} />
          <Metric label="DEF" v={form.defense} />
          <Metric label="RTG" v={form.rating} />
        </View>
      ) : (
        <Text style={{ color: t.ink3, fontSize: 12, fontFamily: fonts.text }}>Sin datos</Text>
      )}
    </View>
  );
}

function Metric({ label, v }: { label: string; v: number }) {
  const { t } = useTokens();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 15, color: t.ink }}>{Math.round(v * 10) / 10}</Text>
      <Text style={{ fontSize: 10, color: t.ink3, fontFamily: fonts.textSemi }}>{label}</Text>
    </View>
  );
}

/** Alineaciones de ambos lados (si vienen). */
function Lineups({ m }: { m: Match }) {
  const { t } = useTokens();
  const home = m.lineups?.home ?? null;
  const away = m.lineups?.away ?? null;
  if (!home && !away) return <Empty text="Sin alineaciones disponibles." />;
  const Side = ({ side, team }: { side: LineupSide | null; team: Team | null }) => (
    <Card style={{ flex: 1 }} pad={12}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Flag code={sideCode(team)} size={20} ring />
        <Text style={{ fontFamily: fonts.textBold, fontSize: 13, color: t.ink, flex: 1 }} numberOfLines={1}>
          {team?.code ?? '—'}
        </Text>
        {side?.formation ? <Text style={{ fontFamily: fonts.display, fontSize: 12, color: t.ink3 }}>{side.formation}</Text> : null}
      </View>
      {(side?.players ?? []).map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
          <Text style={{ width: 20, textAlign: 'right', fontFamily: fonts.display, fontSize: 12, color: t.ink3 }}>{p.number ?? ''}</Text>
          <Text style={{ flex: 1, fontFamily: fonts.text, fontSize: 12.5, color: t.ink }} numberOfLines={1}>{p.name}</Text>
        </View>
      ))}
      {(side?.players ?? []).length === 0 ? <Text style={{ color: t.ink3, fontSize: 12, fontFamily: fonts.text }}>Sin datos</Text> : null}
    </Card>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Side side={home} team={m.home_team} />
      <Side side={away} team={m.away_team} />
    </View>
  );
}

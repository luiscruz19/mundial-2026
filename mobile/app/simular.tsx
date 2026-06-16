/**
 * Simulador (ScreenSimular del diseño) — la pantalla estrella, con datos REALES.
 *  - Banner del partido (degradado oscuro→brand, banderas reales, fecha/sede).
 *  - Probabilidad real (win_prob ×100, 3 columnas + ProbTriBar).
 *  - "Jugá el partido": tirada animada muestreando un marcador de la distribución
 *    REAL (scoreline_ranking ponderado por prob). "Volver a simular" re-POSTea (force).
 *  - Monte Carlo client-side: N=10.000 muestras de scoreline_ranking y distribución.
 *  - Card "Detalles del modelo" (read-only): expected goals + marcador más probable.
 *
 * La simulación se obtiene con Simulations.get(id); si no existe, se corre con
 * Simulations.run(device_uuid, id).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PushScreen,
  Card,
  Btn,
  Pill,
  Tag,
  SectionTitle,
  ProbTriBar,
  MiniStat,
  ScorelineRow,
  Loading,
  ErrorState,
  Flag,
} from '@/components/ui';
import { useTokens, fonts, radii, mix } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { MatchesApi, SimulationsApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { stageLabel, sideName, sideCode, sampleScoreline } from '@/lib/format';
import { formatKickoff } from '@/lib/datetime';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { Match, ScoreProb, Simulation } from '@/types';

interface SimResult {
  s1: number;
  s2: number;
  who: 0 | 1 | 2;
}

interface McResult {
  dist: number[];
  w1: number;
  draw: number;
  w2: number;
  n: number;
  done: boolean;
}

export default function ScreenSimular() {
  const { t } = useTokens();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deviceUuid = useDeviceStore((s) => s.deviceUuid);
  const tz = useDeviceStore((s) => s.prefs?.timezone ?? 'UTC');

  const matchFetch = useFetch<Match>((signal) => MatchesApi.detail(id ?? '', signal), [id]);
  const m = matchFetch.data;

  // Simulación: intenta GET; si 404, corre POST.
  const [sim, setSim] = useState<Simulation | null>(null);
  const [simLoading, setSimLoading] = useState(true);
  const [simError, setSimError] = useState<string | null>(null);

  const loadSimulation = useCallback(
    async (force = false) => {
      if (!id) return;
      setSimLoading(true);
      setSimError(null);
      try {
        let result: Simulation;
        if (!force) {
          try {
            result = await SimulationsApi.get(id);
          } catch (err) {
            if (err instanceof ApiRequestError && err.status === 404 && deviceUuid) {
              result = await SimulationsApi.run(deviceUuid, id);
            } else {
              throw err;
            }
          }
        } else {
          if (!deviceUuid) throw new ApiRequestError('Dispositivo no inicializado.', 0);
          result = await SimulationsApi.run(deviceUuid, id, true);
        }
        setSim(result);
      } catch (err) {
        setSimError(err instanceof Error ? err.message : 'No se pudo simular el partido.');
      } finally {
        setSimLoading(false);
      }
    },
    [id, deviceUuid],
  );

  useEffect(() => {
    void loadSimulation(false);
  }, [loadSimulation]);

  if (matchFetch.loading || simLoading) {
    return (
      <PushScreen title="Simulador" accent>
        <Loading label="Corriendo el modelo…" />
      </PushScreen>
    );
  }
  if (matchFetch.error || !m) {
    return (
      <PushScreen title="Simulador" accent>
        <ErrorState message={matchFetch.error ?? 'No se encontró el partido.'} onRetry={matchFetch.refetch} />
      </PushScreen>
    );
  }
  if (simError || !sim) {
    return (
      <PushScreen title="Simulador" accent>
        <MatchBanner m={m} tz={tz} />
        <ErrorState message={simError ?? 'No hay simulación disponible.'} onRetry={() => loadSimulation(false)} />
      </PushScreen>
    );
  }

  return (
    <SimulatorBody
      m={m}
      sim={sim}
      tz={tz}
      onResimulate={() => loadSimulation(true)}
    />
  );
}

function SimulatorBody({
  m,
  sim,
  tz,
  onResimulate,
}: {
  m: Match;
  sim: Simulation;
  tz: string;
  onResimulate: () => void;
}) {
  const { t } = useTokens();
  const ranking = sim.scoreline_ranking;
  const homeCode = sideCode(m.home_team);
  const awayCode = sideCode(m.away_team);

  const w1 = Math.round(sim.win_prob.home * 100);
  const draw = Math.round(sim.win_prob.draw * 100);
  const w2 = Math.round(sim.win_prob.away * 100);

  const [play, setPlay] = useState<SimResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollText, setRollText] = useState('0–0');
  const [mc, setMc] = useState<McResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);
  const rollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;

  const runPlay = () => {
    if (rolling) return;
    setMc(null);
    setRolling(true);
    setPlay(null);
    let n = 0;
    rollRef.current = setInterval(() => {
      setRollText(`${Math.floor(Math.random() * 4)}–${Math.floor(Math.random() * 4)}`);
      n++;
      if (n > 11) {
        if (rollRef.current) clearInterval(rollRef.current);
        setRolling(false);
        const { home, away } = sampleScoreline(ranking);
        const who: 0 | 1 | 2 = home > away ? 1 : away > home ? 2 : 0;
        setPlay({ s1: home, s2: away, who });
        popAnim.setValue(0);
        Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }).start();
      }
    }, 90);
  };

  const runMonteCarlo = () => {
    if (mcRunning || ranking.length === 0) return;
    setPlay(null);
    setMcRunning(true);
    const N = 10000;
    const buckets = { a2: 0, a1: 0, d: 0, b1: 0, b2: 0 };
    let cw1 = 0;
    let cdr = 0;
    let cw2 = 0;
    for (let i = 0; i < N; i++) {
      const { home, away } = sampleScoreline(ranking);
      const diff = home - away;
      if (diff > 0) {
        cw1++;
        if (diff >= 2) buckets.a2++;
        else buckets.a1++;
      } else if (diff < 0) {
        cw2++;
        if (diff <= -2) buckets.b2++;
        else buckets.b1++;
      } else {
        cdr++;
        buckets.d++;
      }
    }
    const pct = (x: number) => Math.round((x / N) * 100);
    const target = {
      dist: [pct(buckets.a2), pct(buckets.a1), pct(buckets.d), pct(buckets.b1), pct(buckets.b2)],
      w1: pct(cw1),
      draw: pct(cdr),
      w2: pct(cw2),
    };
    let step = 0;
    const steps = 22;
    const iv = setInterval(() => {
      step++;
      const k = step / steps;
      setMc({
        dist: target.dist.map((v) => Math.round(v * k)),
        w1: Math.round(target.w1 * k),
        draw: Math.round(target.draw * k),
        w2: Math.round(target.w2 * k),
        n: Math.round(N * k),
        done: false,
      });
      if (step >= steps) {
        clearInterval(iv);
        setMc({ ...target, n: N, done: true });
        setMcRunning(false);
      }
    }, 45);
  };

  useEffect(
    () => () => {
      if (rollRef.current) clearInterval(rollRef.current);
    },
    [],
  );

  const popScale = popAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.85, 1.04, 1] });
  const homeName = sideName(m.home_team, m.home_placeholder);
  const awayName = sideName(m.away_team, m.away_placeholder);

  return (
    <PushScreen title="Simulador" accent>
      <MatchBanner m={m} tz={tz} />

      {/* probabilidad */}
      <View style={{ padding: 16 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <Tag>Probabilidad</Tag>
            <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.text }}>modelo</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
            <ProbCol code={homeCode} label={homeCode || 'Local'} v={w1} col={t.cWin} />
            <ProbCol label="Empate" v={draw} col={t.cDraw} />
            <ProbCol code={awayCode} label={awayCode || 'Visita'} v={w2} col={t.cLoss} right />
          </View>
          <ProbTriBar w1={w1} draw={draw} w2={w2} height={12} />
        </Card>
      </View>

      {/* jugá el partido */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: t.lineStrong, borderStyle: 'dashed', padding: 16, alignItems: 'center', backgroundColor: t.surface }}>
          {!play && !rolling ? (
            <>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: t.ink, marginBottom: 4 }}>Jugá el partido</Text>
              <Text style={{ fontSize: 13, color: t.ink2, marginBottom: 16, fontFamily: fonts.text }}>Una simulación, un resultado posible.</Text>
            </>
          ) : null}
          {rolling ? (
            <View style={{ paddingTop: 8, paddingBottom: 18, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 56, color: t.ink, letterSpacing: 2 }}>{rollText}</Text>
              <Text style={{ fontSize: 13, color: t.ink3, marginTop: 4, fontFamily: fonts.text }}>Simulando…</Text>
            </View>
          ) : null}
          {play ? (
            <Animated.View style={{ paddingTop: 4, paddingBottom: 8, alignItems: 'center', transform: [{ scale: popScale }], opacity: popAnim }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
                <Flag code={homeCode} size={36} round ring />
                <Text style={{ fontFamily: fonts.display, fontSize: 52, color: t.ink }}>
                  {play.s1}–{play.s2}
                </Text>
                <Flag code={awayCode} size={36} round ring />
              </View>
              <Pill tone={play.who === 1 ? 'brand' : play.who === 2 ? 'accent' : 'default'} size="sm" style={{ marginBottom: 14 }}>
                {play.who === 0 ? 'Empate' : `Gana ${play.who === 1 ? homeName : awayName}`}
              </Pill>
            </Animated.View>
          ) : null}
          <View style={{ marginTop: play ? 16 : 0, width: '100%' }}>
            <Btn full size="lg" variant={play ? 'ghost' : 'primary'} icon="dice" onPress={runPlay}>
              {play ? 'Tirar de nuevo' : 'Simular partido'}
            </Btn>
          </View>
        </View>
      </View>

      {/* Monte Carlo */}
      <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
        <SectionTitle>Monte Carlo</SectionTitle>
        <Card>
          {!mc ? (
            <View style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontSize: 13.5, color: t.ink2, marginBottom: 16, lineHeight: 20, textAlign: 'center', fontFamily: fonts.text }}>
                Muestreamos 10.000 marcadores de la distribución del modelo y vemos cómo se reparten.
              </Text>
              <Btn variant="outline" icon="chart" onPress={runMonteCarlo} full>
                Correr 10.000 simulaciones
              </Btn>
            </View>
          ) : (
            <McChart mc={mc} homeCode={homeCode} awayCode={awayCode} onRerun={runMonteCarlo} />
          )}
        </Card>
      </View>

      {/* marcadores más probables (reales) */}
      {ranking.length > 0 ? (
        <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
          <SectionTitle>Marcadores más probables</SectionTitle>
          <Card style={{ gap: 11 }}>
            {ranking.slice(0, 6).map((s, i) => (
              <ScorelineRow key={i} s={s} max={ranking[0]?.prob ?? 1} />
            ))}
          </Card>
        </View>
      ) : null}

      {/* detalles del modelo (read-only) */}
      <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
        <SectionTitle>Detalles del modelo</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <MiniStat label="xG previsto" v={`${sim.expected_goals.home.toFixed(2)} – ${sim.expected_goals.away.toFixed(2)}`} />
            <MiniStat label="Más probable" v={`${sim.most_likely_score.home}–${sim.most_likely_score.away}`} />
          </View>
        </Card>
      </View>

      {/* re-simular (force) */}
      <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
        <Btn variant="ghost" size="sm" icon="bolt" onPress={onResimulate} full>
          Volver a simular (recalcular modelo)
        </Btn>
      </View>
    </PushScreen>
  );
}

/** Banner del partido con banderas reales, fecha/sede. */
function MatchBanner({ m, tz }: { m: Match; tz: string }) {
  const { t } = useTokens();
  // Banner SIEMPRE oscuro (no usar t.ink: en modo oscuro es claro y deja el texto blanco ilegible).
  const heroBase = '#1A1611';
  const heroEnd = mix(heroBase, 80, t.brand);
  return (
    <View style={{ paddingTop: 4, paddingHorizontal: 16 }}>
      <LinearGradient
        colors={[heroBase, heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.card, padding: 16 }}
      >
        <Text style={{ textAlign: 'center', marginBottom: 6, color: '#fff', fontFamily: fonts.display, fontSize: 11, letterSpacing: 1.2, opacity: 0.7 }}>
          {stageLabel(m).toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <Flag code={sideCode(m.home_team)} size={52} round ring />
            <Text style={{ marginTop: 7, fontFamily: fonts.textExtra, fontSize: 13, color: '#fff' }}>
              {m.home_team?.code ?? '—'}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 18, color: '#fff', opacity: 0.5 }}>VS</Text>
          <View style={{ alignItems: 'center' }}>
            <Flag code={sideCode(m.away_team)} size={52} round ring />
            <Text style={{ marginTop: 7, fontFamily: fonts.textExtra, fontSize: 13, color: '#fff' }}>
              {m.away_team?.code ?? '—'}
            </Text>
          </View>
        </View>
        <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#fff', opacity: 0.65, fontFamily: fonts.text }}>
          {formatKickoff(m.kickoff_utc, { timezone: tz })}
          {m.venue ? ` · ${m.venue.name}` : ''}
        </Text>
      </LinearGradient>
    </View>
  );
}

/** Columna de probabilidad (equipo o empate) con número grande. */
function ProbCol({ code, label, v, col, right }: { code?: string; label?: string; v: number; col: string; right?: boolean }) {
  const { t } = useTokens();
  return (
    <View style={{ alignItems: right ? 'flex-end' : code ? 'flex-start' : 'center', flex: code ? 1 : undefined }}>
      <View style={{ flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        {code ? <Flag code={code} size={22} ring /> : null}
        <Text style={{ fontSize: 12, fontFamily: fonts.textBold, color: t.ink2 }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 30, color: col, lineHeight: 32 }}>
        {v}
        <Text style={{ fontSize: 15 }}>%</Text>
      </Text>
    </View>
  );
}

/** Gráfico de distribución del Monte Carlo (5 barras) + encabezado 1X2. */
function McChart({
  mc,
  homeCode,
  awayCode,
  onRerun,
}: {
  mc: McResult;
  homeCode: string;
  awayCode: string;
  onRerun: () => void;
}) {
  const { t } = useTokens();
  const labels = [`${homeCode || 'L'} +2`, `${homeCode || 'L'} +1`, 'X', `${awayCode || 'V'} +1`, `${awayCode || 'V'} +2`];
  const cols = [t.cWin, t.cWin, t.cDraw, t.cLoss, t.cLoss];
  const maxDist = Math.max(...mc.dist, 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 13, color: t.ink3 }}>{mc.n.toLocaleString('es')} sim.</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={{ color: t.cWin, fontFamily: fonts.display, fontSize: 13 }}>{homeCode || 'L'} {mc.w1}%</Text>
          <Text style={{ color: t.ink3, fontFamily: fonts.display, fontSize: 13 }}>X {mc.draw}%</Text>
          <Text style={{ color: t.cLoss, fontFamily: fonts.display, fontSize: 13 }}>{awayCode || 'V'} {mc.w2}%</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, paddingHorizontal: 4 }}>
        {mc.dist.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 12.5, color: t.ink }}>{v}%</Text>
            <View
              style={{
                width: '100%',
                height: `${(v / maxDist) * 80}%`,
                minHeight: 4,
                backgroundColor: cols[i],
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
              }}
            />
            <Text style={{ fontSize: 10, color: t.ink3, fontFamily: fonts.textSemi }}>{labels[i]}</Text>
          </View>
        ))}
      </View>
      {mc.done ? (
        <View style={{ marginTop: 14 }}>
          <Btn variant="ghost" size="sm" icon="dice" onPress={onRerun} full>
            Correr de nuevo
          </Btn>
        </View>
      ) : null}
    </View>
  );
}

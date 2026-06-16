/**
 * Hoy / Calendario (ScreenHome del diseño). Tarjeta EN VIVO destacada, CTA del
 * simulador, selector de días, filtros y lista de partidos + próximos.
 *
 * Cableada a datos reales: Matches.list() para el fixture, Matches.list({status:'live'})
 * para la tarjeta en vivo, y un próximo partido scheduled para el CTA del simulador.
 */
import { useMemo, useState } from 'react';
import { View, Text, Pressable, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppMast,
  TeamBig,
  MatchRow,
  DayPills,
  Card,
  Pill,
  Segmented,
  SectionTitle,
  Empty,
  Loading,
  ErrorState,
  LiveDot,
  Icon,
  Flag,
  Display,
  type DayPillItem,
} from '@/components/ui';
import { useTokens, fonts, radii, brandGlow, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { MatchesApi } from '@/api/endpoints';
import { localDayKey, formatTimeOnly } from '@/lib/datetime';
import { sideName } from '@/lib/format';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { Match } from '@/types';

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ScreenHome() {
  const { t } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tz = useDeviceStore((s) => s.prefs?.timezone ?? 'UTC');
  const favs = useDeviceStore((s) => s.prefs?.teams_of_interest ?? []);

  const [day, setDay] = useState(0);
  const [filter, setFilter] = useState('Todos');

  const all = useFetch<Match[]>((signal) => MatchesApi.list({}, signal), []);
  const liveFetch = useFetch<Match[]>((signal) => MatchesApi.list({ status: 'live' }, signal), []);

  const matches = useMemo(() => all.data ?? [], [all.data]);
  const live = liveFetch.data?.[0] ?? null;

  // Agrupar por día local.
  const days = useMemo<DayPillItem[]>(() => {
    const keys = new Map<string, DayPillItem>();
    for (const m of matches) {
      const key = localDayKey(m.kickoff_utc, tz);
      if (!key || keys.has(key)) continue;
      const d = new Date(`${key}T12:00:00`);
      const parts = formatDayParts(d);
      keys.set(key, { key, dow: parts.dow, rest: parts.rest });
    }
    return Array.from(keys.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [matches, tz]);

  // Día seleccionado: si el índice quedó fuera de rango, usar 0.
  const activeDay = day < days.length ? day : 0;
  const dayKey = days[activeDay]?.key ?? null;

  // CTA simulador: primer próximo de una selección favorita; si no, primer próximo del fixture.
  const ctaMatch = useMemo(() => {
    const scheduled = matches
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
    const favMatch = scheduled.find(
      (m) =>
        (m.home_team && favs.includes(m.home_team.id)) ||
        (m.away_team && favs.includes(m.away_team.id)),
    );
    return favMatch ?? scheduled[0] ?? null;
  }, [matches, favs]);

  // Mejor ranking para "Destacados".
  const isFeatured = (m: Match) => {
    const r1 = m.home_team?.rank ?? 999;
    const r2 = m.away_team?.rank ?? 999;
    return Math.min(r1, r2) <= 12;
  };

  const list = useMemo(() => {
    let l = matches;
    if (filter === 'Mi selección') {
      l = matches.filter(
        (m) =>
          (m.home_team && favs.includes(m.home_team.id)) ||
          (m.away_team && favs.includes(m.away_team.id)),
      );
    } else if (filter === 'Destacados') {
      l = matches.filter(isFeatured);
    } else {
      l = dayKey ? matches.filter((m) => localDayKey(m.kickoff_utc, tz) === dayKey) : matches;
    }
    return l.slice().sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
  }, [matches, filter, dayKey, favs, tz]);

  // Próximos: siguientes partidos scheduled del fixture entero.
  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'scheduled')
        .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc))
        .slice(0, 4),
    [matches],
  );

  const refreshAll = () => {
    all.refetch();
    liveFetch.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <AppMast title="Hoy" subtitle="Copa del Mundo · 2026" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={all.refreshing} onRefresh={refreshAll} tintColor={t.brand} />}
      >
        {all.loading ? (
          <Loading />
        ) : all.error ? (
          <ErrorState message={all.error} onRetry={refreshAll} />
        ) : (
          <>
            {/* En vivo destacado */}
            {live ? (
              <Pressable onPress={() => router.push(`/live?id=${live.id}`)} style={{ marginHorizontal: 16, marginBottom: 14, marginTop: 14 }}>
                <LinearGradient
                  colors={[t.brand, t.brandDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[{ borderRadius: radii.card, overflow: 'hidden', padding: 16 }, brandGlow(t.brand)]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <LiveDot size={8} />
                      <Text style={{ color: '#fff', fontFamily: fonts.display, fontSize: 12, letterSpacing: 1 }}>
                        EN VIVO · {live.live?.minute ?? 0}&apos;
                      </Text>
                    </View>
                    {live.group ? (
                      <Text style={{ color: '#fff', fontSize: 12, fontFamily: fonts.textSemi, opacity: 0.85 }}>Grupo {live.group}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TeamBig code={live.home_team?.code ?? ''} name={sideName(live.home_team, live.home_placeholder)} align="left" onLight />
                    <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: '#fff', paddingHorizontal: 6 }}>
                      {live.live?.home_score ?? live.home_score ?? 0}–{live.live?.away_score ?? live.away_score ?? 0}
                    </Text>
                    <TeamBig code={live.away_team?.code ?? ''} name={sideName(live.away_team, live.away_placeholder)} align="right" onLight />
                  </View>
                  <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff', fontSize: 12.5, fontFamily: fonts.textSemi, opacity: 0.9 }}>
                      Toca para la cobertura minuto a minuto
                    </Text>
                    <Icon name="chevron" size={16} stroke={2.5} color="#fff" />
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}

            {/* CTA simulador */}
            {ctaMatch ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: live ? 0 : 14 }}>
                <Card onPress={() => router.push(`/simular?id=${ctaMatch.id}`)} style={{ overflow: 'hidden' }}>
                  <View
                    style={{
                      position: 'absolute',
                      right: -30,
                      top: -30,
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: alpha(t.gold, 0.22),
                    }}
                  />
                  <Pill tone="gold" size="sm" icon="dice">SIMULADOR</Pill>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 4 }}>
                    <Flag code={ctaMatch.home_team?.code ?? ''} size={34} ring />
                    <Display style={{ fontSize: 22, color: t.ink }}>vs</Display>
                    <Flag code={ctaMatch.away_team?.code ?? ''} size={34} ring />
                    <View style={{ flex: 1 }} />
                    <Icon name="chevron" size={20} stroke={2.5} color={t.ink3} />
                  </View>
                  <Display style={{ fontSize: 19, color: t.ink }}>Simulá el partidazo</Display>
                  <Text style={{ color: t.ink2, fontSize: 13.5, marginTop: 2, fontFamily: fonts.text }}>
                    {sideName(ctaMatch.home_team, ctaMatch.home_placeholder)} vs {sideName(ctaMatch.away_team, ctaMatch.away_placeholder)} · probabilidades y marcadores
                  </Text>
                </Card>
              </View>
            ) : null}

            {/* Selector de días */}
            {filter === 'Todos' && days.length > 0 ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <DayPills days={days} value={activeDay} onChange={setDay} />
              </View>
            ) : null}

            {/* Filtros */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <Segmented options={['Todos', 'Mi selección', 'Destacados']} value={filter} onChange={setFilter} size="sm" />
            </View>

            {/* Lista de partidos */}
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {list.length === 0 ? <Empty text="No hay partidos con este filtro." /> : null}
              {list.map((m) => (
                <MatchRow key={m.id} m={m} timeLabel={formatTimeOnly(m.kickoff_utc, tz)} />
              ))}
            </View>

            {/* Próximos */}
            {upcoming.length > 0 ? (
              <View style={{ paddingTop: 22, paddingHorizontal: 16, paddingBottom: 8 }}>
                <SectionTitle>Próximos</SectionTitle>
                <View style={{ gap: 10 }}>
                  {upcoming.map((m) => (
                    <MatchRow key={`up-${m.id}`} m={m} timeLabel={formatTimeOnly(m.kickoff_utc, tz)} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function formatDayParts(d: Date): { dow: string; rest: string } {
  const dow = DOW[d.getDay()] ?? '';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const rest = `${d.getDate()} ${months[d.getMonth()] ?? ''}`;
  return { dow, rest };
}

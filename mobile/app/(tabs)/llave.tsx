/**
 * Llave (ScreenBracket). Columnas horizontales por ronda (R32→F, incluye 3er puesto).
 * Los placeholders ("2A", "3 A/B/C/D/F", "W:R32-1") se resuelven a selecciones reales con
 * la tabla de posiciones (/standings): la primera ronda ya muestra banderas reales aunque
 * la fase final no haya arrancado. Un cruce real y no jugado navega al simulador.
 */
import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TabScreen, Card, Btn, Tag, Icon, Flag, Loading, ErrorState, Empty } from '@/components/ui';
import { useTokens, fonts, radii, cardShadow, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { BracketApi, StandingsApi } from '@/api/endpoints';
import { roundShort } from '@/lib/format';
import { buildBracketResolver, type BracketResolver } from '@/lib/bracket';
import type { BracketStage, GroupStanding, Match } from '@/types';

export default function ScreenBracket() {
  const { t } = useTokens();
  const router = useRouter();

  const bracket = useFetch<BracketStage[]>((signal) => BracketApi.list(signal), []);
  const standings = useFetch<GroupStanding[]>((signal) => StandingsApi.list(signal), []);
  const rounds = bracket.data ?? [];

  const resolver = useMemo(
    () => buildBracketResolver(standings.data ?? [], rounds),
    [standings.data, rounds],
  );

  const Row = ({ code, name, s, win, lose, done, projected }: {
    code: string; name: string; s: number | null; win: boolean; lose: boolean; done: boolean; projected: boolean;
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 9, opacity: lose ? 0.5 : 1 }}>
      {code ? <Flag code={code} size={20} ring /> : <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: t.surface2 }} />}
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: win ? fonts.textExtra : fonts.textSemi, fontSize: 13, color: projected ? t.ink2 : t.ink }}>
        {name}
      </Text>
      {done ? <Text style={{ fontFamily: fonts.display, fontSize: 14, color: win ? t.ink : t.ink3 }}>{s ?? 0}</Text> : null}
    </View>
  );

  const MatchCard = ({ m, big, resolver }: { m: Match; big?: boolean; resolver: BracketResolver }) => {
    const done = m.status === 'finished';
    const s1 = m.home_score;
    const s2 = m.away_score;
    const p1 = m.home_penalties;
    const p2 = m.away_penalties;
    const win1 = done && ((s1 ?? 0) > (s2 ?? 0) || (s1 === s2 && p1 != null && p2 != null && p1 > p2));
    const win2 = done && ((s2 ?? 0) > (s1 ?? 0) || (s1 === s2 && p1 != null && p2 != null && p2 > p1));

    // Lados reales si el backend ya los asignó; si no, resueltos por standings (proyectados).
    const homeReal = m.home_team;
    const awayReal = m.away_team;
    const homeRes = homeReal ? { team: homeReal, label: homeReal.code } : resolver.resolve(m.home_placeholder, m.bracket_slot ?? '', 'home');
    const awayRes = awayReal ? { team: awayReal, label: awayReal.code } : resolver.resolve(m.away_placeholder, m.bracket_slot ?? '', 'away');
    const homeProjected = !homeReal;
    const awayProjected = !awayReal;

    const bothReal = !!homeReal && !!awayReal;
    const simulable = bothReal && m.status === 'scheduled';
    const pens = done && p1 != null && p2 != null && s1 === s2 ? `${p1}-${p2}` : null;

    return (
      <Pressable
        onPress={bothReal ? (simulable ? () => router.push(`/simular?id=${m.id}`) : () => router.push(`/match/${m.id}`)) : undefined}
        style={{
          backgroundColor: t.surface,
          borderWidth: simulable ? 2 : 1,
          borderColor: simulable ? t.gold : t.line,
          borderRadius: radii.chip,
          minWidth: big ? 152 : 134,
          overflow: 'hidden',
          ...cardShadow,
        }}
      >
        {m.bracket_slot ? (
          <Text style={{ fontSize: 8.5, color: t.ink3, fontFamily: fonts.display, textAlign: 'center', paddingTop: 4, letterSpacing: 0.5 }}>
            {m.bracket_slot}
          </Text>
        ) : null}
        <Row code={homeRes.team?.code ?? ''} name={homeRes.team?.name ?? homeRes.label} s={s1} win={win1} lose={win2} done={done} projected={homeProjected} />
        <View style={{ height: 1, backgroundColor: t.line }} />
        <Row code={awayRes.team?.code ?? ''} name={awayRes.team?.name ?? awayRes.label} s={s2} win={win2} lose={win1} done={done} projected={awayProjected} />
        {pens ? (
          <Text style={{ fontSize: 10, color: t.ink3, textAlign: 'center', paddingBottom: 4, fontFamily: fonts.display }}>pen. {pens}</Text>
        ) : null}
      </Pressable>
    );
  };

  const Col = ({ label, matches }: { label: string; matches: Match[] }) => (
    <View style={{ gap: 14, minWidth: 144, justifyContent: 'center' }}>
      <Tag style={{ textAlign: 'center' }}>{label}</Tag>
      <View style={{ flex: 1, justifyContent: 'space-around', gap: 12 }}>
        {matches.map((m, i) => (
          <MatchCard key={m.id ?? i} m={m} big={label === 'Final'} resolver={resolver} />
        ))}
      </View>
    </View>
  );

  return (
    <TabScreen title="Llave" subtitle="Fase final · eliminación directa">
      {bracket.loading ? (
        <Loading />
      ) : bracket.error ? (
        <ErrorState message={bracket.error} onRetry={bracket.refetch} />
      ) : rounds.length === 0 ? (
        <Empty text="La fase final todavía no está definida." />
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Icon name="info" size={16} color={t.goldInk} />
              <Text style={{ color: t.ink2, fontSize: 13, fontFamily: fonts.text, flex: 1 }}>
                Cruces proyectados según las posiciones actuales. Deslizá para ver toda la llave →
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingBottom: 12, alignItems: 'stretch' }}>
            {rounds.map((r) => (
              <Col key={r.round} label={roundShort(r.round)} matches={r.matches} />
            ))}
          </ScrollView>

          <View style={{ paddingTop: 8, paddingHorizontal: 16 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
              <LinearGradient
                colors={[alpha(t.gold, 0.18), t.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: alpha(t.gold, 0.3), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trophy" size={24} color={t.goldInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 16, color: t.ink }}>¿Quién levanta la copa?</Text>
                <Text style={{ fontSize: 13, color: t.ink2, fontFamily: fonts.text }}>Mirá la proyección del torneo</Text>
              </View>
              <Btn variant="ghost" size="sm" onPress={() => router.push('/(tabs)/proyeccion')}>Ver</Btn>
            </Card>
          </View>
        </>
      )}
    </TabScreen>
  );
}

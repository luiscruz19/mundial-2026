/**
 * Llave (ScreenBracket del diseño). Columnas horizontales por ronda (R32→F,
 * incluye 3er puesto si viene). Equipos pueden venir como placeholder; un cruce
 * con ambos equipos definidos y no jugado navega al simulador.
 */
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TabScreen, Card, Btn, Tag, Icon, Flag, Loading, ErrorState, Empty } from '@/components/ui';
import { useTokens, fonts, radii, cardShadow, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { BracketApi } from '@/api/endpoints';
import { roundShort, sideName } from '@/lib/format';
import type { BracketStage, Match } from '@/types';

export default function ScreenBracket() {
  const { t } = useTokens();
  const router = useRouter();

  const bracket = useFetch<BracketStage[]>((signal) => BracketApi.list(signal), []);
  const rounds = bracket.data ?? [];

  const Row = ({
    code,
    name,
    s,
    win,
    lose,
    done,
  }: {
    code: string;
    name: string;
    s: number | null;
    win: boolean;
    lose: boolean;
    done: boolean;
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 9, opacity: lose ? 0.5 : 1 }}>
      <Flag code={code} size={20} ring />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: win ? fonts.textExtra : fonts.textSemi, fontSize: 13, color: t.ink }}>
        {name}
      </Text>
      {done ? <Text style={{ fontFamily: fonts.display, fontSize: 14, color: win ? t.ink : t.ink3 }}>{s ?? 0}</Text> : null}
    </View>
  );

  const MatchCard = ({ m, big }: { m: Match; big?: boolean }) => {
    const done = m.status === 'finished';
    const s1 = m.home_score;
    const s2 = m.away_score;
    const p1 = m.home_penalties;
    const p2 = m.away_penalties;
    const win1 = done && ((s1 ?? 0) > (s2 ?? 0) || (s1 === s2 && p1 != null && p2 != null && p1 > p2));
    const win2 = done && ((s2 ?? 0) > (s1 ?? 0) || (s1 === s2 && p1 != null && p2 != null && p2 > p1));
    const bothDefined = !!m.home_team && !!m.away_team;
    const simulable = bothDefined && m.status === 'scheduled';
    const pens = done && p1 != null && p2 != null && s1 === s2 ? `${p1}-${p2}` : null;
    return (
      <Pressable
        onPress={simulable ? () => router.push(`/simular?id=${m.id}`) : () => router.push(`/match/${m.id}`)}
        style={{
          backgroundColor: t.surface,
          borderWidth: simulable ? 2 : 1,
          borderColor: simulable ? t.gold : t.line,
          borderRadius: radii.chip,
          minWidth: big ? 150 : 132,
          overflow: 'hidden',
          ...cardShadow,
        }}
      >
        <Row
          code={m.home_team?.code ?? ''}
          name={sideName(m.home_team, m.home_placeholder)}
          s={s1}
          win={win1}
          lose={win2}
          done={done}
        />
        <View style={{ height: 1, backgroundColor: t.line }} />
        <Row
          code={m.away_team?.code ?? ''}
          name={sideName(m.away_team, m.away_placeholder)}
          s={s2}
          win={win2}
          lose={win1}
          done={done}
        />
        {pens ? (
          <Text style={{ fontSize: 10, color: t.ink3, textAlign: 'center', paddingBottom: 4, fontFamily: fonts.display }}>
            pen. {pens}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const Col = ({ label, matches }: { label: string; matches: Match[] }) => (
    <View style={{ gap: 14, minWidth: 142, justifyContent: 'center' }}>
      <Tag style={{ textAlign: 'center' }}>{label}</Tag>
      <View style={{ flex: 1, justifyContent: 'space-around', gap: 12 }}>
        {matches.map((m, i) => (
          <MatchCard key={m.id ?? i} m={m} big={label === 'Final'} />
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
                Los cruces resaltados se pueden simular. Deslizá para ver toda la llave →
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

/**
 * Proyección (ScreenProyeccion del diseño). "Probabilidad de campeón" (ranking
 * con barras, líder en gold) y "Camino al título" (selector de equipo + barras
 * por ronda: 16avos→Semis→Final→Campeón). Cableado a Tournament.projection().
 */
import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { TabScreen, Card, Btn, Segmented, SectionTitle, Icon, Flag, Loading, ErrorState, Empty } from '@/components/ui';
import { useTokens, fonts, mix } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TournamentApi } from '@/api/endpoints';
import type { TournamentProjection } from '@/types';

const pct = (p: number) => Math.round(p * 1000) / 10;

export default function ScreenProyeccion() {
  const { t } = useTokens();
  const router = useRouter();
  const proj = useFetch<TournamentProjection>((signal) => TournamentApi.projection(signal), []);

  // Ranking por prob. de campeón.
  const ranking = useMemo(
    () => (proj.data?.teams ?? []).slice().sort((a, b) => b.prob_champion - a.prob_champion),
    [proj.data],
  );
  const top = ranking.slice(0, 10);

  const [teamCode, setTeamCode] = useState<string | null>(null);
  const selectorTeams = ranking.slice(0, 6);
  const activeCode = teamCode ?? selectorTeams[0]?.team.code ?? null;
  const active = ranking.find((r) => r.team.code === activeCode) ?? null;

  if (proj.loading) {
    return (
      <TabScreen title="Proyección" subtitle="Monte Carlo">
        <Loading />
      </TabScreen>
    );
  }
  if (proj.error) {
    return (
      <TabScreen title="Proyección" subtitle="Monte Carlo">
        <ErrorState message={proj.error} onRetry={proj.refetch} />
      </TabScreen>
    );
  }
  if (!proj.data || top.length === 0) {
    return (
      <TabScreen title="Proyección" subtitle="Monte Carlo">
        <Empty text="Todavía no hay una proyección disponible." />
      </TabScreen>
    );
  }

  const runs = proj.data.runs;
  const maxChamp = top[0]?.prob_champion ?? 1;

  // Camino al título: Octavos → Cuartos → Semis → Final → Campeón (probabilidades 0..1).
  // 'prob_round_of_16' = llegar a octavos (la fase final). 'Cuartos' solo si el backend lo expone.
  const path = active
    ? [
        { label: 'Octavos', v: pct(active.prob_round_of_16) },
        ...(active.prob_quarter != null ? [{ label: 'Cuartos', v: pct(active.prob_quarter) }] : []),
        { label: 'Semis', v: pct(active.prob_semi) },
        { label: 'Final', v: pct(active.prob_final) },
        { label: 'Campeón', v: pct(active.prob_champion) },
      ]
    : [];

  return (
    <TabScreen title="Proyección" subtitle={`Monte Carlo · ${runs.toLocaleString('es')} torneos simulados`}>
      {/* acceso al ranking de fuerza (Elo) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Btn variant="outline" size="sm" icon="chart" full onPress={() => router.push('/ranking' as any)}>
          Ranking de fuerza (Elo)
        </Btn>
      </View>

      {/* probabilidad de campeón */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <SectionTitle>Probabilidad de campeón</SectionTitle>
        <Card style={{ gap: 13 }}>
          {top.map((c, i) => (
            <Pressable key={c.team.id} onPress={() => setTeamCode(c.team.code)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <Text style={{ width: 16, fontFamily: fonts.display, fontSize: 13, color: t.ink3 }}>{i + 1}</Text>
              <View style={{ borderWidth: activeCode === c.team.code ? 2 : 0, borderColor: t.brand, borderRadius: 14, padding: activeCode === c.team.code ? 2 : 0 }}>
                <Flag code={c.team.code} size={26} ring />
              </View>
              <Text numberOfLines={1} style={{ width: 96, fontFamily: fonts.textBold, fontSize: 14, color: t.ink }}>
                {c.team.name}
              </Text>
              <View style={{ flex: 1, height: 9, backgroundColor: t.surface2, borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: `${maxChamp > 0 ? (c.prob_champion / maxChamp) * 100 : 0}%`, height: '100%', backgroundColor: i === 0 ? t.gold : t.brand, borderRadius: 999 }} />
              </View>
              <Text style={{ width: 44, textAlign: 'right', fontFamily: fonts.display, fontSize: 14.5, color: t.ink }}>{pct(c.prob_champion)}%</Text>
            </Pressable>
          ))}
        </Card>
      </View>

      {/* camino al título */}
      {active ? (
        <View style={{ paddingTop: 22, paddingHorizontal: 16 }}>
          <SectionTitle>Camino al título</SectionTitle>
          <View style={{ marginBottom: 14 }}>
            <Segmented
              options={selectorTeams.map((c) => ({ v: c.team.code, label: c.team.name }))}
              value={activeCode ?? ''}
              onChange={setTeamCode}
              size="sm"
            />
          </View>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 150, marginBottom: 10 }}>
              {path.map((p, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 12, color: t.ink }}>{p.v}%</Text>
                  <View
                    style={{
                      width: '78%',
                      height: `${p.v}%`,
                      minHeight: 4,
                      backgroundColor: i === path.length - 1 ? t.gold : mix(t.brand, 50 + i * 12, t.surface2),
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                      borderBottomLeftRadius: 3,
                      borderBottomRightRadius: 3,
                    }}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {path.map((p, i) => (
                <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, color: t.ink3, fontFamily: fonts.textSemi, lineHeight: 12 }}>
                  {p.label}
                </Text>
              ))}
            </View>
          </Card>
          <View style={{ marginTop: 14 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: mix(t.brand, 7, t.surface) }}>
              <Icon name="info" size={20} color={t.brandStrong} />
              <Text style={{ flex: 1, fontSize: 13, color: t.ink2, fontFamily: fonts.text, lineHeight: 19 }}>
                <Text style={{ color: t.ink, fontFamily: fonts.textBold }}>{active.team.name}</Text> llega a la final en{' '}
                <Text style={{ color: t.ink, fontFamily: fonts.textBold }}>{pct(active.prob_final)}%</Text> de los torneos y levanta la
                copa en <Text style={{ color: t.ink, fontFamily: fonts.textBold }}>{pct(active.prob_champion)}%</Text>. Llega, en
                promedio, hasta <Text style={{ color: t.ink, fontFamily: fonts.textBold }}>{active.expected_round_label}</Text>.
              </Text>
            </Card>
          </View>
        </View>
      ) : null}
    </TabScreen>
  );
}

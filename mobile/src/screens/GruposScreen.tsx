/**
 * Grupos (ScreenGrupos del diseño). Selector horizontal A–L, tabla de
 * posiciones real con franja brand para clasificados (top 2) y partidos del grupo.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TabScreen,
  Card,
  MatchRow,
  SectionTitle,
  Empty,
  Loading,
  ErrorState,
  Flag,
} from '@/components/ui';
import { useTokens, fonts, radii, brandGlow, cardShadow, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { StandingsApi, MatchesApi } from '@/api/endpoints';
import { formatTimeOnly } from '@/lib/datetime';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { RootStackParamList } from '@/navigation/types';
import type { GroupStanding, Match } from '@/types';

export default function ScreenGrupos() {
  const { t } = useTokens();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tz = useDeviceStore((s) => s.prefs?.timezone ?? 'UTC');
  const [gi, setGi] = useState(0);

  const standings = useFetch<GroupStanding[]>((signal) => StandingsApi.list(signal), []);
  const groups = standings.data ?? [];
  const safeGi = gi < groups.length ? gi : 0;
  const g = groups[safeGi];

  const matches = useFetch<Match[]>(
    (signal) => (g ? MatchesApi.list({ group: g.group }, signal) : Promise.resolve([])),
    [g?.group],
  );

  // Si cambian los grupos y el índice quedó fuera de rango, lo reseteamos.
  useEffect(() => {
    if (gi >= groups.length && groups.length > 0) setGi(0);
  }, [groups.length, gi]);

  if (standings.loading) {
    return (
      <TabScreen title="Grupos" subtitle="Fase de grupos · 12 zonas">
        <Loading />
      </TabScreen>
    );
  }
  if (standings.error) {
    return (
      <TabScreen title="Grupos" subtitle="Fase de grupos · 12 zonas">
        <ErrorState message={standings.error} onRetry={standings.refetch} />
      </TabScreen>
    );
  }
  if (!g) {
    return (
      <TabScreen title="Grupos" subtitle="Fase de grupos · 12 zonas">
        <Empty text="Todavía no hay grupos definidos." />
      </TabScreen>
    );
  }

  return (
    <TabScreen title="Grupos" subtitle="Fase de grupos · 12 zonas">
      {/* selector A–L */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingBottom: 14 }}>
        {groups.map((gr, i) => {
          const active = i === safeGi;
          return (
            <Pressable
              key={gr.group}
              onPress={() => setGi(i)}
              style={[
                {
                  width: 44,
                  height: 44,
                  borderRadius: radii.chip,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: active ? 0 : 1,
                  borderColor: t.line,
                  backgroundColor: active ? t.brand : t.surface,
                },
                active ? brandGlow(t.brand) : cardShadow,
              ]}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: active ? t.brandInk : t.ink2 }}>{gr.group}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 11, paddingBottom: 8, paddingHorizontal: 14 }}>
            <Text style={{ width: 22, color: t.ink3, fontFamily: fonts.textBold, fontSize: 11.5 }}>#</Text>
            <Text style={{ flex: 1, color: t.ink3, fontFamily: fonts.textBold, fontSize: 11.5 }}>EQUIPO</Text>
            {['PJ', 'DG', 'PTS'].map((h) => (
              <Text key={h} style={{ width: 30, textAlign: 'center', color: t.ink3, fontFamily: fonts.textBold, fontSize: 11.5 }}>
                {h}
              </Text>
            ))}
          </View>
          {g.rows.map((row, i) => {
            const qual = i < 2;
            return (
              <Pressable
                key={row.team.id}
                onPress={() => navigation.navigate('Team', { id: String(row.team.id) })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderTopWidth: 1,
                  borderTopColor: t.line,
                  backgroundColor: qual ? alpha(t.brand, 0.05) : 'transparent',
                }}
              >
                <View style={{ width: 22, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: qual ? t.brand : 'transparent', marginRight: 2 }} />
                  <Text style={{ fontFamily: fonts.display, fontSize: 14, color: t.ink2 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Flag code={row.team.code} size={24} ring />
                  <Text numberOfLines={1} style={{ fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink, flexShrink: 1 }}>
                    {row.team.name}
                  </Text>
                </View>
                <Text style={{ width: 30, textAlign: 'center', fontFamily: fonts.display, fontSize: 14, color: t.ink2 }}>{row.played}</Text>
                <Text style={{ width: 30, textAlign: 'center', fontFamily: fonts.display, fontSize: 14, color: t.ink2 }}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </Text>
                <Text style={{ width: 30, textAlign: 'center', fontFamily: fonts.display, fontSize: 15, color: t.ink }}>{row.points}</Text>
              </Pressable>
            );
          })}
        </Card>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, paddingLeft: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: t.brand }} />
            <Text style={{ fontSize: 12, color: t.ink3, fontFamily: fonts.text }}>Clasifica a 16avos</Text>
          </View>
        </View>

        <SectionTitle style={{ marginTop: 24, marginBottom: 10 }}>Partidos del grupo {g.group}</SectionTitle>
        <View style={{ gap: 10 }}>
          {matches.loading ? <Loading label="Cargando partidos…" /> : null}
          {!matches.loading && (matches.data?.length ?? 0) === 0 ? (
            <Empty text="Calendario del grupo próximamente." />
          ) : null}
          {(matches.data ?? [])
            .slice()
            .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc))
            .map((m) => (
              <MatchRow key={m.id} m={m} timeLabel={formatTimeOnly(m.kickoff_utc, tz)} />
            ))}
        </View>
      </View>
    </TabScreen>
  );
}

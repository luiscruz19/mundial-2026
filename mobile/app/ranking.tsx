/**
 * Ranking de fuerza (Elo) — F2 + F6. Dos vistas:
 *  - Selecciones: las 48 ordenadas por Elo del modelo, con su rank FIFA al lado para
 *    ver dónde el modelo discrepa del ranking oficial.
 *  - Grupos: los 12 grupos ordenados por Elo promedio (el "grupo de la muerte").
 * Datos: GET /teams (ya trae elo, fifa_rank, group). Sin tocar backend.
 */
import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import {
  PushScreen,
  Card,
  Segmented,
  SectionTitle,
  Loading,
  ErrorState,
  Empty,
  Flag,
} from '@/components/ui';
import { useTokens, fonts, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TeamsApi } from '@/api/endpoints';
import type { Team } from '@/types';

export default function ScreenRanking() {
  const { t } = useTokens();
  const [tab, setTab] = useState('selecciones');
  const teamsFetch = useFetch<Team[]>((s) => TeamsApi.list(s), []);
  const teams = teamsFetch.data ?? [];

  const byElo = useMemo(
    () => teams.filter((tm) => tm.elo != null).sort((a, b) => (b.elo as number) - (a.elo as number)),
    [teams],
  );

  const groups = useMemo(() => {
    const map: Record<string, Team[]> = {};
    for (const tm of teams) {
      if (!tm.group) continue;
      (map[tm.group] = map[tm.group] || []).push(tm);
    }
    return Object.entries(map)
      .map(([group, arr]) => ({
        group,
        teams: arr.slice().sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0)),
        avg: arr.reduce((a, x) => a + (x.elo ?? 0), 0) / Math.max(1, arr.length),
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [teams]);

  if (teamsFetch.loading) {
    return (
      <PushScreen title="Ranking de fuerza">
        <Loading />
      </PushScreen>
    );
  }
  if (teamsFetch.error) {
    return (
      <PushScreen title="Ranking de fuerza">
        <ErrorState message={teamsFetch.error} onRetry={teamsFetch.refetch} />
      </PushScreen>
    );
  }
  if (byElo.length === 0) {
    return (
      <PushScreen title="Ranking de fuerza">
        <Empty text="Todavía no hay datos de fuerza." />
      </PushScreen>
    );
  }

  return (
    <PushScreen title="Ranking de fuerza" accent>
      <View style={{ padding: 16, paddingBottom: 6 }}>
        <Segmented
          options={[
            { v: 'selecciones', label: 'Selecciones' },
            { v: 'grupos', label: 'Grupos' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Text style={{ fontSize: 12, color: t.ink3, fontFamily: fonts.text, marginTop: 10, lineHeight: 17 }}>
          Elo del modelo (resultados reales, margen de gol, localía e importancia). Es la fuerza que
          usa el simulador, más predictiva que el ranking FIFA.
        </Text>
      </View>

      {tab === 'selecciones' ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <Card style={{ gap: 12 }}>
            {byElo.map((tm, i) => {
              const eloRank = i + 1;
              const fifaRank = tm.fifa_rank ?? null;
              const diff = fifaRank != null ? fifaRank - eloRank : 0; // >0: el modelo lo sube vs FIFA
              return (
                <View key={tm.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <Text style={{ width: 22, textAlign: 'center', fontFamily: fonts.display, fontSize: 14, color: i < 8 ? t.brandStrong : t.ink3 }}>
                    {eloRank}
                  </Text>
                  <Flag code={tm.code} size={26} ring />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink }}>
                      {tm.name}
                    </Text>
                    {fifaRank != null ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ fontSize: 11, color: t.ink3, fontFamily: fonts.text }}>FIFA #{fifaRank}</Text>
                        {diff !== 0 ? (
                          <Text style={{ fontSize: 10.5, fontFamily: fonts.textBold, color: diff > 0 ? t.brand : t.accent }}>
                            {diff > 0 ? `▲${diff}` : `▼${-diff}`}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: fonts.display, fontSize: 17, color: t.ink }}>{Math.round(tm.elo as number)}</Text>
                </View>
              );
            })}
          </Card>
          <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.text, marginTop: 10, paddingHorizontal: 2 }}>
            ▲/▼ = cuántos puestos lo sube o baja el modelo respecto del ranking FIFA.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <SectionTitle>Grupos por fuerza (Elo promedio)</SectionTitle>
          <View style={{ gap: 10 }}>
            {groups.map((gr, i) => (
              <Card key={gr.group} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: alpha(t.brand, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 15, color: t.brandStrong }}>{gr.group}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.textBold, fontSize: 14, color: t.ink }}>Grupo {gr.group}</Text>
                    <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.text }}>Elo promedio {Math.round(gr.avg)}</Text>
                  </View>
                  {i === 0 ? (
                    <Text style={{ fontFamily: fonts.textBold, fontSize: 10.5, color: t.accent, backgroundColor: alpha(t.accent, 0.12), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }}>
                      Grupo de la muerte
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: fonts.display, fontSize: 13, color: t.ink3 }}>#{i + 1}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {gr.teams.map((tm) => (
                    <View key={tm.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Flag code={tm.code} size={18} ring />
                      <Text style={{ fontSize: 11.5, color: t.ink2, fontFamily: fonts.textSemi }}>{tm.code}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}
    </PushScreen>
  );
}

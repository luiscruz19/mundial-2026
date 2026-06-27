/**
 * Comparador head-to-head (F3). Elegí dos selecciones y compará sus atributos lado a lado:
 * Elo, ranking/puntos FIFA, forma (ataque/defensa), prob. de campeón y ronda esperada.
 * Datos: GET /teams + GET /tournament/projection (ambos ya consumidos). No es predicción de un
 * cruce inventado ni historial H2H (no hay dataset), es comparación de fuerza/forma actual.
 */
import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { PushScreen, Card, SectionTitle, Loading, ErrorState, Flag } from '@/components/ui';
import { useTokens, fonts, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TeamsApi, TournamentApi } from '@/api/endpoints';
import type { Team, TournamentProjection } from '@/types';

export default function ScreenComparar() {
  const { t } = useTokens();
  const teamsFetch = useFetch<Team[]>((s) => TeamsApi.list(s), []);
  const projFetch = useFetch<TournamentProjection>((s) => TournamentApi.projection(s), []);
  const teams = useMemo(
    () => (teamsFetch.data ?? []).slice().sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0)),
    [teamsFetch.data],
  );

  const [aId, setAId] = useState<number | null>(null);
  const [bId, setBId] = useState<number | null>(null);
  const a = teams.find((x) => x.id === aId) ?? teams[0] ?? null;
  const b = teams.find((x) => x.id === bId) ?? teams[1] ?? null;

  const projByCode = useMemo(() => {
    const m: Record<string, { champ: number; round: string }> = {};
    for (const r of projFetch.data?.teams ?? []) m[r.team.code] = { champ: r.prob_champion, round: r.expected_round_label };
    return m;
  }, [projFetch.data]);

  if (teamsFetch.loading) {
    return (
      <PushScreen title="Comparar">
        <Loading />
      </PushScreen>
    );
  }
  if (teamsFetch.error || !a || !b) {
    return (
      <PushScreen title="Comparar">
        <ErrorState message={teamsFetch.error ?? 'No hay selecciones para comparar.'} onRetry={teamsFetch.refetch} />
      </PushScreen>
    );
  }

  const Picker = ({ value, onPick, exclude }: { value: Team; onPick: (id: number) => void; exclude: number }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {teams.filter((tm) => tm.id !== exclude).map((tm) => {
        const active = tm.id === value.id;
        return (
          <Pressable key={tm.id} onPress={() => onPick(tm.id)} style={{ alignItems: 'center', opacity: active ? 1 : 0.55 }}>
            <View style={{ borderWidth: active ? 2 : 0, borderColor: t.brand, borderRadius: 18, padding: active ? 2 : 0 }}>
              <Flag code={tm.code} size={30} round ring />
            </View>
            <Text style={{ fontSize: 9.5, color: active ? t.ink : t.ink3, fontFamily: fonts.textSemi, marginTop: 2 }}>{tm.code}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const pa = projByCode[a.code];
  const pb = projByCode[b.code];
  const rows: { label: string; av: string; bv: string; aBetter: boolean | null }[] = [
    { label: 'Elo (fuerza)', av: a.elo != null ? String(Math.round(a.elo)) : '—', bv: b.elo != null ? String(Math.round(b.elo)) : '—', aBetter: cmp(a.elo, b.elo, 'high') },
    { label: 'Ranking FIFA', av: a.fifa_rank ? `#${a.fifa_rank}` : '—', bv: b.fifa_rank ? `#${b.fifa_rank}` : '—', aBetter: cmp(a.fifa_rank, b.fifa_rank, 'low') },
    { label: 'Forma (ataque)', av: fmt(a.form?.attack), bv: fmt(b.form?.attack), aBetter: cmp(a.form?.attack, b.form?.attack, 'high') },
    { label: 'Forma (defensa)', av: fmt(a.form?.defense), bv: fmt(b.form?.defense), aBetter: cmp(a.form?.defense, b.form?.defense, 'low') },
    { label: 'Forma (neta)', av: fmt(a.form?.rating), bv: fmt(b.form?.rating), aBetter: cmp(a.form?.rating, b.form?.rating, 'high') },
    { label: 'Prob. de campeón', av: pa ? `${(pa.champ * 100).toFixed(1)}%` : '—', bv: pb ? `${(pb.champ * 100).toFixed(1)}%` : '—', aBetter: cmp(pa?.champ, pb?.champ, 'high') },
    { label: 'Llega (promedio)', av: pa?.round ?? '—', bv: pb?.round ?? '—', aBetter: null },
  ];

  return (
    <PushScreen title="Comparar" accent>
      <View style={{ padding: 16, gap: 12 }}>
        {/* cabecera con las dos banderas */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Flag code={a.code} size={48} round ring />
              <Text numberOfLines={1} style={{ fontFamily: fonts.textBold, fontSize: 13.5, color: t.ink, marginTop: 6 }}>{a.name}</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: t.ink3 }}>VS</Text>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Flag code={b.code} size={48} round ring />
              <Text numberOfLines={1} style={{ fontFamily: fonts.textBold, fontSize: 13.5, color: t.ink, marginTop: 6 }}>{b.name}</Text>
            </View>
          </View>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ fontSize: 11, color: t.ink3, fontFamily: fonts.textBold, marginBottom: 2 }}>ELEGÍ EL LOCAL</Text>
          <Picker value={a} onPick={setAId} exclude={b.id} />
          <View style={{ height: 1, backgroundColor: t.line, marginVertical: 4 }} />
          <Text style={{ fontSize: 11, color: t.ink3, fontFamily: fonts.textBold, marginBottom: 2 }}>ELEGÍ EL RIVAL</Text>
          <Picker value={b} onPick={setBId} exclude={a.id} />
        </Card>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle>Comparación</SectionTitle>
        <Card style={{ gap: 0 }}>
          {rows.map((r, i) => (
            <View
              key={r.label}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.line }}
            >
              <Text style={{ width: 64, textAlign: 'left', fontFamily: fonts.display, fontSize: 15, color: r.aBetter === true ? t.brandStrong : t.ink, backgroundColor: r.aBetter === true ? alpha(t.brand, 0.1) : 'transparent', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 7 }}>
                {r.av}
              </Text>
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: t.ink3, fontFamily: fonts.textSemi }}>{r.label}</Text>
              <Text style={{ width: 64, textAlign: 'right', fontFamily: fonts.display, fontSize: 15, color: r.aBetter === false ? t.brandStrong : t.ink, backgroundColor: r.aBetter === false ? alpha(t.brand, 0.1) : 'transparent', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 7 }}>
                {r.bv}
              </Text>
            </View>
          ))}
        </Card>
        <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.text, marginTop: 10, paddingHorizontal: 2, lineHeight: 16 }}>
          Comparación de fuerza y forma actuales, no un pronóstico del cruce. Para simular un partido
          real, entrá desde el fixture.
        </Text>
      </View>
    </PushScreen>
  );
}

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2);
}
function cmp(a: number | null | undefined, b: number | null | undefined, dir: 'high' | 'low'): boolean | null {
  if (a == null || b == null || a === b) return null;
  return dir === 'high' ? a > b : a < b;
}

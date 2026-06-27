/**
 * Selección (ScreenTeam del diseño). Hero con bandera grande, FIFA #rank,
 * grupo/posición, botones Seguir (persiste favorito) / Simular (primer próximo);
 * cards Próximo + Posición; Segmented Plantel (players) / Forma (recent W/D/L).
 * Cableado a Teams.detail(id).
 */
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PushScreen, Card, Pill, Tag, Segmented, Loading, ErrorState, Empty, Icon, Flag } from '@/components/ui';
import { useTokens, fonts, radii, mix } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TeamsApi } from '@/api/endpoints';
import { sideCode } from '@/lib/format';
import { formatKickoff } from '@/lib/datetime';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { TeamDetail } from '@/types';

const POS_LABEL: Record<string, string> = { GK: 'ARQ', DF: 'DEF', MF: 'MED', FW: 'DEL' };

export default function ScreenTeam() {
  const { t } = useTokens();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const tz = useDeviceStore((s) => s.prefs?.timezone ?? 'UTC');
  const isTeamOfInterest = useDeviceStore((s) => s.isTeamOfInterest);
  const toggleTeam = useDeviceStore((s) => s.toggleTeamOfInterest);
  const [tab, setTab] = useState('plantel');

  const fetchState = useFetch<TeamDetail>((signal) => TeamsApi.detail(id ?? '', signal), [id]);
  const d = fetchState.data;

  if (fetchState.loading) {
    return (
      <PushScreen title="Selección">
        <Loading />
      </PushScreen>
    );
  }
  if (fetchState.error || !d) {
    return (
      <PushScreen title="Selección">
        <ErrorState message={fetchState.error ?? 'No se encontró la selección.'} onRetry={fetchState.refetch} />
      </PushScreen>
    );
  }

  const team = d.team;
  const fav = isTeamOfInterest(numericId);
  // Hero SIEMPRE oscuro (no t.ink: en modo oscuro es claro y rompe el texto blanco).
  const heroBase = '#1A1611';
  const heroEnd = mix(heroBase, 78, t.brand);

  // Primer próximo partido (scheduled).
  const nextMatch = d.matches
    .filter((mm) => mm.status === 'scheduled')
    .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc))[0] ?? null;
  // Rival del próximo (el lado que no es este equipo).
  const nextOpponent = nextMatch
    ? nextMatch.home_team?.id === team.id
      ? { team: nextMatch.away_team, ph: nextMatch.away_placeholder }
      : { team: nextMatch.home_team, ph: nextMatch.home_placeholder }
    : null;

  return (
    <PushScreen
      title={team.name}
      shareMessage={`${team.name}${team.rank != null ? ` · FIFA #${team.rank}` : ''} · Mundial 2026 ⚽`}
      hero={
        <LinearGradient
          colors={[heroBase, heroEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Flag code={team.code} size={64} round ring />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: '#fff' }}>{team.name}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {team.rank != null ? (
                  <Text style={{ fontSize: 12, fontFamily: fonts.textBold, color: '#fff', opacity: 0.85 }}>FIFA #{team.rank}</Text>
                ) : null}
                {team.rank != null ? <Text style={{ color: '#fff', opacity: 0.4 }}>·</Text> : null}
                <Text style={{ fontSize: 12, fontFamily: fonts.textBold, color: '#fff', opacity: 0.85 }}>
                  Grupo {team.group}
                  {d.standing ? ` · ${d.standing.position}º` : ''}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={() => toggleTeam(numericId)}
              style={{
                flex: 1,
                borderRadius: radii.pill,
                paddingVertical: 11,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                backgroundColor: fav ? t.surface : 'rgba(255,255,255,0.16)',
              }}
            >
              <Icon name="star" size={16} fill={fav} color={fav ? t.ink : '#fff'} />
              <Text style={{ fontFamily: fonts.textBold, fontSize: 14, color: fav ? t.ink : '#fff' }}>{fav ? 'Siguiendo' : 'Seguir'}</Text>
            </Pressable>
            {nextMatch ? (
              <Pressable
                onPress={() => router.push(`/simular?id=${nextMatch.id}`)}
                style={{
                  borderRadius: radii.pill,
                  paddingVertical: 11,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}
              >
                <Icon name="dice" size={16} color="#fff" />
                <Text style={{ fontFamily: fonts.textBold, fontSize: 14, color: '#fff' }}>Simular</Text>
              </Pressable>
            ) : null}
          </View>
        </LinearGradient>
      }
    >
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card pad={14} style={{ flex: 1 }}>
            <Tag>Próximo</Tag>
            {nextMatch && nextOpponent ? (
              <Pressable onPress={() => router.push(`/match/${nextMatch.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 }}>
                <Flag code={sideCode(nextOpponent.team)} size={28} ring />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.textExtra, fontSize: 15, color: t.ink }} numberOfLines={1}>
                    vs {nextOpponent.team?.code ?? nextOpponent.ph ?? '—'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.text }} numberOfLines={1}>
                    {formatKickoff(nextMatch.kickoff_utc, { timezone: tz })}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Text style={{ marginTop: 9, fontSize: 13, color: t.ink3, fontFamily: fonts.text }}>Sin próximos partidos.</Text>
            )}
          </Card>
          <Card pad={14} style={{ width: 120 }}>
            <Tag>Posición</Tag>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, color: t.brandStrong, marginTop: 6, lineHeight: 32 }}>
              {d.standing ? `${d.standing.position}º` : '—'}
            </Text>
            <Text style={{ fontSize: 11, color: t.ink3, marginTop: 2, fontFamily: fonts.text }}>
              {d.standing ? `${d.standing.points} pts · grupo ${team.group}` : `grupo ${team.group}`}
            </Text>
          </Card>
        </View>

        <View style={{ marginTop: 16, marginBottom: 12 }}>
          <Segmented
            options={[
              { v: 'plantel', label: 'Plantel' },
              { v: 'forma', label: 'Forma' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'plantel' ? (
          d.players.length > 0 ? (
            <Card pad={6}>
              {d.players.map((p, i, arr) => (
                <View
                  key={p.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: t.line }}
                >
                  <Text style={{ width: 26, textAlign: 'center', fontFamily: fonts.display, fontSize: 15, color: t.ink3 }}>{p.shirt_number ?? ''}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink }} numberOfLines={1}>{p.name}</Text>
                    {p.club ? <Text style={{ fontSize: 11.5, color: t.ink3, fontFamily: fonts.text }} numberOfLines={1}>{p.club}</Text> : null}
                  </View>
                  {p.position ? <Pill size="sm">{POS_LABEL[p.position] ?? p.position}</Pill> : null}
                </View>
              ))}
            </Card>
          ) : (
            <Empty text="Plantel todavía no disponible." />
          )
        ) : d.recent.length > 0 ? (
          <Card style={{ gap: 12 }}>
            {d.recent.map((r, i) => {
              const c = r.result === 'W' ? t.brand : r.result === 'D' ? t.ink3 : t.accent;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: mix(c, 18, t.surface), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c, fontFamily: fonts.display, fontSize: 11.5 }}>{r.result}</Text>
                  </View>
                  <Flag code={r.opponent_code} size={24} ring />
                  <Text style={{ flex: 1, fontFamily: fonts.textSemi, fontSize: 14, color: t.ink }} numberOfLines={1}>vs {r.opponent_name}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 15, color: t.ink }}>{r.goals_for}–{r.goals_against}</Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <Empty text="Sin partidos recientes." />
        )}
      </View>
    </PushScreen>
  );
}

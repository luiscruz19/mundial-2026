/**
 * Editar mis selecciones — grilla de banderas para elegir las selecciones de interés.
 * Pantalla dedicada (no el onboarding, que el guard de _layout expulsa si ya se completó).
 * Guarda en teams_of_interest y vuelve atrás.
 */
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PushScreen, Btn, Icon, Flag, Loading, ErrorState } from '@/components/ui';
import { useTokens, fonts } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TeamsApi } from '@/api/endpoints';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { Team } from '@/types';

export default function ScreenSelecciones() {
  const { t } = useTokens();
  const router = useRouter();
  const favs = useDeviceStore((s) => s.prefs?.teams_of_interest ?? []);
  const setTeamsOfInterest = useDeviceStore((s) => s.setTeamsOfInterest);
  const savePreferences = useDeviceStore((s) => s.savePreferences);

  const teams = useFetch<Team[]>((signal) => TeamsApi.list(signal), []);
  const teamList = teams.data ?? [];
  const [picks, setPicks] = useState<number[]>(favs);
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setTeamsOfInterest(picks);
    try {
      await savePreferences();
    } catch {
      // best-effort: quedan cacheadas localmente.
    }
    setSaving(false);
    router.back();
  };

  return (
    <PushScreen title="Mis selecciones">
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 13.5, color: t.ink2, fontFamily: fonts.text, marginBottom: 16, lineHeight: 20 }}>
          Elegí las selecciones que querés seguir. Vamos a priorizar sus partidos y avisarte de sus
          resultados.
        </Text>

        {teams.loading ? (
          <Loading label="Cargando selecciones…" />
        ) : teams.error ? (
          <ErrorState message={teams.error} onRetry={teams.refetch} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {teamList.map((tm) => {
              const on = picks.includes(tm.id);
              return (
                <Pressable key={tm.id} onPress={() => toggle(tm.id)} style={{ width: '25%', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                  <View style={{ borderWidth: 2.5, borderColor: on ? t.brand : 'transparent', borderRadius: 28, padding: 2, opacity: on ? 1 : 0.85 }}>
                    <Flag code={tm.code} size={50} round ring />
                    {on ? (
                      <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.bg }}>
                        <Icon name="check" size={11} stroke={3} color={t.brandInk} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 10.5, fontFamily: fonts.textBold, color: on ? t.ink : t.ink3 }}>{tm.code}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          <Btn full size="lg" icon="check" onPress={save}>
            {saving ? 'Guardando…' : `Guardar (${picks.length})`}
          </Btn>
        </View>
      </View>
    </PushScreen>
  );
}

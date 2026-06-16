/**
 * Onboarding (ScreenOnboarding del diseño) — 3 pasos:
 *  1) Grilla de banderas seleccionables (selecciones de interés) desde Teams.list().
 *  2) Toggles de notificaciones (mapeadas al contrato).
 *  3) Pantalla final con trofeo + banderas elegidas apiladas.
 *
 * picks → teams_of_interest (ids numéricos), toggles → notifications,
 * permiso de push y completeOnboarding al terminar.
 */
import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Toggle, Card, Tag, Icon, Flag, Display, Loading, ErrorState } from '@/components/ui';
import { useTokens, fonts, alpha } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TeamsApi } from '@/api/endpoints';
import { useDeviceStore } from '@/store/useDeviceStore';
import { ensurePushRegistered } from '@/lib/notifications';
import type { NotificationPrefs, Team } from '@/types';

// Filas de notificaciones del diseño mapeadas a claves del contrato.
const NOTIF_ROWS: { key: keyof NotificationPrefsLocal; storeKey: keyof NotificationPrefs; title: string; desc: string }[] = [
  { key: 'goles', storeKey: 'goal', title: 'Goles', desc: 'En partidos de tus selecciones' },
  { key: 'inicio', storeKey: 'match_start', title: 'Inicio del partido', desc: 'Aviso al pitazo inicial' },
  { key: 'resultado', storeKey: 'final_result', title: 'Resultado final', desc: 'Cuando termina el partido' },
  { key: 'recordatorio', storeKey: 'reminder_hour', title: 'Recordatorio', desc: 'Una hora antes del partido' },
];

interface NotificationPrefsLocal {
  goles: boolean;
  inicio: boolean;
  resultado: boolean;
  recordatorio: boolean;
}

export default function ScreenOnboarding() {
  const { t } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [notif, setNotif] = useState<NotificationPrefsLocal>({ goles: true, inicio: true, resultado: true, recordatorio: true });

  const teams = useFetch<Team[]>((signal) => TeamsApi.list(signal), []);
  const teamList = teams.data ?? [];
  const byId = new Map(teamList.map((tm) => [tm.id, tm]));

  const setTeamsOfInterest = useDeviceStore((s) => s.setTeamsOfInterest);
  const setNotificationPref = useDeviceStore((s) => s.setNotificationPref);
  const savePreferences = useDeviceStore((s) => s.savePreferences);
  const completeOnboarding = useDeviceStore((s) => s.completeOnboarding);
  const existingFavs = useDeviceStore((s) => s.prefs?.teams_of_interest);

  // Precargar favoritos existentes la primera vez que llegan los equipos.
  if (picks.length === 0 && existingFavs && existingFavs.length > 0 && teamList.length > 0) {
    setPicks(existingFavs.filter((fid) => byId.has(fid)));
  }

  const toggle = (id: number) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = async () => {
    setTeamsOfInterest(picks);
    NOTIF_ROWS.forEach((r) => setNotificationPref(r.storeKey, notif[r.key]));
    try {
      await savePreferences();
    } catch {
      // best-effort: las prefs quedan cacheadas localmente.
    }
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const next = async () => {
    if (step === 1) await ensurePushRegistered();
    if (step < 2) setStep(step + 1);
    else await finish();
  };

  const titles = ['Elegí tus selecciones', '¿Qué querés que te avise?', '¡Todo listo!'];
  const tags = ['01 · INTERESES', '02 · NOTIFICACIONES', '03 · LISTO'];
  const subs = [
    'Vamos a priorizar sus partidos y resultados.',
    'Podés cambiarlo cuando quieras desde Ajustes.',
    `Vas a seguir ${picks.length} selección${picks.length === 1 ? '' : 'es'}. Que ruede la pelota.`,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 36, paddingHorizontal: 20, paddingBottom: 16 }}>
        {/* progreso */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 26 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i <= step ? t.brand : t.surface2 }} />
          ))}
        </View>
        <Tag color={t.brandStrong}>{tags[step]}</Tag>
        <Display style={{ marginTop: 8, marginBottom: 6, fontSize: 28, color: t.ink, lineHeight: 30 }}>{titles[step]}</Display>
        <Text style={{ marginBottom: 24, fontSize: 14.5, color: t.ink2, lineHeight: 21, fontFamily: fonts.text }}>{subs[step]}</Text>

        {step === 0 ? (
          teams.loading ? (
            <Loading label="Cargando selecciones…" />
          ) : teams.error ? (
            <ErrorState message={teams.error} onRetry={teams.refetch} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {teamList.map((tm) => {
                const on = picks.includes(tm.id);
                return (
                  <Pressable key={tm.id} onPress={() => toggle(tm.id)} style={{ width: '25%', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
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
          )
        ) : null}

        {step === 1 ? (
          <Card pad={6}>
            {NOTIF_ROWS.map((r, i, arr) => (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink }}>{r.title}</Text>
                  <Text style={{ fontSize: 12, color: t.ink3, fontFamily: fonts.text }}>{r.desc}</Text>
                </View>
                <Toggle on={notif[r.key]} onChange={(v) => setNotif((n) => ({ ...n, [r.key]: v }))} />
              </View>
            ))}
          </Card>
        ) : null}

        {step === 2 ? (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: alpha(t.gold, 0.22), alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Icon name="trophy" size={48} color={t.goldInk} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {picks.slice(0, 6).map((pid, i) => {
                const tm = byId.get(pid);
                if (!tm) return null;
                return (
                  <View key={pid} style={{ marginLeft: i ? -10 : 0 }}>
                    <Flag code={tm.code} size={34} round ring />
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* navegación */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 20,
          borderTopWidth: 1,
          borderTopColor: t.line,
          backgroundColor: t.surface,
        }}
      >
        {step > 0 ? <Btn variant="ghost" onPress={() => setStep(step - 1)}>Atrás</Btn> : null}
        <View style={{ flex: 1 }}>
          <Btn full size="lg" onPress={next} icon={step === 2 ? 'check' : undefined}>
            {step === 2 ? 'Empezar' : 'Siguiente'}
          </Btn>
        </View>
      </View>
    </View>
  );
}

/**
 * Ajustes (ScreenAjustes del diseño). Card "Mis selecciones" (banderas reales
 * de teams_of_interest + Editar→onboarding) y toggles de notificaciones que
 * persisten en el backend (vía store.savePreferences). Solo se muestran los
 * toggles con respaldo en el contrato (NotificationPrefs).
 */
import { type ReactNode, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { TabScreen, Card, Btn, Toggle, Flag } from '@/components/ui';
import { useTokens, fonts } from '@/theme/tokens';
import { useFetch } from '@/lib/useFetch';
import { TeamsApi } from '@/api/endpoints';
import { ensurePushRegistered } from '@/lib/notifications';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { NotificationPrefs, Team } from '@/types';

export default function ScreenAjustes() {
  const { t } = useTokens();
  const router = useRouter();
  const prefs = useDeviceStore((s) => s.prefs);
  const setNotificationPref = useDeviceStore((s) => s.setNotificationPref);
  const savePreferences = useDeviceStore((s) => s.savePreferences);

  const teams = useFetch<Team[]>((signal) => TeamsApi.list(signal), []);
  const byId = new Map((teams.data ?? []).map((tm) => [tm.id, tm]));

  const pushToken = useDeviceStore((s) => s.pushToken);
  const [pushBusy, setPushBusy] = useState(false);

  const notif = prefs?.notifications;
  const setStore = (k: keyof NotificationPrefs, v: boolean) => {
    setNotificationPref(k, v);
    void savePreferences();
  };

  const onActivatePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const res = await ensurePushRegistered();
      if (res.token) {
        Alert.alert('Notificaciones activadas', `Token registrado correctamente:\n\n${res.token.slice(0, 32)}…`);
      } else {
        Alert.alert('No se pudo activar', res.error ?? 'Error desconocido');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setPushBusy(false);
    }
  };

  const favs = prefs?.teams_of_interest ?? [];
  const favTeams = favs.map((id) => byId.get(id)).filter((tm): tm is Team => !!tm);
  const stack = favTeams.slice(0, 4);

  const Group = ({ header, children }: { header: string; children: ReactNode }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 11.5, letterSpacing: 0.7, color: t.ink3, textTransform: 'uppercase', marginHorizontal: 4, marginBottom: 8 }}>
        {header}
      </Text>
      <Card pad={6}>{children}</Card>
    </View>
  );
  const Row = ({ title, desc, on, onChange, last }: { title: string; desc?: string; on: boolean; onChange: (v: boolean) => void; last?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.textSemi, fontSize: 14.5, color: t.ink }}>{title}</Text>
        {desc ? <Text style={{ fontSize: 12, color: t.ink3, fontFamily: fonts.text }}>{desc}</Text> : null}
      </View>
      <Toggle on={on} onChange={onChange} />
    </View>
  );

  return (
    <TabScreen title="Ajustes" subtitle="Notificaciones y preferencias">
      <View style={{ paddingHorizontal: 16 }}>
        {/* Mis selecciones */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 }}>
          {stack.length > 0 ? (
            <View style={{ flexDirection: 'row' }}>
              {stack.map((tm, i) => (
                <View key={tm.id} style={{ marginLeft: i ? -10 : 0 }}>
                  <Flag code={tm.code} size={32} round ring />
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.textBold, fontSize: 14.5, color: t.ink }}>Mis selecciones</Text>
            <Text style={{ fontSize: 12.5, color: t.ink3, fontFamily: fonts.text }}>
              {favs.length === 0
                ? 'Todavía no seguís ninguna'
                : `Seguís ${favs.length} ${favs.length === 1 ? 'equipo' : 'equipos'}`}
            </Text>
          </View>
          <Btn variant="ghost" size="sm" onPress={() => router.push('/onboarding')}>Editar</Btn>
        </Card>

        <Group header="Partidos">
          <Row title="Inicio del partido" desc="Aviso al pitazo inicial" on={notif?.match_start ?? true} onChange={(v) => setStore('match_start', v)} />
          <Row title="Goles" desc="Cada gol, al instante" on={notif?.goal ?? true} onChange={(v) => setStore('goal', v)} />
          <Row title="Resultado final" desc="Cuando termina el partido" on={notif?.final_result ?? true} onChange={(v) => setStore('final_result', v)} last />
        </Group>

        <Group header="Recordatorios">
          <Row title="Un día antes" desc="Recordatorio el día previo" on={notif?.reminder_day ?? true} onChange={(v) => setStore('reminder_day', v)} />
          <Row title="Una hora antes" desc="Recordatorio antes del pitazo" on={notif?.reminder_hour ?? true} onChange={(v) => setStore('reminder_hour', v)} last />
        </Group>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 11.5, letterSpacing: 0.7, color: t.ink3, textTransform: 'uppercase', marginHorizontal: 4, marginBottom: 8 }}>
            Notificaciones push
          </Text>
          <Card pad={14} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: pushToken ? t.brand : t.accent }} />
              <Text style={{ fontFamily: fonts.textSemi, fontSize: 14, color: t.ink }}>
                {pushToken ? 'Activadas en este dispositivo' : 'No activadas en este dispositivo'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: t.ink3, fontFamily: fonts.text, lineHeight: 18 }}>
              {pushToken
                ? 'Tu dispositivo está registrado para recibir avisos de goles, inicio y resultado.'
                : 'Tocá el botón para pedir permiso y registrar este dispositivo.'}
            </Text>
            <Btn variant={pushToken ? 'ghost' : 'primary'} size="sm" icon="bell" onPress={onActivatePush} full>
              {pushBusy ? 'Activando…' : pushToken ? 'Reintentar registro' : 'Activar notificaciones'}
            </Btn>
          </Card>
        </View>

        <Text style={{ paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8, fontSize: 12, color: t.ink3, fontFamily: fonts.text, lineHeight: 18 }}>
          Las simulaciones y probabilidades son estimaciones de un modelo. No representan pronósticos oficiales.
        </Text>
      </View>
    </TabScreen>
  );
}

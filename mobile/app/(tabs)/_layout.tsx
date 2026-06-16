/**
 * Layout de las 5 tabs del diseño Estadio: Hoy, Grupos, Llave, Proyección,
 * Ajustes. Usa una barra inferior propia con los íconos SVG del kit.
 */
import { Tabs } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { useTokens, fonts } from '@/theme/tokens';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Hoy', icon: 'calendar' },
  { name: 'grupos', label: 'Grupos', icon: 'pitch' },
  { name: 'llave', label: 'Llave', icon: 'trophy' },
  { name: 'proyeccion', label: 'Proyección', icon: 'chart' },
  { name: 'ajustes', label: 'Ajustes', icon: 'bell' },
];

export default function TabsLayout() {
  const { t } = useTokens();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'flex-start',
            paddingTop: 9,
            paddingHorizontal: 6,
            paddingBottom: insets.bottom + 8,
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.line,
          }}
        >
          {state.routes.map((route, i) => {
            const tab = TABS.find((x) => x.name === route.name);
            if (!tab) return null;
            const on = state.index === i;
            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!on && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 }}
              >
                <Icon name={tab.icon} size={23} stroke={on ? 2.4 : 2} color={on ? t.brandStrong : t.ink3} />
                <Text style={{ fontSize: 10.5, fontFamily: on ? fonts.textExtra : fonts.textSemi, color: on ? t.brandStrong : t.ink3 }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="grupos" />
      <Tabs.Screen name="llave" />
      <Tabs.Screen name="proyeccion" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}

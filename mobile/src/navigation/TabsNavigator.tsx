/**
 * BottomTabs del diseño Estadio: Hoy, Grupos, Llave, Proyección, Ajustes.
 * Usa una barra inferior propia con los íconos SVG del kit (igual que el
 * layout de tabs original de expo-router).
 */
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from '@/components/ui';
import { useTokens, fonts } from '@/theme/tokens';
import type { TabsParamList } from '@/navigation/types';
import ScreenHome from '@/screens/HomeScreen';
import ScreenGrupos from '@/screens/GruposScreen';
import ScreenBracket from '@/screens/LlaveScreen';
import ScreenProyeccion from '@/screens/ProyeccionScreen';
import ScreenAjustes from '@/screens/AjustesScreen';

const Tab = createBottomTabNavigator<TabsParamList>();

const TABS: { name: keyof TabsParamList; label: string; icon: IconName }[] = [
  { name: 'Hoy', label: 'Hoy', icon: 'calendar' },
  { name: 'Grupos', label: 'Grupos', icon: 'pitch' },
  { name: 'Llave', label: 'Llave', icon: 'trophy' },
  { name: 'Proyeccion', label: 'Proyección', icon: 'chart' },
  { name: 'Ajustes', label: 'Ajustes', icon: 'bell' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTokens();
  const insets = useSafeAreaInsets();
  return (
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
  );
}

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Hoy" component={ScreenHome} />
      <Tab.Screen name="Grupos" component={ScreenGrupos} />
      <Tab.Screen name="Llave" component={ScreenBracket} />
      <Tab.Screen name="Proyeccion" component={ScreenProyeccion} />
      <Tab.Screen name="Ajustes" component={ScreenAjustes} />
    </Tab.Navigator>
  );
}

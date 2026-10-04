import React from 'react';
import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useStore } from '../../state/Store';
import { colors, palettes } from '../../design/tokens';
import { Icon, tap } from '../../components/ui';

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app } = useStore();
  const p = palettes[app.hue];
  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 22),
        width: 216,
        alignSelf: 'center',
      }}
    >
      <LinearGradient
        colors={['#21160FF0', '#100B08F5']}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 64,
          borderRadius: 99,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: '#FFFFFF10',
        }}
      >
        {state.routes.map((r, i) => {
          const active = state.index === i;
          const name = r.name === 'index' ? 'home' : r.name === 'social' ? 'social' : 'profile';
          return (
            <Pressable
              key={r.key}
              accessibilityRole="tab"
              accessibilityLabel={name}
              accessibilityState={{ selected: active }}
              onPress={() => {
                tap();
                const event = navigation.emit({
                  type: 'tabPress',
                  target: r.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) navigation.navigate(r.name);
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <LinearGradient
                colors={active ? [p.body + '22', p.mid + '09'] : ['#FFFFFF03', '#FFFFFF01']}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: active ? p.body + '45' : '#FFFFFF12',
                }}
              >
                <Icon
                  name={i === 0 ? 'wind' : i === 1 ? 'users' : 'user'}
                  size={17}
                  color={active ? p.body : colors.muted}
                />
              </LinearGradient>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

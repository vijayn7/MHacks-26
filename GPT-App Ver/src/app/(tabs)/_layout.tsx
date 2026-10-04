import { blendPalette } from '../../design/blend';
import { useCompanion } from '../../state/Companion';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useStore } from '../../state/Store';
import { colors, palettes } from '../../design/tokens';
import { Icon, tap } from '../../components/ui';

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app } = useStore();
  const { level } = useCompanion();
  const p = level === 'Out' ? palettes.Ash : blendPalette(app.hue, app.blendHue, app.blend);
  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 22),
        width: 272,
        alignSelf: 'center',
      }}
    >
      <LinearGradient
        colors={[p.wash + 'F0', '#100B08F5']}
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
          const name = r.name === 'index' ? 'home' : r.name;
          const icon =
            r.name === 'index'
              ? 'wind'
              : r.name === 'social'
                ? 'users'
                : r.name === 'archive'
                  ? 'bookmark'
                  : 'user';
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
                <Icon name={icon} size={17} color={active ? p.body : colors.muted} />
              </LinearGradient>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}
export default function TabLayout() {
  const { state: settings } = useStore();
  if (!settings.onboardingComplete) return <Redirect href="/onboarding" />;
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
      <Tabs.Screen name="archive" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

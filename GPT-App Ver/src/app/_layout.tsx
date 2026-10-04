import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { RobotoMono_400Regular } from '@expo-google-fonts/roboto-mono/400Regular';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../state/Store';
import { colors, palettes } from '../design/tokens';
import { NudgeSheet } from '../components/Nudge';
import { CompanionProvider } from '../state/Companion';
import { NotificationBridge } from '../components/NotificationBridge';

function Navigation() {
  const { ready, state } = useStore();
  const [fontsLoaded, fontError] = useFonts({
    Neco: require('../../assets/fonts/Neco-Regular.otf'),
    NecoItalic: require('../../assets/fonts/Neco-Italic.otf'),
    Satoshi: require('../../assets/fonts/Satoshi-Regular.otf'),
    SatoshiMedium: require('../../assets/fonts/Satoshi-Medium.otf'),
    RobotoMono_400Regular,
  });
  if (!ready || (!fontsLoaded && !fontError))
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={palettes.Ember.body} />
      </View>
    );
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
      {state.onboardingComplete && (
        <>
          <NotificationBridge />
          <NudgeSheet />
        </>
      )}
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: Platform.OS === 'web' ? 480 : undefined,
            overflow: 'hidden',
          }}
        >
          <StoreProvider>
            <CompanionProvider>
              <Navigation />
            </CompanionProvider>
          </StoreProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useStore } from '../state/Store';
import { palettes } from '../design/tokens';
import { T, Icon, Sheet } from './ui';
import { SoftPressable } from './SoftPressable';

export function ExtensionScore() {
  const { state, dispatch } = useStore();
  const focused = useIsFocused();
  const [info, setInfo] = useState(false);
  const [status, setStatus] = useState<'loading' | 'connected' | 'offline'>('loading');
  useEffect(() => {
    if (!focused || !state.onboardingComplete) return;
    let active = true;
    let controller: AbortController | null = null;
    const sync = async () => {
      if (controller || (AppState.currentState && AppState.currentState !== 'active')) return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        const base =
          process.env.EXPO_PUBLIC_EXTENSION_API_URL ||
          process.env.EXPO_PUBLIC_API_URL ||
          'http://localhost:8787';
        const response = await fetch(`${base}/score`, { signal: controller.signal });
        if (!response.ok) throw new Error('score unavailable');
        const body = await response.json();
        if (
          !Array.isArray(body.optOutIds) ||
          !body.optOutIds.every(
            (id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 200,
          )
        )
          throw new Error('invalid score');
        if (active) {
          dispatch({ type: 'SYNC_EXTENSION_SCORE', ids: body.optOutIds });
          setStatus('connected');
        }
      } catch {
        if (active) setStatus('offline');
      } finally {
        clearTimeout(timeout);
        controller = null;
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 10000);
    const subscription = AppState.addEventListener('change', (value) => {
      if (value === 'active') void sync();
      else controller?.abort();
    });
    return () => {
      active = false;
      clearInterval(timer);
      controller?.abort();
      subscription.remove();
    };
  }, [focused, state.onboardingComplete, dispatch]);
  return (
    <View
      testID="extension-score"
      style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}
    >
      <T variant="title" color={palettes[state.hue].body} style={{ fontSize: 68, lineHeight: 76 }}>
        {state.extensionOptOutIds.length * 10}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 34 }}>
        <T variant="small">snuff score</T>
        <SoftPressable
          accessibilityRole="button"
          accessibilityLabel="about snuff score"
          onPress={() => setInfo(true)}
          style={{ width: 44, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="info" size={14} color={palettes[state.hue].body} />
        </SoftPressable>
      </View>
      <Sheet visible={info} title="your snuff score." onClose={() => setInfo(false)}>
        <T>
          a reflection of your progress: money saved, urges resisted, and consistent choices across
          your phone and browser.
        </T>
        <T variant="small" style={{ marginTop: 14 }}>
          designed to reward steady habits, not bigger price tags. balanced weighting keeps the
          leaderboard fair, so expensive purchases alone won’t put you ahead.
        </T>
        <T variant="small" style={{ marginTop: 14 }}>
          {status === 'connected'
            ? 'your score is up to date.'
            : status === 'loading'
              ? 'syncing your score…'
              : 'showing your last synced score.'}
        </T>
      </Sheet>
    </View>
  );
}

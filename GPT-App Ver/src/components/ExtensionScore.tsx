import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useStore } from '../state/Store';
import { palettes } from '../design/tokens';
import { T } from './ui';

export function ExtensionScore() {
  const { state, dispatch } = useStore();
  const focused = useIsFocused();
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
        const base = process.env.EXPO_PUBLIC_EXTENSION_API_URL || 'http://localhost:8787';
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
    <View testID="extension-score" style={{ alignItems: 'center', paddingVertical: 10, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T
          variant="title"
          color={palettes[state.hue].body}
          style={{ fontSize: 30, lineHeight: 36 }}
        >
          {state.extensionOptOutIds.length * 10}
        </T>
        <T variant="small">snuff score</T>
      </View>
      <T variant="small" style={{ fontSize: 10 }}>
        +10 for each purchase you opt out of in chrome
      </T>
      {status !== 'connected' && (
        <T variant="small" style={{ fontSize: 10 }}>
          {status === 'loading' ? 'syncing with chrome…' : 'extension offline · score saved'}
        </T>
      )}
    </View>
  );
}

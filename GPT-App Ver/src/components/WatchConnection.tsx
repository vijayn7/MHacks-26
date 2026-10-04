import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useStore } from '../state/Store';
import { Mascot } from './Mascot';
import { Icon, QuietButton, T } from './ui';
import { useQuietMotion } from './WearableVisuals';

export function WatchConnection() {
  const { state, dispatch } = useStore();
  const [phase, setPhase] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pulse = useQuietMotion(60000 / 72, phase >= 0);
  useEffect(() => () => clearInterval(timer.current), []);
  const connect = () => {
    setPhase(0);
    let next = 0;
    timer.current = setInterval(() => {
      next++;
      if (next === 3) {
        clearInterval(timer.current);
        dispatch({
          type: 'WEARABLE',
          settings: {
            status: 'connected',
            enabled: true,
            baseline: 68,
            reading: { bpm: 82, at: Date.now() },
          },
        });
        setPhase(-1);
      } else setPhase(next);
    }, 900);
  };
  const connected = state.wearable.status === 'connected';
  return (
    <View>
      <Animated.View
        style={{
          alignItems: 'center',
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
          ],
        }}
      >
        <Mascot hue={state.hue} size={150} />
      </Animated.View>
      <View style={{ alignItems: 'center', marginVertical: 14 }}>
        <Icon name="watch" size={20} />
        <T variant="title" style={{ fontSize: 28, marginTop: 10 }}>
          {phase >= 0
            ? ['finding your watch.', 'checking access.', 'finding your baseline.'][phase]
            : connected
              ? 'a little more in tune.'
              : 'a pulse, a pause.'}
        </T>
        <T variant="small" style={{ textAlign: 'center', marginTop: 8 }}>
          {phase >= 0
            ? 'simulated sync'
            : connected
              ? 'demo watch · baseline 68 bpm'
              : 'optional apple watch demo'}
        </T>
      </View>
      <T variant="small" style={{ textAlign: 'center', fontSize: 11 }}>
        {state.wearable.status === 'denied'
          ? 'access denied in demo. you can still check in.'
          : state.wearable.status === 'unavailable'
            ? 'watch unavailable. check in without a reading.'
            : 'sample readings only. no apple health access.'}
      </T>
      <QuietButton disabled={phase >= 0} onPress={connect}>
        {phase >= 0 ? 'syncing…' : connected ? 'sync demo readings' : 'connect demo watch'}
      </QuietButton>
    </View>
  );
}

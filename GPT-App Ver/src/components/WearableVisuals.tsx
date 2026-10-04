import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useIsFocused } from 'expo-router';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';
import { colors, palettes } from '../design/tokens';
import { feelings, type Feeling } from '../state/wearable';
import { T } from './ui';

const hues: Record<Feeling, string> = {
  calm: '#83BDDC',
  excited: '#FFD078',
  anxious: '#EC729E',
  bored: '#BBA0E0',
  unsure: '#DB91BB',
};
export function useQuietMotion(duration: number, enabled = true) {
  const [value] = useState(() => new Animated.Value(0));
  const [reduce, setReduce] = useState(true);
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (reduce || !enabled || !focused || !foreground) {
      value.setValue(0);
      return;
    }
    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: duration * 0.42,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: duration * 0.58,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    );
    motion.start();
    return () => motion.stop();
  }, [duration, enabled, reduce, value, focused, foreground]);
  return value;
}
export function FeelingOrb({
  selected,
  intensity = 50,
  size = 220,
  onIntensity,
}: {
  selected: Feeling[];
  intensity?: number;
  size?: number;
  onIntensity?: (v: number) => void;
}) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const drift = useQuietMotion(14000);
  const blend = selected.length ? selected.map((f) => hues[f]) : ['#9C9AAB', '#746B77', '#C5B4A4'];
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onIntensity,
        onMoveShouldSetPanResponder: () => !!onIntensity,
        onPanResponderGrant: (e) =>
          onIntensity?.(
            Math.round(Math.max(0, Math.min(100, (e.nativeEvent.locationX / size) * 100))),
          ),
        onPanResponderMove: (e) =>
          onIntensity?.(
            Math.round(Math.max(0, Math.min(100, (e.nativeEvent.locationX / size) * 100))),
          ),
      }),
    [onIntensity, size],
  );
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole={onIntensity ? 'adjustable' : 'image'}
      accessibilityLabel={
        selected.length ? `feeling blend: ${selected.join(', ')}` : 'no feelings selected'
      }
      accessibilityValue={{ min: 0, max: 100, now: intensity }}
      accessibilityActions={onIntensity ? [{ name: 'increment' }, { name: 'decrement' }] : []}
      onAccessibilityAction={(e) =>
        onIntensity?.(
          Math.max(
            0,
            Math.min(100, intensity + (e.nativeEvent.actionName === 'increment' ? 10 : -10)),
          ),
        )
      }
      style={{ width: size, height: size }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          transform: [
            { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] }) },
            { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
          ],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Defs>
            <ClipPath id={'clip' + id}>
              <Circle cx="120" cy="120" r="105" />
            </ClipPath>
            {blend.map((c, i) => (
              <RadialGradient key={i} id={`orb${id}${i}`}>
                <Stop offset="0" stopColor={c} stopOpacity=".95" />
                <Stop offset=".5" stopColor={c} stopOpacity=".65" />
                <Stop offset="1" stopColor={c} stopOpacity="0" />
              </RadialGradient>
            ))}
            <RadialGradient id={'pearl' + id}>
              <Stop offset="0" stopColor="#FFF3E5" stopOpacity=".85" />
              <Stop offset="1" stopColor="#FFF3E5" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="120" cy="120" r="119" fill={`url(#orb${id}0)`} opacity=".18" />
          <G clipPath={`url(#clip${id})`}>
            <Circle cx="120" cy="120" r="105" fill="#403242" />
            {[0, 1, 2, 3, 4].map((n) => (
              <Ellipse
                key={n}
                cx={[64, 176, 98, 163, 62][n] + (intensity - 50) * 0.32}
                cy={[65, 92, 181, 177, 138][n]}
                rx={100 + intensity * 0.25}
                ry="111"
                fill={`url(#orb${id}${n % blend.length})`}
              />
            ))}
            <Ellipse
              cx={88 + (intensity - 50) * 0.45}
              cy="96"
              rx="70"
              ry="106"
              fill={`url(#pearl${id})`}
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
export function FeelingChoices({
  value,
  onChange,
}: {
  value: Feeling[];
  onChange: (v: Feeling[]) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {feelings.map((f) => (
        <Pressable
          key={f}
          accessibilityRole="checkbox"
          accessibilityLabel={f}
          accessibilityState={{ checked: value.includes(f) }}
          aria-checked={value.includes(f)}
          onPress={() => onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f])}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: value.includes(f) ? hues[f] + '88' : colors.border,
            backgroundColor: value.includes(f) ? hues[f] + '15' : 'transparent',
          }}
        >
          <T variant="small" color={value.includes(f) ? hues[f] : colors.secondary}>
            {f}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
export function HeartScale({ bpm, baseline }: { bpm: number | null; baseline: number | null }) {
  const glowId = useId().replace(/[^a-z0-9]/gi, '');
  const [width, setWidth] = useState(200);
  const [position] = useState(() => new Animated.Value(0.5));
  const pulse = useQuietMotion(bpm ? 60000 / bpm : 2000, !!bpm);
  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: bpm ? Math.max(0, Math.min(1, (bpm - 45) / 90)) : 0.5,
      duration: 450,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [bpm, position]);
  return (
    <View style={{ marginVertical: 14 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <T variant="title" style={{ fontSize: 25 }}>
          {bpm ? `${bpm} bpm` : 'no recent reading'}
        </T>
        <T variant="small">
          {bpm && baseline
            ? `${bpm - baseline >= 0 ? '+' : ''}${bpm - baseline} from baseline`
            : 'check in without it'}
        </T>
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 38, justifyContent: 'center' }}
      >
        <View style={{ height: 2, backgroundColor: colors.border, borderRadius: 2 }} />
        <Animated.View
          style={{
            position: 'absolute',
            left: position.interpolate({ inputRange: [0, 1], outputRange: [0, width - 24] }),
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              width: 30,
              height: 30,
              borderRadius: 15,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) },
              ],
            }}
          >
            <Svg width={30} height={30}>
              <Defs>
                <RadialGradient id={'heart' + glowId}>
                  <Stop offset="0" stopColor={palettes.Ember.core} stopOpacity=".65" />
                  <Stop offset=".35" stopColor={palettes.Ember.body} stopOpacity=".25" />
                  <Stop offset="1" stopColor={palettes.Ember.body} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="15" cy="15" r="15" fill={`url(#heart${glowId})`} />
            </Svg>
          </Animated.View>
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: bpm ? palettes.Ember.core : colors.muted,
            }}
          />
        </Animated.View>
      </View>
      <T variant="small" style={{ fontSize: 10 }}>
        {baseline ? `baseline ${baseline} bpm` : 'no health data connected'}
      </T>
    </View>
  );
}

export function FeelingAura({ selected }: { selected: Feeling[] }) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  return (
    <Svg width={210} height={200} viewBox="0 0 210 200">
      <Defs>
        <RadialGradient id={'aura' + id}>
          <Stop offset="0" stopColor={hues[selected[0] || 'calm']} stopOpacity=".24" />
          <Stop
            offset=".45"
            stopColor={hues[selected[1] || selected[0] || 'calm']}
            stopOpacity=".12"
          />
          <Stop offset="1" stopColor={hues[selected[0] || 'calm']} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="105" cy="100" rx="105" ry="100" fill={`url(#aura${id})`} />
    </Svg>
  );
}

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';

type Orb = {
  color: string;
  size: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  duration: number;
  opacity: number;
};

const ORBS: Orb[] = [
  { color: '#FF7A1A', size: 0.98, x: 0.1, y: 0.16, dx: 0.12, dy: 0.09, duration: 28000, opacity: 0.62 },
  { color: '#F5A524', size: 0.84, x: 0.78, y: 0.24, dx: -0.11, dy: 0.12, duration: 34000, opacity: 0.5 },
  { color: '#FF9A4A', size: 0.74, x: 0.4, y: 0.58, dx: 0.1, dy: -0.1, duration: 30000, opacity: 0.46 },
  { color: '#C2410C', size: 1.1, x: 0.82, y: 0.8, dx: -0.09, dy: -0.08, duration: 38000, opacity: 0.58 },
  { color: '#FFD066', size: 0.58, x: 0.26, y: 0.74, dx: 0.08, dy: -0.09, duration: 25000, opacity: 0.28 },
  { color: '#EA580C', size: 0.66, x: 0.55, y: 0.12, dx: -0.08, dy: 0.11, duration: 31000, opacity: 0.4 },
];

function MeshOrb({
  orb,
  width,
  height,
  reduce,
  index,
}: {
  orb: Orb;
  width: number;
  height: number;
  reduce: boolean;
  index: number;
}) {
  const size = Math.max(width, height) * orb.size;
  const [tx] = useState(() => new Animated.Value(0));
  const [ty] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      tx.setValue(0);
      ty.setValue(0);
      return;
    }
    const xLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tx, {
          toValue: 1,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(tx, {
          toValue: 0,
          duration: orb.duration * 1.05,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    const yLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ty, {
          toValue: 1,
          duration: orb.duration * 1.18,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(ty, {
          toValue: 0,
          duration: orb.duration * 0.92,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    // Stagger start so orbs don't pulse in lockstep.
    const delay = index * 900;
    const timer = setTimeout(() => {
      xLoop.start();
      yLoop.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      xLoop.stop();
      yLoop.stop();
    };
  }, [reduce, orb.duration, tx, ty, index]);

  const left = orb.x * width - size / 2;
  const top = orb.y * height - size / 2;
  const gradId = `mesh-orb-${index}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        opacity: orb.opacity,
        transform: [
          {
            translateX: tx.interpolate({
              inputRange: [0, 1],
              outputRange: [0, orb.dx * width],
            }),
          },
          {
            translateY: ty.interpolate({
              inputRange: [0, 1],
              outputRange: [0, orb.dy * height],
            }),
          },
        ],
        ...(Platform.OS === 'web'
          ? ({ filter: 'blur(28px)' } as object)
          : null),
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={orb.color} stopOpacity="1" />
            <Stop offset="55%" stopColor={orb.color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={orb.color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

/** Calm orange mesh wash for onboarding — slow drift, low contrast, reduce-motion aware. */
export function OrangeMeshBackground() {
  const { width, height } = useWindowDimensions();
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A0802' }]} />
      <LinearGradient
        colors={['#4A1806', '#2A0C03', '#120501']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {ORBS.map((orb, index) => (
        <MeshOrb
          key={index}
          orb={orb}
          width={width}
          height={height}
          reduce={reduce}
          index={index}
        />
      ))}
      {/* Soft veil so type stays readable without flattening the mesh. */}
      <LinearGradient
        colors={['#00000022', '#00000044', '#00000088']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

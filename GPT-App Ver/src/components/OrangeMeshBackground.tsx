import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

type Ribbon = {
  color: string;
  /** Relative to max(width,height) */
  w: number;
  h: number;
  /** Anchor as 0–1 of viewport */
  x: number;
  y: number;
  /** Base diagonal tilt in degrees */
  rot: number;
  /** Peak opacity of this ribbon */
  opacity: number;
  /** Motion frequencies / amplitudes */
  speed: number;
  ampX: number;
  ampY: number;
  ampRot: number;
  ampScale: number;
  phase: number;
};

/** Soft diagonal ember streaks — low opacity, liquid warp (ref: motion-blur fire wash). */
const RIBBONS: Ribbon[] = [
  {
    color: '#FF8A2B',
    w: 1.35,
    h: 0.42,
    x: 0.22,
    y: 0.7,
    rot: -38,
    opacity: 0.22,
    speed: 0.11,
    ampX: 0.08,
    ampY: 0.06,
    ampRot: 7,
    ampScale: 0.08,
    phase: 0.2,
  },
  {
    color: '#F59E0B',
    w: 1.2,
    h: 0.36,
    x: 0.62,
    y: 0.42,
    rot: -34,
    opacity: 0.18,
    speed: 0.09,
    ampX: 0.1,
    ampY: 0.07,
    ampRot: 9,
    ampScale: 0.1,
    phase: 1.4,
  },
  {
    color: '#FB923C',
    w: 1.1,
    h: 0.32,
    x: 0.4,
    y: 0.28,
    rot: -42,
    opacity: 0.16,
    speed: 0.13,
    ampX: 0.07,
    ampY: 0.09,
    ampRot: 6,
    ampScale: 0.07,
    phase: 2.6,
  },
  {
    color: '#EA580C',
    w: 1.45,
    h: 0.5,
    x: 0.78,
    y: 0.78,
    rot: -30,
    opacity: 0.2,
    speed: 0.08,
    ampX: 0.06,
    ampY: 0.05,
    ampRot: 5,
    ampScale: 0.06,
    phase: 3.8,
  },
  {
    color: '#FDBA74',
    w: 0.9,
    h: 0.28,
    x: 0.3,
    y: 0.5,
    rot: -48,
    opacity: 0.12,
    speed: 0.15,
    ampX: 0.09,
    ampY: 0.08,
    ampRot: 10,
    ampScale: 0.12,
    phase: 0.9,
  },
  {
    color: '#C2410C',
    w: 1.15,
    h: 0.38,
    x: 0.55,
    y: 0.18,
    rot: -36,
    opacity: 0.14,
    speed: 0.1,
    ampX: 0.05,
    ampY: 0.1,
    ampRot: 8,
    ampScale: 0.09,
    phase: 4.7,
  },
];

type LiveRibbon = {
  config: Ribbon;
  tx: Animated.Value;
  ty: Animated.Value;
  rot: Animated.Value;
  sx: Animated.Value;
  sy: Animated.Value;
};

function RibbonView({
  live,
  width,
  height,
  index,
}: {
  live: LiveRibbon;
  width: number;
  height: number;
  index: number;
}) {
  const { config: ribbon } = live;
  const span = Math.max(width, height);
  const rw = span * ribbon.w;
  const rh = span * ribbon.h;
  const gradId = `mesh-ribbon-${index}`;
  const left = ribbon.x * width - rw / 2;
  const top = ribbon.y * height - rh / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: rw,
        height: rh,
        opacity: ribbon.opacity,
        transform: [
          { translateX: live.tx },
          { translateY: live.ty },
          {
            rotate: live.rot.interpolate({
              inputRange: [-180, 180],
              outputRange: ['-180deg', '180deg'],
            }),
          },
          { scaleX: live.sx },
          { scaleY: live.sy },
        ],
        ...(Platform.OS === 'web' ? ({ filter: 'blur(36px)' } as object) : null),
      }}
    >
      <Svg width={rw} height={rh}>
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={ribbon.color} stopOpacity="0.95" />
            <Stop offset="42%" stopColor={ribbon.color} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={ribbon.color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={rw / 2} cy={rh / 2} rx={rw / 2} ry={rh / 2} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

/** Calm flowing ember mesh — continuous diagonal warp, low opacity, reduce-motion aware. */
export function OrangeMeshBackground() {
  const { width, height } = useWindowDimensions();
  const [reduce, setReduce] = useState(false);
  const [lives] = useState<LiveRibbon[]>(() => RIBBONS.map((config) => ({
      config,
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
      rot: new Animated.Value(config.rot),
      sx: new Animated.Value(1),
      sy: new Animated.Value(1),
    })));

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

  useEffect(() => {
    if (reduce) {
      lives.forEach((live) => {
        live.tx.setValue(0);
        live.ty.setValue(0);
        live.rot.setValue(live.config.rot);
        live.sx.setValue(1);
        live.sy.setValue(1);
      });
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      for (const live of lives) {
        const { config } = live;
        const a = t * config.speed + config.phase;
        const b = t * config.speed * 0.73 + config.phase * 1.3;
        live.tx.setValue(Math.sin(a) * config.ampX * width);
        live.ty.setValue(Math.cos(b) * config.ampY * height);
        live.rot.setValue(config.rot + Math.sin(a * 0.85) * config.ampRot);
        live.sx.setValue(1 + Math.sin(b) * config.ampScale);
        live.sy.setValue(1 + Math.cos(a * 1.1) * config.ampScale * 0.85);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, width, height, lives]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      {/* Near-black base — orange comes only from translucent ribbons. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050303' }]} />
      <LinearGradient
        colors={['#120805', '#070404', '#030202']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {lives.map((live, index) => (
        <RibbonView key={index} live={live} width={width} height={height} index={index} />
      ))}

      {/* Thin wisps — finer streaks for the hairline ember trails. */}
      {!reduce &&
        [0, 1, 2].map((i) => {
          const live = lives[i];
          const span = Math.max(width, height);
          return (
            <Animated.View
              key={`wisp-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: live.config.x * width - span * 0.35,
                top: live.config.y * height - 2,
                width: span * 0.7,
                height: 3,
                borderRadius: 2,
                backgroundColor: '#FFB065',
                opacity: 0.08,
                transform: [
                  { translateX: live.tx },
                  { translateY: live.ty },
                  {
                    rotate: live.rot.interpolate({
                      inputRange: [-180, 180],
                      outputRange: ['-180deg', '180deg'],
                    }),
                  },
                  { scaleX: live.sx },
                ],
                ...(Platform.OS === 'web' ? ({ filter: 'blur(2px)' } as object) : null),
              }}
            />
          );
        })}

      {/* Light veil for form contrast — keep mesh visible. */}
      <LinearGradient
        colors={['#00000033', '#00000055', '#000000AA']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

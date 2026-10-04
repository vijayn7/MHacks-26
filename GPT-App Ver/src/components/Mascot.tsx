import React, { forwardRef, useEffect, useId, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Filter,
  FeGaussianBlur,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Hue, palettes } from '../design/tokens';
import { useStore } from '../state/Store';
import { blendPalette } from '../design/blend';
import type { Face } from '../design/faces';
import { FlameFace } from './FlameFace';
import { Flame } from './Flame';
import { usePetting } from '../hooks/usePetting';
import { flamePoses } from '../design/flame-motion';
import type { FlameLevel } from '../state/Companion';

// Keep Snuff's original outline and face. Light dissolves toward the tips,
// while feathered gradient strokes create soft trails on both native and web.
// Animated injects a native-only collapsable prop; SVG DOM nodes must not receive it.
const MotionPath = forwardRef<Path, React.ComponentProps<typeof Path> & { collapsable?: boolean }>(
  ({ collapsable, ...props }, ref) => (
    <Path ref={ref} {...props} {...(Platform.OS === 'web' ? {} : { collapsable })} />
  ),
);
MotionPath.displayName = 'MotionPath';
const AnimatedPath = Animated.createAnimatedComponent(MotionPath);
const trails = [
  { d: 'M 115 155 C 99 128 127 107 116 83 C 107 61 134 40 127 12', width: 33 },
  { d: 'M 81 166 C 54 139 76 122 67 104 C 57 88 77 73 73 54', width: 24 },
  { d: 'M 163 161 C 187 137 158 112 168 92 C 179 72 167 52 172 37', width: 25 },
];

export function Mascot({
  hue = 'Ember',
  size = 240,
  calm: forcedCalm = false,
  progress: suppliedProgress,
  intensity,
  companionId = 'you',
  companionName,
  expression,
  onLongPress,
  animate = true,
}: {
  hue?: Hue;
  size?: number;
  calm?: boolean;
  intensity?: FlameLevel;
  companionId?: string;
  companionName?: string;
  expression?: Face | 'wistful';
  onLongPress?: () => void;
  progress?: Animated.Value;
  animate?: boolean;
}) {
  const pet = usePetting(companionId, size, forcedCalm ? 'Out' : intensity, onLongPress);
  const calm = pet.level === 'Out';
  const low = pet.level === 'Low';
  const progress = suppliedProgress ?? (onLongPress ? pet.hold : undefined);
  const contentment = Animated.diffClamp(
    Animated.add(pet.warmth, Animated.multiply(pet.touch, 0.3)),
    0,
    1,
  );
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { state } = useStore();
  const face = expression ?? (companionId === 'you' ? state.face : 'classic');
  const p = calm
    ? palettes.Ash
    : companionId === 'you'
      ? blendPalette(hue, state.blendHue, state.blend)
      : palettes[hue];
  const [flicker] = useState(() => new Animated.Value(0));
  const silhouette = flicker.interpolate({
    inputRange: [0, 0.34, 0.7, 1],
    outputRange: flamePoses,
  });
  useEffect(() => {
    if (!animate || !pet.awake) return;
    const motion = Animated.loop(
      Animated.timing(flicker, {
        toValue: 1,
        duration: calm ? 6500 : low ? 4900 : 3600,
        easing: Easing.linear,
        useNativeDriver: false,
        isInteraction: false,
      }),
    );
    motion.start();
    return () => motion.stop();
  }, [animate, pet.awake, calm, low, flicker]);
  const [breath] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!animate || !pet.awake) return;
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: calm ? 4200 : low ? 3400 : 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: calm ? 4800 : low ? 3900 : 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    const rise = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 4600,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    breathe.start();
    rise.start();
    return () => {
      breathe.stop();
      rise.stop();
    };
  }, [animate, calm, low, pet.awake, breath, drift]);
  const url = (name: string) => 'url(#' + name + id + ')';
  const height = (size * 270) / 240;
  return (
    <View
      testID="flame-mascot"
      {...pet.handlers}
      accessible
      focusable
      accessibilityRole="button"
      accessibilityLabel={`${companionId === 'you' ? 'pet your flame' : companionName ? `pet ${companionName.toLowerCase()}’s flame` : 'pet this flame'}. ${pet.reaction === 'idle' ? (pet.relaxed ? 'content' : 'peaceful') : pet.reaction}, ${calm ? 'resting' : low ? 'low' : 'bright'} flame`}
      accessibilityHint={
        onLongPress
          ? 'rub or swipe to pet. hold still for three seconds to pause.'
          : 'tap, gently rub, or hold to soothe this flame.'
      }
      accessibilityActions={[{ name: 'activate', label: 'pet the flame' }]}
      onAccessibilityAction={pet.greet}
      onAccessibilityTap={pet.greet}
      {...(Platform.OS === 'web'
        ? {
            tabIndex: 0,
            onKeyDown: (event: { key: string; repeat: boolean; preventDefault: () => void }) => {
              if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                event.preventDefault();
                pet.greet();
              }
            },
          }
        : {})}
      style={{
        width: size,
        height,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        minHeight: 44,
        ...(Platform.OS === 'web'
          ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as ViewStyle)
          : {}),
      }}
    >
      <View style={{ pointerEvents: 'none', position: 'absolute', opacity: 0.025 }}>
        <Flame
          hue={calm ? 'Ash' : hue}
          size={size}
          intensity={pet.level}
          breathe={false}
          progress={pet.level === 'High' ? progress : undefined}
        />
      </View>
      <Animated.View
        style={{
          pointerEvents: 'none',
          ...StyleSheet.absoluteFill,
          opacity: progress
            ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] })
            : calm
              ? 0.3
              : 1,
        }}
      >
        <Svg width={size} height={height} viewBox="0 0 240 270">
          <Defs>
            <RadialGradient id={'halo' + id}>
              <Stop offset="0" stopColor={p.mid} stopOpacity=".45" />
              <Stop offset=".36" stopColor={p.edge} stopOpacity=".20" />
              <Stop offset=".72" stopColor={p.deep} stopOpacity=".09" />
              <Stop offset="1" stopColor={p.wash} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="124" cy="148" rx="115" ry="122" fill={url('halo')} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          pointerEvents: 'none',
          ...StyleSheet.absoluteFill,
          opacity: Animated.multiply(pet.warmth, pet.energy * 0.75),
          transform: [
            {
              scale: pet.reducedMotion
                ? 1
                : pet.warmth.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }),
            },
          ],
        }}
      >
        <Svg width={size} height={height} viewBox="0 0 240 270">
          <Defs>
            <RadialGradient id={'affection' + id}>
              <Stop offset="0" stopColor={p.core} stopOpacity=".36" />
              <Stop offset=".4" stopColor={p.body} stopOpacity=".26" />
              <Stop offset=".72" stopColor={p.edge} stopOpacity=".1" />
              <Stop offset="1" stopColor={p.edge} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="120" cy="155" rx="117" ry="112" fill={url('affection')} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          pointerEvents: 'none',
          ...StyleSheet.absoluteFill,
          opacity: pet.pulse.interpolate({
            inputRange: [0, 0.1, 1],
            outputRange: [0, 0.65 * pet.energy, 0],
          }),
          transform: [
            {
              scale: pet.reducedMotion
                ? 1
                : pet.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.55] }),
            },
          ],
        }}
      >
        <Svg width={size} height={height} viewBox="0 0 240 270">
          <Defs>
            <RadialGradient id={'ripple' + id}>
              <Stop offset="0" stopColor={p.body} stopOpacity="0" />
              <Stop offset=".46" stopColor={p.body} stopOpacity=".03" />
              <Stop offset=".65" stopColor={p.core} stopOpacity=".28" />
              <Stop offset=".82" stopColor={p.mid} stopOpacity=".08" />
              <Stop offset="1" stopColor={p.edge} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="120" cy="154" rx="116" ry="108" fill={url('ripple')} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          pointerEvents: 'none',
          transform: [
            {
              translateX: pet.x.interpolate({
                inputRange: [-1, 1],
                outputRange: [-size * 0.035, size * 0.035],
              }),
            },
            { translateY: pet.y },
            { rotate: pet.x.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] }) },
            { scaleX: pet.squish.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] }) },
            { scaleY: pet.squish.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }) },
          ],
        }}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (-4 * size * pet.energy) / 240],
                }),
              },
              { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) },
              {
                scaleY: progress
                  ? Animated.multiply(
                      progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.73] }),
                      calm ? 0.88 : low ? 0.94 : 1,
                    )
                  : calm
                    ? 0.88
                    : low
                      ? 0.94
                      : 1,
              },
            ],
            opacity: progress
              ? Animated.multiply(
                  progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.64] }),
                  calm ? 0.72 : low ? 0.86 : 1,
                )
              : calm
                ? 0.72
                : low
                  ? 0.86
                  : 1,
          }}
        >
          <Animated.View
            style={{
              ...StyleSheet.absoluteFill,
              opacity: calm
                ? 0.12
                : breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: low ? [0.35, 0.52] : [0.78, 1],
                  }),
              transform: [
                {
                  translateX: breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [(-2 * size) / 240, (2 * size) / 240],
                  }),
                },
                { scaleY: breath.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) },
              ],
            }}
          >
            <Svg width={size} height={height} viewBox="0 0 240 270">
              <Defs>
                <Filter
                  id={'diffuse' + id}
                  x="0"
                  y="0"
                  width="240"
                  height="270"
                  filterUnits="userSpaceOnUse"
                >
                  <FeGaussianBlur stdDeviation="5" />
                </Filter>
                <RadialGradient id={'plume' + id}>
                  <Stop offset="0" stopColor={p.body} stopOpacity=".38" />
                  <Stop offset=".35" stopColor={p.mid} stopOpacity=".23" />
                  <Stop offset=".68" stopColor={p.edge} stopOpacity=".08" />
                  <Stop offset="1" stopColor={p.edge} stopOpacity="0" />
                </RadialGradient>
                <LinearGradient
                  id={'trail' + id}
                  x1="0"
                  y1="8"
                  x2="0"
                  y2="179"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={p.edge} stopOpacity="0" />
                  <Stop offset=".25" stopColor={p.mid} stopOpacity=".3" />
                  <Stop offset=".68" stopColor={p.body} stopOpacity=".85" />
                  <Stop offset="1" stopColor={p.core} stopOpacity=".08" />
                </LinearGradient>
              </Defs>
              <Ellipse
                cx="120"
                cy="100"
                rx="49"
                ry="92"
                fill={url('plume')}
                transform="rotate(10 120 100)"
              />
              <Ellipse
                cx="73"
                cy="125"
                rx="33"
                ry="65"
                fill={url('plume')}
                transform="rotate(-16 73 125)"
              />
              <Ellipse
                cx="167"
                cy="119"
                rx="35"
                ry="73"
                fill={url('plume')}
                transform="rotate(12 167 119)"
              />
              {trails.map((trail, i) => (
                <G key={i} filter={url('diffuse')}>
                  {[1.8, 1, 0.45].map((scale) => (
                    <Path
                      key={scale}
                      d={trail.d}
                      fill="none"
                      stroke={url('trail')}
                      strokeWidth={trail.width * scale}
                      strokeOpacity={0.16}
                      strokeLinecap="round"
                    />
                  ))}
                </G>
              ))}
            </Svg>
          </Animated.View>
          <Svg width={size} height={height} viewBox="0 0 240 270">
            <Defs>
              <Filter
                id={'edge' + id}
                x="0"
                y="0"
                width="240"
                height="270"
                filterUnits="userSpaceOnUse"
              >
                <FeGaussianBlur stdDeviation="4" />
              </Filter>
              <LinearGradient id={'body' + id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={p.body} stopOpacity="0" />
                <Stop offset=".19" stopColor={p.body} stopOpacity=".28" />
                <Stop offset=".43" stopColor={p.body} stopOpacity=".9" />
                <Stop offset=".64" stopColor={p.mid} />
                <Stop offset="1" stopColor={p.edge} />
              </LinearGradient>
              <RadialGradient id={'core' + id} cx="47%" cy="74%" rx="62%" ry="58%">
                <Stop offset="0" stopColor={p.core} stopOpacity=".96" />
                <Stop offset=".37" stopColor={p.core} stopOpacity=".76" />
                <Stop offset=".73" stopColor={p.body} stopOpacity=".22" />
                <Stop offset="1" stopColor={p.body} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id={'bloom' + id}>
                <Stop offset="0" stopColor={p.core} stopOpacity=".25" />
                <Stop offset=".5" stopColor={p.mid} stopOpacity=".12" />
                <Stop offset="1" stopColor={p.edge} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="125" cy="181" rx="91" ry="75" fill={url('bloom')} />
            <G transform="translate(10 30) scale(.92)">
              <AnimatedPath d={silhouette} fill={url('body')} filter={url('edge')} opacity={0.55} />
              <AnimatedPath testID="flame-crown" d={silhouette} fill={url('body')} />
              <AnimatedPath d={silhouette} fill={url('core')} />
            </G>
          </Svg>
          <Animated.View
            style={{
              position: 'absolute',
              top: (height * 150) / 270,
              width: size,
              height: (height * 30) / 270,
              opacity: calm
                ? 0
                : contentment.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.65, 0] }),
              transform: [
                { scaleY: contentment.interpolate({ inputRange: [0, 1], outputRange: [1, 0.12] }) },
              ],
            }}
          >
            <Svg
              testID={`flame-face-${face}`}
              width={size}
              height={(height * 30) / 270}
              viewBox="0 150 240 30"
            >
              <FlameFace face={face} color={p.wash} />
            </Svg>
          </Animated.View>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFill,
              opacity: calm
                ? 1
                : contentment.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }),
            }}
          >
            <Svg width={size} height={height} viewBox="0 0 240 270">
              <FlameFace face={face} color={p.wash} relaxed />
            </Svg>
          </Animated.View>
          {size >= 64 && (
            <Animated.View
              style={{
                ...StyleSheet.absoluteFill,
                transform: [
                  {
                    translateY: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [(7 * size) / 240, (-16 * size) / 240],
                    }),
                  },
                  {
                    translateX: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [(-2 * size) / 240, (4 * size) / 240],
                    }),
                  },
                ],
                opacity: drift.interpolate({
                  inputRange: [0, 0.3, 0.65, 1],
                  outputRange: [0, 0.8, 0.5, 0],
                }),
              }}
            >
              <Svg width={size} height={height} viewBox="0 0 240 270">
                <Defs>
                  <RadialGradient id={'ember' + id}>
                    <Stop offset="0" stopColor={p.core} stopOpacity=".9" />
                    <Stop offset=".25" stopColor={p.body} stopOpacity=".55" />
                    <Stop offset="1" stopColor={p.mid} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                {[
                  { x: 78, y: 67, r: 4 },
                  { x: 153, y: 28, r: 3.3 },
                  { x: 178, y: 65, r: 2.4 },
                ].map((ember) => (
                  <Circle key={ember.x} cx={ember.x} cy={ember.y} r={ember.r} fill={url('ember')} />
                ))}
              </Svg>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

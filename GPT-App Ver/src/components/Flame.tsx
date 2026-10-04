import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { flameAssets, Hue } from '../design/tokens';

// Original Figma assets remain untouched at 320 × 380; native uses Figma PNG renders.
// Only their parent scales. Each intensity uses its matching Figma asset.
export function Flame({
  hue = 'Ember',
  intensity = 'High',
  size = 240,
  progress,
  breathe = true,
}: {
  hue?: Hue;
  intensity?: 'High' | 'Low' | 'Out';
  size?: number;
  progress?: Animated.Value;
  breathe?: boolean;
}) {
  const [breath] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!breathe) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, breathe]);
  return (
    <View
      style={{
        pointerEvents: 'none',
        width: size,
        height: (size * 380) / 320,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: 320, height: 380, transform: [{ scale: size / 320 }] }}>
        <Animated.View
          style={{
            width: 320,
            height: 380,
            transform: [
              { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
              { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            ],
          }}
        >
          {progress ? (
            <>
              <Image
                loading="eager"
                source={flameAssets[hue].Out}
                style={s.image}
                contentFit="contain"
              />
              <Animated.View
                style={[
                  s.image,
                  {
                    opacity: progress.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 0.3, 0],
                    }),
                    transform: [
                      {
                        scaleY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.35],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  loading="eager"
                  source={flameAssets[hue].High}
                  style={s.image}
                  contentFit="contain"
                />
              </Animated.View>
              <Animated.View
                style={[
                  s.image,
                  {
                    opacity: progress.interpolate({
                      inputRange: [0, 0.45, 0.85, 1],
                      outputRange: [0, 0.65, 0.5, 0],
                    }),
                  },
                ]}
              >
                <Image
                  loading="eager"
                  source={flameAssets[hue].Low}
                  style={s.image}
                  contentFit="contain"
                />
              </Animated.View>
            </>
          ) : (
            <Image
              loading="eager"
              source={flameAssets[hue][intensity]}
              style={s.image}
              contentFit="contain"
              transition={450}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  image: { width: 320, height: 380, position: 'absolute', top: 0, left: 0 },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
} from 'react-native';
import { useStore } from '../state/Store';
import { palettes } from '../design/tokens';

export function SoftPressable({ children, onPressIn, onPressOut, ...props }: PressableProps) {
  const { state } = useStore();
  const [glow] = useState(() => new Animated.Value(0));
  const reduced = useRef(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) reduced.current = value;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
      glow.stopAnimation();
      glow.setValue(0);
    });
    return () => {
      active = false;
      sub.remove();
      glow.stopAnimation();
    };
  }, [glow]);
  const pulse = (value: number) => {
    glow.stopAnimation();
    Animated.timing(glow, {
      toValue: value,
      duration: reduced.current ? 0 : value ? 100 : 320,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };
  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        pulse(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pulse(0);
        onPressOut?.(event);
      }}
    >
      {(pressedState) => (
        <>
          {typeof children === 'function' ? children(pressedState) : children}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                backgroundColor: palettes[state.hue].body + '12',
                shadowColor: palettes[state.hue].body,
                shadowOpacity: 0.25,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 0 },
                opacity: glow,
              },
            ]}
          />
        </>
      )}
    </Pressable>
  );
}

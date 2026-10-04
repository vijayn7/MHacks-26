import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Animated, Easing, Platform } from 'react-native';
import { useIsFocused } from 'expo-router';
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

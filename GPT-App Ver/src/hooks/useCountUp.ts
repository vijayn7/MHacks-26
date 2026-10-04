import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform } from 'react-native';
import { useIsFocused } from 'expo-router';

type Options = {
  value: number;
  delay?: number;
  duration?: number;
  enabled?: boolean;
};

/**
 * Soft count-up that replays when a screen becomes focused.
 * Returns the eased display value, a shared 0→1 progress, and a fade opacity.
 */
export function useCountUp({ value, delay = 0, duration = 900, enabled = true }: Options) {
  const focused = useIsFocused();
  const [reduce, setReduce] = useState(true);
  const [foreground, setForeground] = useState(true);
  const [progress] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
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
    if (!enabled || !focused || !foreground) {
      progress.stopAnimation();
      opacity.stopAnimation();
      return;
    }
    if (reduce) {
      progress.setValue(1);
      opacity.setValue(1);
      setDisplay(value);
      return;
    }

    progress.setValue(0);
    opacity.setValue(0);
    setDisplay(0);
    const listener = progress.addListener(({ value: t }) => {
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
    });

    const motion = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Math.max(280, duration * 0.55),
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    ]);
    motion.start(({ finished }) => {
      if (finished) setDisplay(value);
    });

    return () => {
      progress.removeListener(listener);
      motion.stop();
    };
  }, [value, delay, duration, enabled, focused, foreground, reduce, progress, opacity]);

  return { display, progress, opacity };
}

/** One shared progress/fade for a group of values that should animate together. */
export function useSharedCountUp({
  delay = 0,
  duration = 1100,
  enabled = true,
  replayKey = 0,
}: {
  delay?: number;
  duration?: number;
  enabled?: boolean;
  replayKey?: string | number;
}) {
  const focused = useIsFocused();
  const [reduce, setReduce] = useState(true);
  const [foreground, setForeground] = useState(true);
  const [progress] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
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
    if (!enabled || !focused || !foreground) {
      progress.stopAnimation();
      opacity.stopAnimation();
      return;
    }
    if (reduce) {
      progress.setValue(1);
      opacity.setValue(1);
      setAmount(1);
      return;
    }

    progress.setValue(0);
    opacity.setValue(0);
    setAmount(0);
    const listener = progress.addListener(({ value: t }) => {
      setAmount(1 - Math.pow(1 - t, 3));
    });

    const motion = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Math.max(320, duration * 0.5),
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]),
    ]);
    motion.start(({ finished }) => {
      if (finished) setAmount(1);
    });

    return () => {
      progress.removeListener(listener);
      motion.stop();
    };
  }, [delay, duration, enabled, focused, foreground, reduce, progress, opacity, replayKey]);

  return { amount, progress, opacity };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  PanResponder,
  type PanResponderGestureState,
  Platform,
} from 'react-native';
import { useIsFocused } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FlameLevel, useCompanion } from '../state/Companion';

export function usePetting(
  id: string,
  size: number,
  forcedLevel?: FlameLevel,
  onLongPress?: () => void,
) {
  const { mood, level: naturalLevel, relaxed } = useCompanion(id);
  const level = forcedLevel ?? naturalLevel;
  const energy = level === 'Out' ? 0.28 : level === 'Low' ? 0.6 : 1;
  const focused = useIsFocused();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [reaction, setReaction] = useState<'idle' | 'tap' | 'stroke' | 'hold'>('idle');
  const [values] = useState(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    squish: new Animated.Value(0),
    pulse: new Animated.Value(0),
    hold: new Animated.Value(0),
    touch: new Animated.Value(0),
  }));
  const session = useRef({
    active: false,
    moved: false,
    completed: false,
    began: 0,
    x: 0,
    y: 0,
    haptic: 0,
    pulse: 0,
  });
  const timers = useRef<{
    hold?: ReturnType<typeof setTimeout>;
    purr?: ReturnType<typeof setInterval>;
    idle?: ReturnType<typeof setTimeout>;
  }>({});
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  const haptic = useCallback(() => {
    const now = Date.now();
    if (Platform.OS === 'web' || now - session.current.haptic < (level === 'Out' ? 700 : 180))
      return;
    session.current.haptic = now;
    (Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    ).catch(() => {});
  }, [level]);
  const pulse = useCallback(() => {
    const now = Date.now();
    if (now - session.current.pulse < 420) return;
    session.current.pulse = now;
    values.pulse.stopAnimation();
    values.pulse.setValue(0);
    Animated.timing(values.pulse, {
      toValue: 1,
      duration: reducedMotion ? 1300 : 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [values, reducedMotion]);
  const finish = useCallback(
    (cancelled = false) => {
      const current = session.current;
      clearTimeout(timers.current.hold);
      clearInterval(timers.current.purr);
      clearTimeout(timers.current.idle);
      const tapped =
        !cancelled && current.active && !current.moved && Date.now() - current.began < 450;
      if (tapped) {
        setReaction('tap');
        mood.pet(0.13);
        pulse();
        haptic();
        if (!reducedMotion)
          Animated.sequence([
            Animated.timing(values.y, {
              toValue: -5 * energy,
              duration: 150,
              useNativeDriver: false,
            }),
            Animated.spring(values.y, {
              toValue: 0,
              damping: 9,
              stiffness: 140,
              useNativeDriver: false,
            }),
          ]).start();
      }
      current.active = false;
      values.hold.stopAnimation();
      Animated.parallel([
        ...[values.x, values.squish, values.hold, values.touch].map((value) =>
          Animated.spring(value, {
            toValue: 0,
            damping: 15,
            stiffness: 95,
            useNativeDriver: false,
          }),
        ),
        ...(tapped && !reducedMotion
          ? []
          : [
              Animated.spring(values.y, {
                toValue: 0,
                damping: 13,
                stiffness: 90,
                useNativeDriver: false,
              }),
            ]),
      ]).start();
      if (!cancelled) timers.current.idle = setTimeout(() => setReaction('idle'), 1600);
      else setReaction('idle');
    },
    [mood, pulse, haptic, values, reducedMotion, energy],
  );
  useEffect(
    () => () => {
      finish(true);
      Object.values(values).forEach((value) => value.stopAnimation());
    },
    [focused, foreground, finish, values],
  );
  const greet = useCallback(() => {
    mood.pet(0.2);
    setReaction('tap');
    pulse();
    haptic();
    clearTimeout(timers.current.idle);
    timers.current.idle = setTimeout(() => setReaction('idle'), 1600);
  }, [mood, pulse, haptic]);
  const begin = useCallback(() => {
    clearTimeout(timers.current.idle);
    session.current = {
      ...session.current,
      active: true,
      moved: false,
      completed: false,
      began: Date.now(),
      x: 0,
      y: 0,
    };
    setReaction('tap');
    mood.pet(0.07);
    haptic();
    pulse();
    Animated.timing(values.touch, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
    if (onLongPress && level !== 'Out')
      Animated.timing(values.hold, {
        toValue: 1,
        duration: 2800,
        useNativeDriver: false,
      }).start();
    timers.current.hold = setTimeout(
      () => {
        if (!session.current.active || session.current.moved) return;
        session.current.completed = true;
        setReaction('hold');
        mood.pet(0.3);
        pulse();
        haptic();
        if (level !== 'Out') onLongPress?.();
      },
      onLongPress ? 2800 : 900,
    );
    timers.current.purr = setInterval(
      () => {
        if (!session.current.active) return;
        mood.pet(0.035);
        haptic();
      },
      level === 'Out' ? 850 : 420,
    );
  }, [mood, haptic, pulse, values, onLongPress, level]);
  const move = useCallback(
    (_: unknown, gesture: PanResponderGestureState) => {
      const current = session.current;
      if (!current.active || gesture.numberActiveTouches > 1) {
        finish(true);
        return;
      }
      const delta = Math.hypot(gesture.dx - current.x, gesture.dy - current.y);
      current.x = gesture.dx;
      current.y = gesture.dy;
      if (Math.hypot(gesture.dx, gesture.dy) > 7) {
        current.moved = true;
        clearTimeout(timers.current.hold);
        values.hold.stopAnimation();
        values.hold.setValue(0);
        setReaction('stroke');
        if (delta > 1) {
          mood.pet(Math.min(0.035, (delta / size) * 0.3));
          haptic();
          pulse();
        }
        if (!reducedMotion) {
          values.x.setValue(Math.max(-1, Math.min(1, gesture.dx / (size * 0.35))) * energy);
          values.y.setValue(Math.max(-7, Math.min(7, (gesture.dy / size) * 22)) * energy);
          values.squish.setValue(Math.min(1, delta / 14 + 0.15) * energy);
        }
      }
    },
    [finish, values, mood, size, haptic, pulse, reducedMotion, energy],
  );
  const release = useCallback(() => finish(), [finish]);
  const cancel = useCallback(() => finish(true), [finish]);
  const responder = useMemo(
    () =>
      // PanResponder registers these event callbacks without reading their refs during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => focused && foreground,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: begin,
        onPanResponderMove: move,
        onPanResponderRelease: release,
        onPanResponderTerminate: cancel,
        onPanResponderTerminationRequest: () => true,
      }),
    [focused, foreground, begin, move, release, cancel],
  );
  return {
    ...values,
    warmth: mood.warmth,
    level,
    energy,
    relaxed,
    reaction,
    reducedMotion,
    awake: focused && foreground && !reducedMotion,
    handlers: responder.panHandlers,
    greet,
  };
}

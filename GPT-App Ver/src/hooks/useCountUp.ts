import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

type Options = {
  value: number;
  delay?: number;
  duration?: number;
  enabled?: boolean;
};

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
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
  return reduce;
}

function useForeground() {
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  return foreground;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function runCountUp({
  delay,
  duration,
  onUpdate,
  onDone,
}: {
  delay: number;
  duration: number;
  onUpdate: (progress: number, opacity: number) => void;
  onDone: () => void;
}) {
  let frame = 0;
  let start = 0;
  const tick = (now: number) => {
    if (!start) start = now;
    const elapsed = now - start - delay;
    if (elapsed < 0) {
      onUpdate(0, 0);
      frame = requestAnimationFrame(tick);
      return;
    }
    const t = Math.min(1, elapsed / duration);
    const progress = easeOutCubic(t);
    const opacity = Math.min(1, easeOutCubic(Math.min(1, elapsed / Math.max(280, duration * 0.55))));
    onUpdate(progress, opacity);
    if (t < 1) frame = requestAnimationFrame(tick);
    else onDone();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/**
 * Soft count-up that replays whenever the screen gains focus.
 * Returns the eased display value and a fade opacity (0–1).
 */
export function useCountUp({ value, delay = 0, duration = 1100, enabled = true }: Options) {
  const reduce = useReduceMotion();
  const foreground = useForeground();
  const [display, setDisplay] = useState(0);
  const [opacity, setOpacity] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !foreground) return;
      if (reduce) {
        setDisplay(value);
        setOpacity(1);
        return;
      }
      setDisplay(0);
      setOpacity(0);
      return runCountUp({
        delay,
        duration,
        onUpdate: (progress, nextOpacity) => {
          setDisplay(value * progress);
          setOpacity(nextOpacity);
        },
        onDone: () => {
          setDisplay(value);
          setOpacity(1);
        },
      });
    }, [value, delay, duration, enabled, foreground, reduce]),
  );

  return { display, opacity };
}

/** One shared progress/fade for a group of values that should animate together. */
export function useSharedCountUp({
  delay = 0,
  duration = 1300,
  enabled = true,
  replayKey = 0,
}: {
  delay?: number;
  duration?: number;
  enabled?: boolean;
  replayKey?: string | number;
}) {
  const reduce = useReduceMotion();
  const foreground = useForeground();
  const [amount, setAmount] = useState(0);
  const [opacity, setOpacity] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !foreground) return;
      if (reduce) {
        setAmount(1);
        setOpacity(1);
        return;
      }
      setAmount(0);
      setOpacity(0);
      return runCountUp({
        delay,
        duration,
        onUpdate: (progress, nextOpacity) => {
          setAmount(progress);
          setOpacity(nextOpacity);
        },
        onDone: () => {
          setAmount(1);
          setOpacity(1);
        },
      });
    }, [delay, duration, enabled, foreground, reduce, replayKey]),
  );

  return { amount, opacity };
}

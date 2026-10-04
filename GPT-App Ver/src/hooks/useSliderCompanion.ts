import { useEffect, useId, useRef } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useCompanion } from '../state/Companion';

/** Temporary feedback shared by every slider; never changes the saved face or flame level. */
export function useSliderCompanion() {
  const { mood } = useCompanion();
  const id = useId();
  const focused = useIsFocused();
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const reset = () => {
      held.current = false;
      clearTimeout(timer.current);
      mood.setSlider(id, false);
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') reset();
    });
    if (!focused) reset();
    return () => {
      reset();
      sub.remove();
    };
  }, [focused, id, mood]);
  const end = () => {
    held.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => mood.setSlider(id, false), 350);
  };
  return {
    start: () => {
      held.current = true;
      clearTimeout(timer.current);
      mood.setSlider(id, true);
    },
    change: () => {
      mood.setSlider(id, true);
      if (!held.current) end();
    },
    end,
  };
}

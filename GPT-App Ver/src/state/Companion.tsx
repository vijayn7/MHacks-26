import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Animated, Easing } from 'react-native';
import { useStore } from './Store';

export type FlameLevel = 'High' | 'Low' | 'Out';

class CompanionMood {
  readonly warmth = new Animated.Value(0);
  level: FlameLevel = 'High';
  private amount = 0;
  private listeners = new Set<() => void>();
  private cooling?: ReturnType<typeof setTimeout>;
  private resting?: ReturnType<typeof setTimeout>;
  private waking?: ReturnType<typeof setTimeout>;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => `${this.level}:${Math.floor(this.amount * 4)}`;
  private publish() {
    this.listeners.forEach((listener) => listener());
  }
  pet(amount: number) {
    clearTimeout(this.cooling);
    this.amount = Math.min(1, this.amount + amount);
    Animated.timing(this.warmth, {
      toValue: this.amount,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    this.publish();
    this.cooling = setTimeout(() => {
      this.amount = 0;
      Animated.timing(this.warmth, {
        toValue: 0,
        duration: 14000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      }).start();
      this.publish();
    }, 5500);
  }
  rest() {
    clearTimeout(this.resting);
    clearTimeout(this.waking);
    this.level = 'Out';
    this.publish();
    this.resting = setTimeout(() => {
      this.level = 'Low';
      this.publish();
    }, 2400);
    this.waking = setTimeout(() => {
      this.level = 'High';
      this.publish();
    }, 11000);
  }
  dispose() {
    clearTimeout(this.cooling);
    clearTimeout(this.resting);
    clearTimeout(this.waking);
    this.warmth.stopAnimation();
  }
}
const Registry = createContext<Map<string, CompanionMood> | null>(null);
export function CompanionProvider({ children }: React.PropsWithChildren) {
  const [registry] = useState(() => new Map<string, CompanionMood>([['you', new CompanionMood()]]));
  const { state, ready } = useStore();
  const previousPauses = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (previousPauses.current !== null && state.pauses > previousPauses.current)
      registry.get('you')?.rest();
    previousPauses.current = state.pauses;
  }, [ready, state.pauses, registry]);
  useEffect(() => () => registry.forEach((mood) => mood.dispose()), [registry]);
  return <Registry.Provider value={registry}>{children}</Registry.Provider>;
}
export function useCompanion(id = 'you') {
  const registry = useContext(Registry);
  const [mood] = useState(() => {
    if (!registry) throw new Error('Mascots need a CompanionProvider');
    if (!registry.has(id)) registry.set(id, new CompanionMood());
    return registry.get(id)!;
  });
  const snapshot = useSyncExternalStore(mood.subscribe, mood.snapshot, mood.snapshot);
  return {
    mood,
    level: snapshot.split(':')[0] as FlameLevel,
    relaxed: Number(snapshot.split(':')[1]) >= 2,
  };
}

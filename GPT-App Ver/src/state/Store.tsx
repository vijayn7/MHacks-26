import { matchesPurchase } from './purchase-rules';
import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import { sampleWatchReading } from '../services/watch-feed';
import { archiveSamples } from './archive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Action, AppState, initialState, migrate, reducer } from './model';

export const STORAGE_KEY = 'snuff.mobile.v2';
const Store = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  ready: boolean;
  storageError: string | null;
  activeNudge: string | null;
  openNudge: (id: string | null) => void;
  receivePurchase: (purchase: {
    id: string;
    name: string;
    amount: number;
    category?: string;
  }) => boolean;
}>({
  state: initialState(),
  dispatch: () => {},
  ready: false,
  storageError: null,
  activeNudge: null,
  openNudge: () => {},
  receivePurchase: () => false,
});
export function StoreProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(
    (s: AppState, a: Action | { type: 'HYDRATE'; state: AppState }) =>
      a.type === 'HYDRATE' ? a.state : reducer(s, a),
    undefined,
    initialState,
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [activeNudge, openNudge] = useState<string | null>(null);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    (async () => {
      const raw =
        (await AsyncStorage.getItem(STORAGE_KEY)) ||
        (await AsyncStorage.getItem('ember.mobile.v1'));
      if (active) {
        const saved = raw ? migrate(JSON.parse(raw)) : initialState();
        const samples = archiveSamples().filter(
          (item) => !saved.archive.some((existing) => existing.id === item.id),
        );
        dispatch({
          type: 'HYDRATE',
          state: { ...saved, onboardingComplete: false, archive: [...saved.archive, ...samples] },
        });
      }
    })()
      .catch(() => {
        if (active) setStorageError('This device could not load your saved progress.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const streaming =
    ready &&
    state.wearable.enabled &&
    state.wearable.status === 'connected' &&
    !!activeNudge &&
    state.nudges.some((n) => n.id === activeNudge && n.status === 'waiting');
  useEffect(() => {
    if (!streaming) return;
    const update = () => {
      if (NativeAppState.currentState === 'active' || NativeAppState.currentState == null)
        dispatch({ type: 'WEARABLE', settings: { reading: sampleWatchReading() } });
    };
    update();
    const timer = setInterval(update, 2000);
    const subscription = NativeAppState.addEventListener('change', (status) => {
      if (status === 'active') update();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [streaming]);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)))
      .then(() => setStorageError(null))
      .catch(() =>
        setStorageError('Your progress is active, but could not be saved on this device.'),
      );
  }, [state, ready]);
  const receivePurchase = (purchase: {
    id: string;
    name: string;
    amount: number;
    category?: string;
  }) => {
    if (!matchesPurchase(state.purchaseRules, purchase.amount, purchase.category)) return false;
    const existing = state.nudges.find((n) => n.id === purchase.id);
    if (existing && existing.status !== 'waiting') return false;
    dispatch({ type: 'INCOMING_PURCHASE', ...purchase });
    openNudge(purchase.id);
    return true;
  };
  return (
    <Store.Provider
      value={{ state, dispatch, ready, storageError, activeNudge, openNudge, receivePurchase }}
    >
      {children}
    </Store.Provider>
  );
}
export const useStore = () => useContext(Store);

import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
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
}>({
  state: initialState(),
  dispatch: () => {},
  ready: false,
  storageError: null,
  activeNudge: null,
  openNudge: () => {},
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
      if (active && raw) dispatch({ type: 'HYDRATE', state: migrate(JSON.parse(raw)) });
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
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)))
      .then(() => setStorageError(null))
      .catch(() =>
        setStorageError('Your progress is active, but could not be saved on this device.'),
      );
  }, [state, ready]);
  return (
    <Store.Provider value={{ state, dispatch, ready, storageError, activeNudge, openNudge }}>
      {children}
    </Store.Provider>
  );
}
export const useStore = () => useContext(Store);

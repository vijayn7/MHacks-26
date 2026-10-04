import { matchesPurchase } from './purchase-rules';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState as NativeAppState } from 'react-native';
import { archiveSamples } from './archive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Action, AppState, initialState, migrate, reducer } from './model';
import { api, apiEnabled, newId, post } from '../services/api';

export const STORAGE_KEY = 'snuff.mobile.v2';
const POLL_MS = 4000;
const Store = createContext<{
  state: AppState;
  dispatch: (action: Action) => void;
  ready: boolean;
  storageError: string | null;
  online: boolean;
  refresh: () => Promise<void>;
  activeNudge: string | null;
  openNudge: (id: string | null) => void;
  receivePurchase: (purchase: {
    id: string;
    name: string;
    amount: number;
    category?: string;
    source?: string;
  }) => boolean;
}>({
  state: initialState(),
  dispatch: () => {},
  ready: false,
  storageError: null,
  online: false,
  refresh: async () => {},
  activeNudge: null,
  openNudge: () => {},
  receivePurchase: () => false,
});
export function StoreProvider({ children }: React.PropsWithChildren) {
  // SYNC takes server state but keeps phone-only fields (purchase rules, opt-outs, onboarding
  // progress) that the API does not store.
  const [state, apply] = useReducer(
    (
      s: AppState,
      a: Action | { type: 'HYDRATE'; state: AppState } | { type: 'SYNC'; state: unknown },
    ) => {
      if (a.type === 'HYDRATE') return a.state;
      if (a.type !== 'SYNC') return reducer(s, a);
      const next = migrate({ ...s, ...(a.state as object) });
      return {
        ...next,
        onboardingComplete: s.onboardingComplete,
      };
    },
    undefined,
    initialState,
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [activeNudge, openNudge] = useState<string | null>(null);
  const writes = useRef(Promise.resolve());
  const outbox = useRef(Promise.resolve());
  const edits = useRef(0);

  const dispatch = useCallback((action: Action) => {
    apply(action);
    if (!apiEnabled || action.type === 'SYNC_EXTENSION_SCORE') return;
    edits.current += 1;
    const body = { id: newId(), action };
    outbox.current = outbox.current
      .then(() => post('/app/actions', body))
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  // Server state wins, except while a local edit is newer than the request.
  const refresh = useCallback(async () => {
    if (!apiEnabled) return;
    await outbox.current;
    const before = edits.current;
    try {
      const server = await api('/app/state');
      if (edits.current === before) apply({ type: 'SYNC', state: server });
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (apiEnabled) {
        try {
          const server = await api('/app/state');
          if (active) {
            apply({ type: 'HYDRATE', state: { ...migrate(server), onboardingComplete: false } });
            setOnline(true);
          }
          return;
        } catch {
          if (active) setOnline(false);
        }
      }
      const raw =
        (await AsyncStorage.getItem(STORAGE_KEY)) ||
        (await AsyncStorage.getItem('ember.mobile.v1'));
      if (active) {
        const saved = raw ? migrate(JSON.parse(raw)) : initialState();
        const samples = archiveSamples().filter(
          (item) => !saved.archive.some((existing) => existing.id === item.id),
        );
        apply({
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

  useEffect(() => {
    if (!ready || !apiEnabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => void refresh(), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = NativeAppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void refresh();
        start();
      } else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [ready, refresh]);

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
    source?: string;
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
      value={{
        state,
        dispatch,
        ready,
        storageError,
        online,
        refresh,
        activeNudge,
        openNudge,
        receivePurchase,
      }}
    >
      {children}
    </Store.Provider>
  );
}
export const useStore = () => useContext(Store);

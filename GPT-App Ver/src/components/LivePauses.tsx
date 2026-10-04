import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useStore } from '../state/Store';
import { api, apiEnabled } from '../services/api';

const FAST_POLL_MS = 1000;

type SpacetimeConfig = { uri: string; database: string };

async function connectSpacetime(onChange: () => void): Promise<() => void> {
  const config = await api<SpacetimeConfig>('/spacetime');
  if (!config.uri || !config.database) throw new Error('spacetime_unconfigured');
  const { DbConnection, tables } = await import('../module_bindings');
  return await new Promise<() => void>((resolve, reject) => {
    let settled = false;
    let sub: { isActive: () => boolean; unsubscribe: () => void } | undefined;
    const conn = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.database)
      .onConnect((ctx) => {
        const notify = () => onChange();
        ctx.db.pauseStatus.onInsert((_event, _row) => notify());
        ctx.db.pauseStatus.onUpdate((_event, _old, _row) => notify());
        sub = ctx.subscriptionBuilder().onApplied(() => notify()).subscribe(tables.pauseStatus);
        if (!settled) {
          settled = true;
          resolve(() => {
            try {
              if (sub?.isActive()) sub.unsubscribe();
            } catch {
              /* already ended */
            }
            try {
              ctx.disconnect();
            } catch {
              /* already disconnected */
            }
          });
        }
      })
      .onConnectError((_ctx, error) => {
        if (!settled) {
          settled = true;
          reject(error instanceof Error ? error : new Error('spacetime_connect_failed'));
        }
      })
      .build();
    // If connect never fires, caller still has polling.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          conn.disconnect();
        } catch {
          /* ignore */
        }
        reject(new Error('spacetime_timeout'));
      }
    }, 8000);
  });
}

/**
 * Opens the pause popup for new waiting nudges from checkout, and refreshes
 * sooner than the 4s store poll when a pause is live. Spacetime drives refresh
 * when /spacetime is configured; otherwise we fall back to 1s polling.
 */
export function LivePauses() {
  const { state, ready, refresh, openNudge, activeNudge } = useStore();
  const seen = useRef<Set<string> | null>(null);
  const foreground = useRef(AppState.currentState === 'active');
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      foreground.current = next === 'active';
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (seen.current === null) {
      seen.current = new Set(state.nudges.map((n) => n.id));
      return;
    }
    for (const nudge of state.nudges) {
      if (seen.current.has(nudge.id)) continue;
      seen.current.add(nudge.id);
      if (nudge.status !== 'waiting') continue;
      if (nudge.dueAt != null && nudge.dueAt > Date.now()) continue;
      if (!foreground.current) continue;
      if (activeNudge) continue;
      openNudge(nudge.id);
      break;
    }
  }, [state.nudges, ready, openNudge, activeNudge]);

  const pendingLive = state.nudges.some(
    (n) => n.status === 'waiting' && (n.dueAt == null || n.dueAt <= Date.now()),
  );

  useEffect(() => {
    if (!ready || !apiEnabled) return;
    let stopSpacetime: (() => void) | undefined;
    let cancelled = false;
    void connectSpacetime(() => {
      if (!cancelled && foreground.current) void refreshRef.current();
    })
      .then((stop) => {
        if (cancelled) stop();
        else stopSpacetime = stop;
      })
      .catch(() => {
        /* /spacetime 503 or SDK/runtime failure — polling covers it */
      });
    return () => {
      cancelled = true;
      stopSpacetime?.();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !apiEnabled || !pendingLive) return;
    const timer = setInterval(() => {
      if (foreground.current) void refreshRef.current();
    }, FAST_POLL_MS);
    return () => clearInterval(timer);
  }, [ready, pendingLive]);

  return null;
}

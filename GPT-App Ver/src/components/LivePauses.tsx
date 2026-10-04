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

function hasPendingPause(nudges: { status: string; dueAt: number | null }[], now: number) {
  return nudges.some((n) => n.status === 'waiting' && (n.dueAt == null || n.dueAt <= now));
}

/**
 * Opens the pause popup for new waiting nudges from checkout, and refreshes
 * sooner than the 4s store poll when a pause is live. Spacetime drives refresh
 * when /spacetime is configured; otherwise we fall back to 1s polling.
 */
export function LivePauses() {
  const { state, ready, refresh, openNudge, activeNudge } = useStore();
  const seen = useRef<Set<string> | null>(null);
  const foreground = useRef(true);

  useEffect(() => {
    foreground.current = AppState.currentState === 'active';
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
    const now = Date.now();
    for (const nudge of state.nudges) {
      if (seen.current.has(nudge.id)) continue;
      seen.current.add(nudge.id);
      if (nudge.status !== 'waiting') continue;
      if (nudge.dueAt != null && nudge.dueAt > now) continue;
      if (!foreground.current) continue;
      if (activeNudge) continue;
      openNudge(nudge.id);
      break;
    }
  }, [state.nudges, ready, openNudge, activeNudge]);

  useEffect(() => {
    if (!ready || !apiEnabled) return;
    let stopSpacetime: (() => void) | undefined;
    let cancelled = false;
    void connectSpacetime(() => {
      if (!cancelled && foreground.current) void refresh();
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
  }, [ready, refresh]);

  useEffect(() => {
    if (!ready || !apiEnabled) return;
    // Poll only while a due waiting pause exists; re-evaluate on each nudge change.
    if (!hasPendingPause(state.nudges, Date.now())) return;
    const timer = setInterval(() => {
      if (foreground.current) void refresh();
    }, FAST_POLL_MS);
    return () => clearInterval(timer);
  }, [ready, refresh, state.nudges]);

  return null;
}

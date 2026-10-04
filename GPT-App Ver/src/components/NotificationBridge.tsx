import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../state/Store';
import { disableNudges, scheduleNudge, subscribeToNudges } from '../services/notifications';

export function NotificationBridge() {
  const { state, dispatch, openNudge } = useStore();
  useEffect(
    () =>
      subscribeToNudges((response) => {
        if (response.action === 'snuff') dispatch({ type: 'SNUFF_NUDGE', id: response.id });
        if (response.action === 'later')
          dispatch({ type: 'SNOOZE_NUDGE', id: response.id, until: Date.now() + 86400000 });
        if (response.action !== 'later') openNudge(response.id);
      }),
    [dispatch, openNudge],
  );
  useEffect(() => {
    if (!state.notificationsEnabled) disableNudges().catch(() => {});
  }, [state.notificationsEnabled]);
  useEffect(() => {
    if (Platform.OS === 'web' || !state.notificationsEnabled) return;
    for (const nudge of state.nudges)
      if (nudge.status === 'waiting' && nudge.dueAt && nudge.dueAt > Date.now())
        scheduleNudge(nudge, Math.max(1, Math.ceil((nudge.dueAt - Date.now()) / 1000))).catch(
          () => {},
        );
  }, [state.nudges, state.notificationsEnabled]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !state.notificationsEnabled) return;
    const pending = state.nudges
      .filter((n) => n.status === 'waiting' && n.dueAt !== null && n.dueAt > 0)
      .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0))[0];
    if (!pending) return;
    const timeout = setTimeout(
      () => {
        openNudge(pending.id);
        dispatch({ type: 'SNOOZE_NUDGE', id: pending.id, until: 0 });
      },
      Math.max(0, (pending.dueAt || 0) - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [state.nudges, state.notificationsEnabled, dispatch, openNudge]);
  return null;
}

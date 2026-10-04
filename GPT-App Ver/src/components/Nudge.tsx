import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../state/Store';
import { money } from '../state/model';
import { colors, palettes } from '../design/tokens';
import { celebrate, QuietButton, Sheet, T } from './ui';
import { Mascot } from './Mascot';
import { enableNudges, scheduleNudge, cancelNudge } from '../services/notifications';

export function NudgeSheet() {
  const { state, dispatch, activeNudge, openNudge } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const n = state.nudges.find((n) => n.id === activeNudge);
  const done = n?.status === 'snuffed';
  const close = useCallback(() => {
    openNudge(null);
    setError('');
  }, [openNudge]);
  const later = useCallback(async () => {
    if (!n) return;
    setBusy(true);
    setError('');
    try {
      const allowed = await enableNudges();
      if (!allowed) {
        setError('Allow notifications in your device settings to be reminded.');
        return;
      }
      await scheduleNudge(n, 86400);
      dispatch({ type: 'NOTIFICATIONS', enabled: true });
      dispatch({ type: 'SNOOZE_NUDGE', id: n.id, until: Date.now() + 86400000 });
      close();
    } catch {
      setError('This device couldn’t schedule the reminder.');
    } finally {
      setBusy(false);
    }
  }, [n, dispatch, close]);
  return (
    <Sheet visible={!!n} onClose={close}>
      <View style={{ alignItems: 'center' }}>
        <T variant="mono">SNUFF · A QUIET NUDGE</T>
        <Mascot hue={state.hue} size={122} calm={done} />
        <T variant="title" style={{ textAlign: 'center', fontSize: 35, lineHeight: 42 }}>
          {done ? money(n?.amount || 0) + ', kept.' : 'Want it now,\nor want it later?'}
        </T>
        <T variant="small" style={{ textAlign: 'center', marginTop: 14, marginBottom: 20 }}>
          {done
            ? 'A little more room for what matters.'
            : (n?.name || '') + ' · ' + money(n?.amount || 0)}
        </T>
      </View>
      {!!error && (
        <T variant="small" color={palettes.Crimson.body}>
          {error}
        </T>
      )}
      {done ? (
        <QuietButton
          onPress={() => {
            close();
            router.navigate('/');
          }}
        >
          Back to my day
        </QuietButton>
      ) : (
        <>
          <QuietButton
            disabled={busy}
            onPress={() => {
              if (!n) return;
              dispatch({ type: 'SNUFF_NUDGE', id: n.id });
              cancelNudge(n.id).catch(() => {});
              celebrate();
            }}
          >
            Snuff this urge
          </QuietButton>
          <QuietButton secondary disabled={busy} onPress={later}>
            Tomorrow, maybe
          </QuietButton>
          <T
            variant="small"
            color={colors.muted}
            style={{ textAlign: 'center', fontSize: 10, marginTop: 8 }}
          >
            A sample purchase. Savings are estimated.
          </T>
        </>
      )}
    </Sheet>
  );
}

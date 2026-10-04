import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { colors, Hue, palettes } from '../design/tokens';
import { useStore } from '../state/Store';
import { Canvas, Icon, Input, QuietButton, Sheet, T, tap } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { disableNudges, enableNudges, scheduleNudge } from '../services/notifications';

export default function Profile() {
  const { state, dispatch, openNudge, storageError } = useStore();
  const p = palettes[state.hue];
  const [sheet, setSheet] = useState<'name' | 'flame' | null>(null);
  const [name, setName] = useState(state.name);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      if (enabled) {
        const allowed = await enableNudges();
        if (!allowed) {
          setMessage('Notifications are off in your device settings.');
          return;
        }
      } else await disableNudges();
      dispatch({ type: 'NOTIFICATIONS', enabled });
    } catch {
      setMessage('This device couldn’t update notifications.');
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    const n = state.nudges.find((n) => n.status === 'waiting') || state.nudges[0];
    if (!n) return;
    if (n.status === 'snuffed') {
      openNudge(n.id);
      return;
    }
    setBusy(true);
    try {
      const allowed = await enableNudges();
      if (!allowed) {
        setMessage('Allow notifications in your device settings to try this.');
        return;
      }
      dispatch({ type: 'NOTIFICATIONS', enabled: true });
      await scheduleNudge(n, 5);
      dispatch({ type: 'SNOOZE_NUDGE', id: n.id, until: Date.now() + 5000 });
      setMessage('A quiet nudge arrives in five seconds.');
    } catch {
      setMessage('This device couldn’t schedule the nudge.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Canvas>
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 42 }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Mascot hue={state.hue} size={96} />
          <T variant="title" style={{ fontSize: 45, lineHeight: 56, marginTop: 7 }}>
            Snuff.
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="edit your name"
            onPress={() => {
              setName(state.name);
              setSheet('name');
            }}
            hitSlop={14}
            style={{ marginTop: 7 }}
          >
            <T variant="small">{state.name}</T>
          </Pressable>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 18,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Icon name="bell" color={p.body} size={18} />
          <T style={{ flex: 1, marginLeft: 13 }}>Notifications</T>
          <Switch
            accessibilityLabel="quiet notifications"
            value={state.notificationsEnabled}
            onValueChange={toggle}
            disabled={busy}
            trackColor={{ false: '#2B221D', true: p.deep }}
            thumbColor={state.notificationsEnabled ? p.body : colors.secondary}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="choose your flame"
          onPress={() => {
            tap();
            setSheet('flame');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 23,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.body }} />
          <T style={{ flex: 1, marginLeft: 15 }}>Your flame</T>
          <T variant="small" style={{ marginRight: 12 }}>
            {state.hue}
          </T>
          <Icon name="chevron-right" size={15} />
        </Pressable>
        <T variant="small" style={{ marginTop: 20, fontSize: 11 }}>
          Quiet nudges. Only when you need a little space.
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="try a nudge"
          disabled={busy}
          onPress={test}
          style={{ marginTop: 28, flexDirection: 'row', gap: 9, alignItems: 'center' }}
        >
          <Icon name="bell" size={14} />
          <T variant="small">Try a nudge</T>
        </Pressable>
        {!!message && (
          <T variant="small" style={{ marginTop: 20 }}>
            {message}
          </T>
        )}
        {storageError && (
          <T variant="small" style={{ marginTop: 12 }}>
            {storageError}
          </T>
        )}
        <View style={{ flex: 1 }} />
        <T variant="mono" style={{ textAlign: 'center', fontSize: 9 }}>
          SNUFF · ON-DEVICE DEMO
        </T>
        <Sheet visible={sheet === 'name'} title="Just you." onClose={() => setSheet(null)}>
          <Input label="Your name" value={name} onChangeText={setName} placeholder="Your name" />
          <QuietButton
            disabled={!name.trim()}
            onPress={() => {
              dispatch({ type: 'NAME', name });
              setSheet(null);
            }}
          >
            Done
          </QuietButton>
        </Sheet>
        <Sheet
          visible={sheet === 'flame'}
          title="Your kind of fire."
          onClose={() => setSheet(null)}
        >
          <View style={{ gap: 7 }}>
            {(Object.keys(palettes) as Hue[]).map((hue) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hue.toLowerCase() + ' flame'}
                accessibilityState={{ selected: state.hue === hue }}
                key={hue}
                onPress={() => {
                  tap();
                  dispatch({ type: 'HUE', hue });
                  setSheet(null);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
              >
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: palettes[hue].body,
                  }}
                />
                <T style={{ flex: 1 }}>{hue}</T>
                {hue === state.hue && <Icon name="check" color={palettes[hue].body} size={17} />}
              </Pressable>
            ))}
          </View>
        </Sheet>
      </View>
    </Canvas>
  );
}

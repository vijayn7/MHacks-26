import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { GlowSlider } from '../components/GlowSlider';
import { colors, Hue, palettes } from '../design/tokens';
import { useStore } from '../state/Store';
import { Canvas, Icon, Input, QuietButton, Sheet, T, tap } from '../components/ui';
import { FriendStrip } from '../components/FriendStrip';
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
  const second = palettes[state.blendHue];
  const restriction = state.burnRate < 34 ? 'gentle' : state.burnRate < 67 ? 'balanced' : 'mindful';
  const [colorTarget, setColorTarget] = useState<'base' | 'blend'>('base');
  const chooseColor = (target: 'base' | 'blend') => {
    tap();
    setColorTarget(target);
    setSheet('flame');
  };
  return (
    <Canvas>
      <View style={{ pointerEvents: 'none', ...StyleSheet.absoluteFill }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 390 760">
          <Defs>
            <RadialGradient id="profile-warm">
              <Stop offset="0" stopColor={p.edge} stopOpacity=".12" />
              <Stop offset="1" stopColor={p.edge} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="profile-dream">
              <Stop offset="0" stopColor={second.mid} stopOpacity=".09" />
              <Stop offset="1" stopColor={second.mid} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="25" cy="170" rx="270" ry="330" fill="url(#profile-warm)" />
          <Ellipse cx="360" cy="330" rx="230" ry="350" fill="url(#profile-dream)" />
        </Svg>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <View>
            <T variant="title" style={{ fontSize: 28 }}>
              make it yours.
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="edit your name"
            onPress={() => {
              setName(state.name);
              setSheet('name');
            }}
            hitSlop={12}
            style={s.name}
          >
            <T variant="small">{state.name}</T>
          </Pressable>
        </View>

        <View style={s.mascot}>
          <Mascot hue={state.hue} size={198} />
        </View>
        <View style={s.colorControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="choose your flame"
            onPress={() => chooseColor('base')}
            style={s.swatchHit}
          >
            <View style={[s.swatch, { backgroundColor: p.mid }]} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <GlowSlider
              label="flame color blend"
              value={state.blend}
              onChange={(value) => dispatch({ type: 'BLEND', value })}
              tint={second.body}
              startTint={p.mid}
              endTint={second.mid}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="choose your blend color"
            onPress={() => chooseColor('blend')}
            style={s.swatchHit}
          >
            <View style={[s.swatch, { backgroundColor: second.mid }]} />
          </Pressable>
        </View>
        <View style={s.colorLabels}>
          <T variant="small">{state.hue}</T>
          <T variant="small">{state.blendHue}</T>
        </View>

        <View style={s.burnCard}>
          <View style={s.row}>
            <T style={{ fontSize: 13 }}>burn rate</T>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <T variant="small">{restriction}</T>
              <T variant="small" color={colors.text}>
                {state.burnRate}%
              </T>
            </View>
          </View>
          <GlowSlider
            label="burn rate"
            value={state.burnRate}
            onChange={(value) => dispatch({ type: 'BURN_RATE', value })}
            glow
            tint={p.core}
          />
        </View>

        <FriendStrip />

        <View style={s.notifications}>
          <Icon name="bell" color={colors.text} size={21} />
          <View style={{ flex: 1, marginLeft: 13 }}>
            <T style={{ fontSize: 13 }}>gentle notifications</T>
          </View>
          <Pressable
            accessibilityRole="switch"
            aria-checked={state.notificationsEnabled}
            accessibilityLabel="quiet notifications"
            accessibilityState={{ checked: state.notificationsEnabled, disabled: busy }}
            disabled={busy}
            onPress={() => toggle(!state.notificationsEnabled)}
            style={{ width: 52, height: 44, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
          >
            <View
              style={{
                height: 30,
                borderRadius: 99,
                padding: 4,
                backgroundColor: state.notificationsEnabled ? palettes.Ember.core : '#352D2B',
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignSelf: state.notificationsEnabled ? 'flex-end' : 'flex-start',
                  backgroundColor: state.notificationsEnabled ? '#100A06' : colors.secondary,
                }}
              />
            </View>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="try a nudge"
          disabled={busy}
          onPress={test}
          style={{ alignSelf: 'center', padding: 10 }}
        >
          <T variant="small" style={{ fontSize: 11 }}>
            try a nudge
          </T>
        </Pressable>
        {!!message && (
          <T variant="small" style={{ textAlign: 'center', marginTop: 8 }}>
            {message}
          </T>
        )}
        {storageError && (
          <T variant="small" style={{ marginTop: 12 }}>
            {storageError}
          </T>
        )}
      </ScrollView>

      <Sheet visible={sheet === 'name'} title="just you." onClose={() => setSheet(null)}>
        <Input label="your name" value={name} onChangeText={setName} placeholder="your name" />
        <QuietButton
          disabled={!name.trim()}
          onPress={() => {
            dispatch({ type: 'NAME', name });
            setSheet(null);
          }}
        >
          done
        </QuietButton>
      </Sheet>
      <Sheet
        visible={sheet === 'flame'}
        title={colorTarget === 'base' ? 'your kind of fire.' : 'a little of both.'}
        onClose={() => setSheet(null)}
      >
        <View style={{ gap: 7 }}>
          {(Object.keys(palettes) as Hue[]).map((hue) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hue.toLowerCase() + ' flame'}
              accessibilityState={{
                selected: (colorTarget === 'base' ? state.hue : state.blendHue) === hue,
              }}
              key={hue}
              onPress={() => {
                tap();
                dispatch({ type: colorTarget === 'base' ? 'HUE' : 'BLEND_HUE', hue });
                setSheet(null);
              }}
              style={s.option}
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
              {hue === (colorTarget === 'base' ? state.hue : state.blendHue) && (
                <Icon name="check" color={palettes[hue].body} size={17} />
              )}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Canvas>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { maxWidth: 90, paddingVertical: 12 },
  mascot: { alignItems: 'center', marginTop: 2, marginBottom: 4 },
  colorControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 0,
  },
  swatchHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  burnCard: { marginTop: 32, paddingBottom: 12 },
  notifications: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
});

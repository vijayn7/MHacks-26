import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { GlowSlider } from '../components/GlowSlider';
import { colors, Hue, palettes } from '../design/tokens';
import { useStore } from '../state/Store';
import { Canvas, Icon, Input, QuietButton, Sheet, T, tap } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { disableNudges, enableNudges, scheduleNudge } from '../services/notifications';

export default function Profile() {
  const { state, dispatch, openNudge, storageError } = useStore();
  const p = palettes[state.hue];
  const { width } = useWindowDimensions();
  const [sheet, setSheet] = useState<'name' | 'flame' | 'friend' | null>(null);
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
  const friend = state.friends.find((item) => item.id === state.trustedFriendId);
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
              <Stop offset="0" stopColor={p.edge} stopOpacity=".22" />
              <Stop offset="1" stopColor={p.edge} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="profile-dream">
              <Stop offset="0" stopColor={second.mid} stopOpacity=".16" />
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
            <T variant="small" color={palettes.Ember.body}>
              your flame
            </T>
            <T variant="title" style={{ fontSize: 30, marginTop: 3 }}>
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

        <View style={s.flameCard}>
          <LinearGradient
            colors={[p.deep + '24', second.deep + '28', '#FFFFFF02']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.mascot}>
            <Mascot hue={state.hue} size={width < 360 ? 158 : 192} />
          </View>
          <View style={s.colorControls}>
            <T style={{ fontSize: 13 }}>
              {state.hue} + {state.blendHue}
            </T>
            <T variant="small" style={{ fontSize: 10 }}>
              {100 - state.blend}% warm · {state.blend}% dream
            </T>
            <View style={s.swatches}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="choose your flame"
                onPress={() => chooseColor('base')}
                style={s.swatchHit}
              >
                <View style={[s.swatch, { backgroundColor: p.mid }]} />
              </Pressable>
              <LinearGradient
                colors={[p.mid + '70', second.mid + '70']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, height: 3, borderRadius: 9 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="choose your blend color"
                onPress={() => chooseColor('blend')}
                style={s.swatchHit}
              >
                <View style={[s.swatch, { backgroundColor: second.mid }]} />
              </Pressable>
            </View>
            <GlowSlider
              label="flame color blend"
              value={state.blend}
              onChange={(value) => dispatch({ type: 'BLEND', value })}
              tint={second.body}
            />
            <T variant="small" style={{ fontSize: 11, marginTop: 4 }}>
              find your glow.
            </T>
          </View>
        </View>

        <View style={s.sectionLabel}>
          <T variant="small" color={colors.text}>
            restriction level
          </T>
          <T variant="small">{restriction}</T>
        </View>
        <View style={s.burnCard}>
          <View style={s.row}>
            <T>burn rate</T>
            <T variant="small">{state.burnRate}%</T>
          </View>
          <GlowSlider
            label="burn rate"
            value={state.burnRate}
            onChange={(value) => dispatch({ type: 'BURN_RATE', value })}
            glow
            tint={p.core}
          />
          <View style={s.row}>
            <T variant="small" color={colors.muted}>
              0%
            </T>
            <T variant="small" color={colors.muted}>
              100%
            </T>
          </View>
        </View>

        <View style={[s.sectionLabel, { marginTop: 32 }]}>
          <T variant="small" color={colors.text}>
            trusted friend
          </T>
          <T variant="small">a little support</T>
        </View>
        <View style={s.friendCard}>
          <View style={s.avatar}>
            {friend ? (
              <Mascot hue={friend.hue} size={48} companionId={friend.id} />
            ) : (
              <Icon name="users" size={21} />
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="choose trusted friend"
            onPress={() => setSheet('friend')}
            style={s.friendDetails}
          >
            <View style={{ flex: 1 }}>
              <T>{friend?.name ?? 'someone you trust'}</T>
              <T variant="small" style={{ fontSize: 11 }}>
                {' '}
                {friend ? 'a pause, together' : 'choose from your circle'}
              </T>
            </View>
            <View style={s.badge}>
              <T variant="small" color={palettes.Ember.core}>
                {friend ? 'trusted' : 'choose'}
              </T>
            </View>
          </Pressable>
        </View>

        <View style={s.notifications}>
          <Icon name="bell" color={colors.text} size={21} />
          <View style={{ flex: 1, marginLeft: 13 }}>
            <T style={{ fontSize: 13 }}>gentle notifications</T>
            <T variant="small" style={{ fontSize: 11 }}>
              only when your flame can help
            </T>
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
      <Sheet visible={sheet === 'friend'} title="your quiet circle." onClose={() => setSheet(null)}>
        <T variant="small" style={{ marginBottom: 18 }}>
          someone to pause with. the choice is always yours.
        </T>
        {state.friends.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={'trust ' + item.name.toLowerCase()}
            accessibilityState={{ selected: state.trustedFriendId === item.id }}
            onPress={() => {
              tap();
              dispatch({ type: 'TRUSTED_FRIEND', id: item.id });
              setSheet(null);
            }}
            style={s.option}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: palettes[item.hue].body,
              }}
            />
            <T style={{ flex: 1 }}>{item.name}</T>
            {state.trustedFriendId === item.id && (
              <Icon name="check" color={palettes.Ember.body} size={17} />
            )}
          </Pressable>
        ))}
        {!state.friends.length && (
          <T variant="small">add a friend in social to bring them into your circle.</T>
        )}
        <QuietButton
          secondary
          onPress={() => {
            dispatch({ type: 'TRUSTED_FRIEND', id: null });
            setSheet(null);
          }}
        >
          just me for now
        </QuietButton>
      </Sheet>
    </Canvas>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  name: { maxWidth: 90, paddingVertical: 12 },
  flameCard: {
    height: 216,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FFFFFF16',
    overflow: 'hidden',
  },
  mascot: { position: 'absolute', left: -25, bottom: -12 },
  colorControls: { marginLeft: '46%', marginRight: 16, paddingTop: 29 },
  swatches: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  swatchHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 27, height: 27, borderRadius: 14 },
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  burnCard: {
    backgroundColor: '#060404CC',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#070505D9',
    borderWidth: 1,
    borderColor: '#FFFFFF20',
  },
  avatar: { width: 48, height: 54, alignItems: 'center', justifyContent: 'center' },
  friendDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingLeft: 4,
  },
  badge: {
    borderWidth: 1,
    borderColor: palettes.Ember.body + '90',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  notifications: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
});

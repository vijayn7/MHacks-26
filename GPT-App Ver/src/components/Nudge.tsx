import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '../state/Store';
import { PurchaseInsights } from './PurchaseInsights';
import { supportLevel } from '../design/onboarding';
import { savedDate } from '../state/archive';
import { money, type Nudge } from '../state/model';
import { colors, palettes } from '../design/tokens';
import { blendPalette } from '../design/blend';
import { celebrate, Icon, QuietButton, T, tap } from './ui';
import { Mascot } from './Mascot';
import { enableNudges, scheduleNudge, cancelNudge } from '../services/notifications';
import { apiEnabled } from '../services/api';
import { fetchCheckIn, sendCheckIn } from '../services/checkin';

export function NudgeSheet() {
  const { state, activeNudge, openNudge } = useStore();
  const nudge = state.nudges.find((n) => n.id === activeNudge);
  return nudge ? <NudgePopup key={nudge.id} nudge={nudge} onClose={() => openNudge(null)} /> : null;
}

function NudgePopup({ nudge: n, onClose }: { nudge: Nudge; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const done = n.status === 'snuffed';
  const kept = n.status === 'kept';
  const saved = n.status === 'saved';
  const archived = state.archive.find((item) => item.id === n.id);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendId, setFriendId] = useState<string | null>(null);
  const friend = state.friends.find((f) => f.id === friendId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [friendReply, setFriendReply] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settled, setSettled] = useState(done);
  const [fade] = useState(() => new Animated.Value(done ? 1 : 0));
  const p = blendPalette(state.hue, state.blendHue, state.blend);
  const size = Math.min(246, Math.max(148, height * 0.29));
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReducedMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(fade, {
      toValue: done ? 1 : 0,
      duration: reducedMotion ? 0 : 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    const timeout = setTimeout(() => setSettled(done), reducedMotion ? 0 : 550);
    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [done, fade, reducedMotion]);
  useEffect(() => {
    if (!apiEnabled || checkInStatus !== 'sent' || friendReply) return;
    let stop = false;
    const tick = async () => {
      try {
        const row = await fetchCheckIn(n.id);
        if (!stop && row.status === 'replied' && row.reply) setFriendReply(row.reply);
      } catch {
        /* keep waiting quietly */
      }
    };
    const timer = setInterval(() => {
      void tick();
    }, 2000);
    void tick();
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [checkInStatus, friendReply, n.id]);
  const decide = (snuff: boolean) => {
    if (n.status !== 'waiting') return;
    dispatch({ type: snuff ? 'SNUFF_NUDGE' : 'KEEP_NUDGE', id: n.id });
    cancelNudge(n.id).catch(() => {});
    if (snuff) celebrate();
    else tap();
  };
  const askFriend = async () => {
    if (!friend || !apiEnabled || checkInStatus === 'sending' || checkInStatus === 'sent') return;
    setCheckInStatus('sending');
    try {
      await sendCheckIn(n.id, friend.name);
      setSentTo(friend.name);
      setCheckInStatus('sent');
    } catch {
      setCheckInStatus('error');
    }
  };
  const later = async () => {
    setBusy(true);
    setError('');
    try {
      if (!(await enableNudges())) {
        setError('allow notifications to be reminded.');
        return;
      }
      await scheduleNudge(n, 86400);
      dispatch({ type: 'NOTIFICATIONS', enabled: true });
      dispatch({ type: 'SNOOZE_NUDGE', id: n.id, until: Date.now() + 86400000 });
      onClose();
    } catch {
      setError('this device couldn’t schedule the reminder.');
    } finally {
      setBusy(false);
    }
  };
  const finish = () => {
    onClose();
    router.navigate('/');
  };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={[s.backdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="dismiss notification"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={done ? ['#171413', '#090808', '#050505'] : ['#1B100E', '#0D0808', '#050505']}
          style={[s.popup, { maxHeight: height - insets.top - insets.bottom - 32 }]}
        >
          <View style={s.top}>
            <T variant="mono">snuff · a quiet nudge</T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="close notification"
              onPress={onClose}
              style={s.close}
            >
              <Icon name="x" size={17} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            {friendsOpen ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="back to nudge"
                  onPress={() => {
                    setFriendsOpen(false);
                    setFriendId(null);
                  }}
                  style={s.back}
                >
                  <T variant="small">← back</T>
                </Pressable>
                <T variant="title" style={s.heading}>
                  {friend ? `a little help from\n${friend.name}.` : 'a little company.'}
                </T>
                {friend ? (
                  <>
                    <View style={s.center}>
                      <Mascot
                        companionId={friend.id}
                        companionName={friend.name}
                        hue={friend.hue}
                        size={150}
                      />
                    </View>
                    <T variant="mono" style={s.centerText}>
                      request preview
                    </T>
                    <T style={[s.centerText, { marginTop: 18 }]}>
                      i’m taking a moment before buying something. can you check in with me?
                    </T>
                    {apiEnabled ? (
                      <>
                        {checkInStatus === 'sent' || checkInStatus === 'sending' ? (
                          <T variant="small" style={[s.centerText, { marginTop: 24 }]}>
                            {checkInStatus === 'sending'
                              ? 'sending…'
                              : `sent to ${sentTo ?? friend.name}.`}
                          </T>
                        ) : (
                          <>
                            <QuietButton
                              onPress={() => {
                                void askFriend();
                              }}
                            >
                              send
                            </QuietButton>
                            {checkInStatus === 'error' && (
                              <T
                                variant="small"
                                color={palettes.Crimson.body}
                                style={[s.centerText, { marginTop: 12 }]}
                              >
                                couldn’t send right now
                              </T>
                            )}
                          </>
                        )}
                        {!!friendReply && (
                          <T variant="quote" style={[s.centerText, { marginTop: 22 }]}>
                            {friendReply}
                          </T>
                        )}
                      </>
                    ) : (
                      <T variant="small" style={[s.centerText, { marginTop: 24 }]}>
                        messaging isn’t connected yet. nothing has been sent.
                      </T>
                    )}
                    <QuietButton secondary onPress={() => setFriendId(null)}>
                      choose someone else
                    </QuietButton>
                  </>
                ) : state.friends.length ? (
                  <View style={{ marginTop: 22 }}>
                    {state.friends.map((f) => (
                      <View key={f.id} style={s.friend}>
                        <Mascot companionId={f.id} companionName={f.name} hue={f.hue} size={48} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`ask ${f.name.toLowerCase()}`}
                          onPress={() => {
                            tap();
                            setFriendId(f.id);
                          }}
                          style={{
                            flex: 1,
                            minHeight: 68,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <T style={{ flex: 1 }}>{f.name}</T>
                          <T color={colors.secondary}>›</T>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <>
                    <T variant="small" style={[s.centerText, { marginTop: 24 }]}>
                      bring someone into your quiet circle.
                    </T>
                    <QuietButton
                      onPress={() => {
                        onClose();
                        router.navigate('/social');
                      }}
                    >
                      connect with a friend
                    </QuietButton>
                  </>
                )}
              </>
            ) : (
              <>
                <Animated.View
                  testID="nudge-companion"
                  style={[
                    s.center,
                    {
                      opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }),
                      transform: [
                        {
                          scale: reducedMotion
                            ? 1
                            : fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }),
                        },
                      ],
                    },
                  ]}
                >
                  <Mascot
                    hue={state.hue}
                    size={size}
                    expression={done || kept || saved ? undefined : 'wistful'}
                    intensity={done ? (settled ? 'Out' : 'Low') : kept ? 'High' : undefined}
                  />
                </Animated.View>
                <View accessibilityLiveRegion="polite">
                  <T variant="title" style={s.heading}>
                    {done
                      ? 'a little quieter.'
                      : kept
                        ? 'your choice.'
                        : saved
                          ? 'saved for later.'
                          : supportLevel(state.burnRate).title}
                  </T>
                  <T variant="small" style={s.detail}>
                    {done
                      ? `${money(n.amount)}, kept.`
                      : kept
                        ? 'your flame is still with you.'
                        : `${n.name} · ${money(n.amount)}`}
                  </T>
                </View>
                {saved && archived && (
                  <T variant="small" style={s.centerText}>
                    saved {savedDate(archived.savedAt)}
                  </T>
                )}
                <PurchaseInsights nudge={n} />
                {!!friendReply && (
                  <T variant="quote" style={[s.centerText, { marginBottom: 18 }]}>
                    {friendReply}
                  </T>
                )}
                {!done && !kept && !saved ? (
                  <>
                    <View style={s.choices}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="yes, snuff this urge"
                        onPress={() => decide(true)}
                        style={({ pressed }) => [s.choice, s.yes, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <T>yes</T>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="no, keep my flame"
                        onPress={() => decide(false)}
                        style={({ pressed }) => [s.choice, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <LinearGradient
                          colors={[p.core, p.body]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFill, { borderRadius: 99 }]}
                        />
                        <T color={p.wash}>no</T>
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="save for later"
                      onPress={() => {
                        tap();
                        dispatch({ type: 'SAVE_FOR_LATER', id: n.id });
                        cancelNudge(n.id).catch(() => {});
                      }}
                      style={[s.ask, { marginTop: 12 }]}
                    >
                      <Icon name="bookmark" size={16} color={colors.text} />
                      <T color={colors.text}>save for later</T>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="ask a friend"
                      onPress={() => {
                        tap();
                        setFriendsOpen(true);
                      }}
                      style={[s.ask, { marginTop: 12, borderWidth: 0 }]}
                    >
                      <Icon name="users" size={16} color={colors.secondary} />
                      <T variant="small" color={colors.text}>
                        ask a friend
                      </T>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {saved && (
                      <>
                        <QuietButton
                          onPress={() => {
                            onClose();
                            router.navigate('/archive');
                          }}
                        >
                          view archive
                        </QuietButton>
                        <QuietButton
                          secondary
                          onPress={() => dispatch({ type: 'REVISIT_ITEM', id: n.id })}
                        >
                          revisit this item
                        </QuietButton>
                      </>
                    )}
                    <QuietButton secondary onPress={finish}>
                      back to my day
                    </QuietButton>
                    {kept && (
                      <QuietButton secondary disabled={busy} onPress={later}>
                        tomorrow, maybe
                      </QuietButton>
                    )}
                  </>
                )}
                {!!error && (
                  <T variant="small" color={palettes.Crimson.body} style={s.centerText}>
                    {error}
                  </T>
                )}
                <T variant="small" color={colors.muted} style={s.caption}>
                  a sample purchase. savings are estimated.
                </T>
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000B8',
    paddingHorizontal: 20,
  },
  popup: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#FFFFFF16',
    overflow: 'hidden',
    flexShrink: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 26,
    paddingRight: 12,
    paddingTop: 10,
  },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 26, paddingBottom: 28 },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  heading: { fontSize: 33, lineHeight: 40, textAlign: 'center', marginTop: 2 },
  detail: { textAlign: 'center', marginTop: 10, marginBottom: 28 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: {
    flex: 1,
    minHeight: 52,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  yes: { backgroundColor: '#262321', borderColor: '#FFFFFF1F', borderWidth: 1 },
  ask: {
    minHeight: 46,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#FFFFFF1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 25,
  },
  caption: { fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 22 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

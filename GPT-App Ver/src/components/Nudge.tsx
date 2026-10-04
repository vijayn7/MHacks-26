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
import { supportLevel } from '../design/onboarding';
import { savedDate } from '../state/archive';
import { money, type Nudge } from '../state/model';
import { colors } from '../design/tokens';
import { blendPalette } from '../design/blend';
import { celebrate, Icon, QuietButton, T, tap } from './ui';
import { Mascot } from './Mascot';
import { cancelNudge } from '../services/notifications';
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
  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [friendReply, setFriendReply] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settled, setSettled] = useState(kept);
  const [fade] = useState(() => new Animated.Value(kept ? 1 : 0));
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
      toValue: kept ? 1 : 0,
      duration: reducedMotion ? 0 : 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    const timeout = setTimeout(() => setSettled(kept), reducedMotion ? 0 : 550);
    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [kept, fade, reducedMotion]);
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
    if (!friend || checkInStatus === 'sending' || checkInStatus === 'sent') return;
    setCheckInStatus('sending');
    try {
      if (apiEnabled) await sendCheckIn(n.id, friend.name);
      setSentTo(friend.name);
      setCheckInStatus('sent');
    } catch {
      setCheckInStatus('error');
    }
  };
  const finish = () => {
    onClose();
    if (n.source !== 'sample store') router.navigate('/');
  };
  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View testID="purchase-takeover" style={s.backdrop}>
        <LinearGradient
          colors={kept ? ['#171413', '#090808', '#050505'] : ['#1B100E', '#0D0808', '#050505']}
          style={[s.popup, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={s.top}>
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
                  {friend ? `send to ${friend.name.toLowerCase()}?` : 'a little company.'}
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
                    <T style={[s.centerText, { marginTop: 18 }]}>
                      i’m taking a moment before buying something. can you check in with me?
                    </T>
                    {checkInStatus === 'sent' ? (
                      <>
                        <T variant="small" style={[s.centerText, { marginTop: 24 }]}>
                          {apiEnabled
                            ? `sent to ${sentTo ?? friend.name}.`
                            : 'demo complete · no message was sent.'}
                        </T>
                        {!!friendReply && (
                          <T variant="quote" style={s.centerText}>
                            {friendReply}
                          </T>
                        )}
                        <QuietButton
                          onPress={() => {
                            setFriendsOpen(false);
                            setFriendId(null);
                          }}
                        >
                          back to my purchase
                        </QuietButton>
                      </>
                    ) : (
                      <>
                        <QuietButton
                          disabled={checkInStatus === 'sending'}
                          onPress={() => {
                            void askFriend();
                          }}
                        >
                          {checkInStatus === 'sending' ? 'sending…' : 'yes, send'}
                        </QuietButton>
                        <QuietButton
                          secondary
                          disabled={checkInStatus === 'sending'}
                          onPress={() => setFriendId(null)}
                        >
                          no, go back
                        </QuietButton>
                        {checkInStatus === 'error' && (
                          <T variant="small" style={s.centerText}>
                            couldn’t send. please try again.
                          </T>
                        )}
                        {!apiEnabled && (
                          <T variant="small" style={[s.centerText, { marginTop: 12 }]}>
                            demo only · no message will be sent
                          </T>
                        )}
                      </>
                    )}
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
                    expression={done ? 'happy' : kept ? 'wistful' : saved ? undefined : 'wistful'}
                    intensity={kept ? (settled ? 'Out' : 'Low') : done ? 'High' : undefined}
                  />
                </Animated.View>
                <View accessibilityLiveRegion="polite">
                  <T variant="title" style={s.heading}>
                    {done
                      ? 'your flame thanks you.'
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
                        ? 'your flame needs a little rest.'
                        : `${n.name} · ${money(n.amount)}`}
                  </T>
                </View>
                {saved && archived && (
                  <T variant="small" style={s.centerText}>
                    saved {savedDate(archived.savedAt)}
                  </T>
                )}
                {!!friendReply && (
                  <T variant="quote" style={[s.centerText, { marginBottom: 18 }]}>
                    {friendReply}
                  </T>
                )}
                {!done && !kept && !saved ? (
                  <>
                    <T
                      variant="small"
                      style={{ textAlign: 'center', marginTop: -14, marginBottom: 24 }}
                    >
                      let this purchase go. keep the money for what matters.
                    </T>
                    <View style={s.choices}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="yes, snuff this urge"
                        onPress={() => decide(true)}
                        style={({ pressed }) => [s.choice, s.yes, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <LinearGradient
                          colors={[p.core, p.body]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFill, { borderRadius: 99 }]}
                        />
                        <T color={p.wash}>yes</T>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="ask a friend"
                        onPress={() => {
                          tap();
                          setFriendsOpen(true);
                        }}
                        style={[s.choice, s.yes, { flexDirection: 'row', gap: 7 }]}
                      >
                        <Icon name="users" size={16} color={colors.secondary} />
                        <T variant="small">ask a friend</T>
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
                      accessibilityLabel="no, keep my flame"
                      onPress={() => decide(false)}
                      style={[s.ask, { marginTop: 12, borderWidth: 0 }]}
                    >
                      <T variant="small" color={colors.secondary}>
                        no, continue purchase
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
                  </>
                )}
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
    backgroundColor: colors.bg,
  },
  popup: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    flexShrink: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 26,
    paddingRight: 12,
    paddingTop: 10,
  },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 28 },
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

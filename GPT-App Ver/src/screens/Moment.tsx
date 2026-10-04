import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/Store';
import { recentReading, type Feeling, type Moment as MomentData } from '../state/wearable';
import { colors } from '../design/tokens';
import { Icon, QuietButton, T } from '../components/ui';
import {
  FeelingAura,
  FeelingChoices,
  FeelingOrb,
  HeartScale,
  useQuietMotion,
} from '../components/WearableVisuals';
import { Mascot } from '../components/Mascot';

export default function Moment() {
  const { state, dispatch, openNudge } = useStore();
  const { event, nudge } = useLocalSearchParams<{ event?: string; nudge?: string }>();
  const saved = state.wearable.moments.find((m) => m.id === event);
  const purchase = state.nudges.find((n) => n.id === nudge);
  const [stage, setStage] = useState<'before' | 'during' | 'after'>(saved ? 'after' : 'before');
  const [before, setBefore] = useState<Feeling[]>(saved?.before || []);
  const [after, setAfter] = useState<Feeling[]>(saved?.after || []);
  const [intensity, setIntensity] = useState(saved?.intensity ?? 50);
  const [outcome, setOutcome] = useState<MomentData['outcome']>('saved');
  const [scenario, setScenario] = useState<'rise' | 'steady' | 'missing'>('rise');
  const [reading] = useState(() => recentReading(state.wearable));
  const [baseline] = useState(state.wearable.baseline);
  const insets = useSafeAreaInsets();
  const bpm = saved
    ? saved.bpm
    : reading && scenario !== 'missing'
      ? ([baseline || 68, scenario === 'rise' ? 92 : 71, scenario === 'rise' ? 79 : 72] as [
          number,
          number,
          number,
        ])
      : null;
  const current = bpm ? bpm[stage === 'before' ? 0 : stage === 'during' ? 1 : 2] : null;
  const pulse = useQuietMotion(current ? 60000 / current : 2000, !!current);
  const chosen = stage === 'after' ? after : before;
  const finish = () => {
    dispatch({
      type: 'SAVE_MOMENT',
      moment: {
        id: `moment-${Date.now()}`,
        at: Date.now(),
        name: purchase?.name || 'a spending moment',
        outcome,
        before,
        after,
        intensity,
        bpm,
        baseline: bpm ? baseline : null,
        simulated: true,
      },
    });
    if (purchase) {
      dispatch({
        type:
          outcome === 'saved'
            ? 'SAVE_FOR_LATER'
            : outcome === 'kept'
              ? 'KEEP_NUDGE'
              : 'SNUFF_NUDGE',
        id: purchase.id,
      });
    }
    router.back();
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 28, paddingBottom: 40 + insets.bottom }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="close moment"
            onPress={() => {
              router.back();
              if (purchase) openNudge(purchase.id);
            }}
            style={{ padding: 10 }}
          >
            <Icon name="x" />
          </Pressable>
          <T variant="small">{saved ? 'saved moment' : 'demo moment'}</T>
          <View style={{ width: 40 }} />
        </View>
        <Animated.View
          style={{
            alignItems: 'center',
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
            ],
          }}
        >
          {!!chosen.length && (
            <View pointerEvents="none" style={{ position: 'absolute', top: -35 }}>
              <FeelingAura selected={chosen} />
            </View>
          )}
          <Mascot hue={state.hue} size={120} />
        </Animated.View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginVertical: 14 }}
        >
          {(['before', 'during', 'after'] as const).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`${s} moment`}
              disabled={!saved && s === 'after'}
              onPress={() => setStage(s)}
              style={{ paddingVertical: 8 }}
            >
              <T color={stage === s ? colors.text : colors.muted} variant="small">
                {s}
              </T>
            </Pressable>
          ))}
        </View>
        <HeartScale bpm={current} baseline={saved ? saved.baseline : baseline} />
        {!!purchase && (
          <T variant="small" style={{ textAlign: 'center', fontSize: 11 }}>
            {purchase.name} · ${purchase.amount}
          </T>
        )}
        <T variant="title" style={{ fontSize: 28, textAlign: 'center', marginTop: 14 }}>
          {saved ? 'a moment, remembered.' : stage === 'after' ? 'and now?' : 'how does it feel?'}
        </T>
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <FeelingOrb
            selected={chosen}
            intensity={intensity}
            onIntensity={saved ? undefined : setIntensity}
            size={220}
          />
        </View>
        {saved && (
          <T variant="small" style={{ textAlign: 'center' }}>
            {chosen.length ? chosen.join(' + ') : 'no feelings recorded'}
          </T>
        )}
        {!saved && (
          <>
            <FeelingChoices value={chosen} onChange={stage === 'after' ? setAfter : setBefore} />
            <T variant="small" style={{ fontSize: 10, textAlign: 'center', marginTop: 12 }}>
              optional · drag the orb to blend
            </T>
          </>
        )}
        {current && baseline && current - baseline > 15 && (
          <T variant="small" style={{ textAlign: 'center', marginTop: 16 }}>
            above your baseline. a moment to pause?
          </T>
        )}
        <T variant="small" style={{ fontSize: 10, textAlign: 'center', marginTop: 16 }}>
          simulated sequence, not a measured response. feelings are yours to name.
        </T>
        {saved ? (
          <QuietButton onPress={() => router.back()}>done</QuietButton>
        ) : stage === 'after' ? (
          <>
            <QuietButton onPress={finish}>save check-in</QuietButton>
            <QuietButton
              secondary
              onPress={() => {
                router.back();
                if (purchase) {
                  dispatch({
                    type:
                      outcome === 'saved'
                        ? 'SAVE_FOR_LATER'
                        : outcome === 'kept'
                          ? 'KEEP_NUDGE'
                          : 'SNUFF_NUDGE',
                    id: purchase.id,
                  });
                }
              }}
            >
              skip check-in
            </QuietButton>
          </>
        ) : stage === 'before' ? (
          <>
            <QuietButton onPress={() => setStage('during')}>continue</QuietButton>
            <QuietButton
              secondary
              onPress={() => {
                setBefore([]);
                setStage('during');
              }}
            >
              skip feelings
            </QuietButton>
            <View
              style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}
            >
              {(['rise', 'steady', 'missing'] as const).map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={`${s} scenario`}
                  onPress={() => setScenario(s)}
                  style={{ padding: 8 }}
                >
                  <T variant="small" color={scenario === s ? colors.text : colors.muted}>
                    {s}
                  </T>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            {(['saved', 'kept', 'snuffed'] as const).map((o) => (
              <QuietButton
                key={o}
                secondary={o !== 'saved'}
                onPress={() => {
                  setOutcome(o);
                  setStage('after');
                }}
              >
                {o === 'saved'
                  ? 'save for later'
                  : o === 'kept'
                    ? 'continue purchase'
                    : 'let it go'}
              </QuietButton>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

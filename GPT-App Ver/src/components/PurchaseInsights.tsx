import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../state/Store';
import { type Nudge } from '../state/model';
import { recentReading, type Feeling } from '../state/wearable';
import { FeelingOrb } from './WearableVisuals';
import { T, Icon } from './ui';

const noEmotions: Feeling[] = [];

export function PurchaseInsights({ nudge }: { nudge: Nudge }) {
  const { state, dispatch } = useStore();
  const [now, setNow] = useState(Date.now);
  const w = state.wearable;
  const reading = recentReading(w, now);
  const emotions = reading ? w.reading?.emotions || noEmotions : noEmotions;
  const intensity = reading ? (w.reading?.intensity ?? 50) : 0;
  const latest = useRef({ reading, emotions, intensity, baseline: w.baseline });
  const recorded = w.moments.some((m) => m.id === `purchase-${nudge.id}`);
  useEffect(() => {
    if (nudge.status !== 'waiting') return;
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(refresh);
      clearInterval(timer);
    };
  }, [nudge.status, w.reading]);
  useEffect(() => {
    if (nudge.status === 'waiting') {
      latest.current = { reading, emotions, intensity, baseline: w.baseline };
      return;
    }
    const sample = latest.current;
    if (recorded || !sample.reading) return;
    dispatch({
      type: 'SAVE_MOMENT',
      moment: {
        id: `purchase-${nudge.id}`,
        at: Date.now(),
        name: nudge.name,
        outcome: nudge.status,
        before: sample.emotions,
        after: [],
        intensity: sample.intensity,
        bpm: [sample.reading, sample.reading, sample.reading],
        baseline: sample.baseline,
        simulated: true,
      },
    });
  }, [
    nudge.id,
    nudge.name,
    nudge.status,
    recorded,
    reading,
    emotions,
    intensity,
    w.baseline,
    dispatch,
  ]);
  if (nudge.status !== 'waiting') return null;
  return (
    <View
      testID="purchase-watch-context"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginVertical: 4,
      }}
    >
      <FeelingOrb selected={emotions} intensity={intensity} size={60} />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="heart" size={13} />
          <T variant="small">{reading ? `${reading} bpm` : '— bpm'}</T>
        </View>
        <T variant="small" style={{ fontSize: 11 }}>
          {reading
            ? emotions.length
              ? `${emotions.join(' + ')} · estimated`
              : 'emotion unavailable'
            : w.enabled
              ? 'waiting for watch'
              : 'watch not connected'}
        </T>
      </View>
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore } from '../state/Store';
import { type Nudge } from '../state/model';
import { recentReading, type Feeling } from '../state/wearable';
import { FeelingChoices, FeelingOrb } from './WearableVisuals';
import { T, Icon } from './ui';
import { colors } from '../design/tokens';

export function PurchaseInsights({ nudge }: { nudge: Nudge }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [reading] = useState(() => recentReading(state.wearable));
  const [baseline] = useState(state.wearable.baseline);
  const recorded = state.wearable.moments.some((m) => m.id === `purchase-${nudge.id}`);
  useEffect(() => {
    if (nudge.status === 'waiting' || recorded || (!feelings.length && !reading)) return;
    dispatch({
      type: 'SAVE_MOMENT',
      moment: {
        id: `purchase-${nudge.id}`,
        at: Date.now(),
        name: nudge.name,
        outcome: nudge.status,
        before: feelings,
        after: [],
        intensity: 50,
        bpm: reading ? [reading, reading, reading] : null,
        baseline: reading ? baseline : null,
        simulated: true,
      },
    });
  }, [nudge.id, nudge.name, nudge.status, recorded, feelings, reading, baseline, dispatch]);
  if (nudge.status !== 'waiting') return null;
  return (
    <View style={{ marginTop: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="how are you feeling"
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 8,
        }}
      >
        {reading && <Icon name="heart" size={13} />}
        <T variant="small">
          {reading ? `${reading} bpm · ` : ''}
          {feelings.length ? feelings.join(' + ') : 'how are you feeling?'}
        </T>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} />
      </Pressable>
      {open && (
        <View
          style={{
            gap: 8,
            marginBottom: 12,
            paddingTop: 8,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <FeelingOrb selected={feelings} size={74} />
          </View>
          <FeelingChoices value={feelings} onChange={setFeelings} />
        </View>
      )}
    </View>
  );
}

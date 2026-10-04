import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../state/Store';
import { dayKey } from '../state/model';
import { recentReading, type Feeling } from '../state/wearable';
import { FeelingChoices, FeelingOrb, HeartScale } from './WearableVisuals';
import { colors } from '../design/tokens';
import { QuietButton, T } from './ui';
export function WearableSummary() {
  const { state, dispatch } = useStore();
  const w = state.wearable;
  const [selected, setSelected] = useState<Feeling[]>(w.moments[0]?.before || []);
  const [intensity, setIntensity] = useState(w.moments[0]?.intensity ?? 50);
  const [saved, setSaved] = useState(false);
  const bpm = recentReading(w);
  const measured = w.moments.filter((m) => m.bpm && m.name !== 'daily check-in');
  const average = measured.length
    ? Math.round(measured.reduce((n, m) => n + m.bpm![1], 0) / measured.length)
    : null;
  return (
    <View
      testID="home-rhythm"
      style={{
        marginHorizontal: 28,
        paddingTop: 26,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}
    >
      <T variant="title" style={{ fontSize: 29 }}>
        a moment for you.
      </T>
      <T variant="small" style={{ marginTop: 8 }}>
        how are you feeling?
      </T>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <FeelingOrb
          selected={selected}
          intensity={intensity}
          size={224}
          onIntensity={(value) => {
            setIntensity(value);
            setSaved(false);
          }}
        />
      </View>
      <FeelingChoices
        value={selected}
        onChange={(value) => {
          setSelected(value);
          setSaved(false);
        }}
      />
      <T variant="small" style={{ textAlign: 'center', fontSize: 10, marginTop: 14 }}>
        drag to blend
      </T>
      {w.enabled ? (
        <HeartScale bpm={bpm} baseline={w.baseline} />
      ) : (
        <T variant="small" style={{ fontSize: 11, textAlign: 'center', marginTop: 24 }}>
          apple watch · connect in settings
        </T>
      )}
      {average && (
        <T variant="small" style={{ textAlign: 'center' }}>
          {average} bpm around purchases
        </T>
      )}
      <QuietButton
        disabled={!selected.length || saved}
        onPress={() => {
          dispatch({
            type: 'SAVE_MOMENT',
            moment: {
              id: `checkin-${dayKey(Date.now())}`,
              at: Date.now(),
              name: 'daily check-in',
              outcome: 'kept',
              before: selected,
              after: [],
              intensity,
              bpm: bpm ? [bpm, bpm, bpm] : null,
              baseline: bpm ? w.baseline : null,
              simulated: true,
            },
          });
          setSaved(true);
        }}
      >
        {saved ? 'saved' : 'save check-in'}
      </QuietButton>
      <T variant="small" style={{ fontSize: 10, textAlign: 'center', marginTop: 12 }}>
        just for you
      </T>
    </View>
  );
}

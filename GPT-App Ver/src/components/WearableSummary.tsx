import React from 'react';
import { View } from 'react-native';
import { useStore } from '../state/Store';
import { recentReading } from '../state/wearable';
import { FeelingOrb } from './WearableVisuals';
import { colors } from '../design/tokens';
import { T } from './ui';
export function WearableSummary() {
  const { state } = useStore();
  const w = state.wearable;
  const measured = w.moments.filter((m) => m.bpm);
  const bpm = recentReading(w);
  const average = measured.length
    ? Math.round(measured.reduce((n, m) => n + m.bpm![1], 0) / measured.length)
    : null;
  const last = w.moments[0];
  if (!w.enabled && !last) return null;
  return (
    <View
      testID="home-rhythm"
      style={{
        marginHorizontal: 28,
        paddingVertical: 18,
        borderTopWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <FeelingOrb selected={last?.before || []} size={54} />
      <View style={{ flex: 1 }}>
        <T variant="small">{last?.before.length ? last.before.join(' + ') : 'your rhythm'}</T>
        <T variant="small" style={{ fontSize: 11 }}>
          {average
            ? `${average} bpm around purchases`
            : bpm
              ? `${bpm} bpm · baseline ${w.baseline}`
              : 'no recent reading'}
        </T>
      </View>
      {average && w.baseline ? (
        <T variant="small">
          {average - w.baseline >= 0 ? '+' : ''}
          {average - w.baseline} bpm
        </T>
      ) : null}
    </View>
  );
}

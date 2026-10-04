import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../state/Store';
import { FeelingOrb } from './WearableVisuals';
import { colors } from '../design/tokens';
import { Icon, T } from './ui';
export function WearableSummary() {
  const { state } = useStore();
  const moments = state.wearable.moments;
  const measured = moments.filter((m) => m.bpm);
  const average = measured.length
    ? Math.round(measured.reduce((n, m) => n + m.bpm![1], 0) / measured.length)
    : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="your spending moments"
      onPress={() => router.push('/wearable')}
      style={{
        marginHorizontal: 28,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <FeelingOrb selected={moments[0]?.before || []} size={64} />
      <View style={{ flex: 1 }}>
        <T>your moments</T>
        <T variant="small">
          {average
            ? `${average} bpm · demo average`
            : moments.length
              ? `${moments.length} quiet check-ins`
              : 'a pulse. a feeling. a pause.'}
        </T>
      </View>
      <Icon name="chevron-right" size={16} />
    </Pressable>
  );
}

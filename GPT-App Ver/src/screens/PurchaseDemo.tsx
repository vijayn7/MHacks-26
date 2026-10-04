import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/Store';
import { SampleStore } from '../components/SampleStore';
export default function PurchaseDemo() {
  const { state, receivePurchase } = useStore();
  const insets = useSafeAreaInsets();
  const [id, setId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const result = state.nudges.find((n) => n.id === id);
  const outcome =
    result?.status === 'kept'
      ? 'purchase continued. no payment was made.'
      : result?.status === 'saved'
        ? 'saved to your snuff collection.'
        : result?.status === 'snuffed'
          ? 'purchase skipped. your sample savings were updated.'
          : message;
  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        backgroundColor: '#172330',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="back to snuff"
        onPress={() => router.replace('/profile')}
        style={{ padding: 12 }}
      >
        <Text style={{ color: '#fff', fontSize: 12 }}>‹ back to snuff</Text>
      </Pressable>
      <SampleStore
        amount={Math.max(149, state.purchaseRules.minAmount)}
        category={state.purchaseRules.categories[0] || 'tech & gadgets'}
        message={outcome}
        onPurchase={(amount, category) => {
          const next = `sample-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          setId(next);
          const matched = receivePurchase({
            id: next,
            name: 'studio headphones',
            amount,
            category,
            source: 'sample store',
          });
          setMessage(
            matched ? '' : 'outside your pause rules. purchase continued; no payment was made.',
          );
        }}
      />
    </View>
  );
}

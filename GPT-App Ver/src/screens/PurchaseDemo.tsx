import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Canvas, Icon, Input, QuietButton, T } from '../components/ui';
import { ItemArtwork } from '../components/ItemArtwork';
import { useStore } from '../state/Store';
import { matchesPurchase } from '../state/purchase-rules';
import { spendingCategories } from '../design/onboarding';
import { colors, palettes } from '../design/tokens';

export default function PurchaseDemo() {
  const { state, receivePurchase } = useStore();
  const rules = state.purchaseRules;
  const [amount, setAmount] = useState(String(Math.max(149, rules.minAmount)));
  const [category, setCategory] = useState(rules.categories[0] || 'tech & gadgets');
  const [id, setId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const p = palettes[state.hue];
  const valid = /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) <= 1000000;
  const matched = valid && matchesPurchase(rules, Number(amount), category);
  const result = state.nudges.find((n) => n.id === id);
  return (
    <Canvas>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back to profile"
          onPress={() => router.replace('/profile')}
          style={{ width: 44, height: 44, justifyContent: 'center' }}
        >
          <Icon name="arrow-left" />
        </Pressable>
        <T variant="title">a practice purchase.</T>
        <T variant="small">try your rules, then meet the pause. no payment is made.</T>
        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          <ItemArtwork name="studio headphones" size={160} />
        </View>
        <T>studio headphones</T>
        <T variant="small">purchase amount · usd</T>
        <Input
          numeric
          label="demo purchase amount"
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            setMessage('');
            setId(null);
          }}
        />
        <T variant="small">purchase category</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {spendingCategories.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityLabel={c}
              aria-checked={category === c}
              accessibilityState={{ checked: category === c }}
              onPress={() => {
                setCategory(c);
                setMessage('');
                setId(null);
              }}
              style={{
                padding: 10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: category === c ? p.body : colors.border,
              }}
            >
              <T style={{ fontSize: 12 }}>{c}</T>
            </Pressable>
          ))}
        </View>
        <T variant="small" color={p.body}>
          {!valid
            ? 'enter a valid amount.'
            : matched
              ? 'matches your rules · snuff will step in.'
              : 'outside your rules · no pause needed.'}
        </T>
        <QuietButton
          disabled={!valid}
          onPress={() => {
            const nextId = `demo-purchase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setId(nextId);
            setMessage(
              receivePurchase({
                id: nextId,
                name: 'studio headphones',
                amount: Number(amount),
                category,
                source: 'purchase demo',
              })
                ? ''
                : 'purchase would continue. no payment was made.',
            );
          }}
        >
          simulate purchase
        </QuietButton>
        {!matched && (
          <QuietButton
            secondary
            onPress={() => {
              setMessage('');
              setId(null);
              setAmount(String(Math.max(149, rules.minAmount)));
              setCategory(rules.categories[0] || 'tech & gadgets');
            }}
          >
            use a matching purchase
          </QuietButton>
        )}
        {!!message && <T variant="small">{message}</T>}
        {result && result.status !== 'waiting' && (
          <T variant="small">
            {result.status === 'saved'
              ? 'saved to your collection.'
              : result.status === 'snuffed'
                ? 'you opted out. your sample savings were updated.'
                : 'you chose to continue. no payment was made.'}
          </T>
        )}
        <T variant="small" style={{ fontSize: 10 }}>
          demo choices update this app’s local sample data. chrome score is unchanged.
        </T>
        <QuietButton secondary onPress={() => router.push('/onboarding?edit=1')}>
          refine with chat
        </QuietButton>
      </ScrollView>
    </Canvas>
  );
}

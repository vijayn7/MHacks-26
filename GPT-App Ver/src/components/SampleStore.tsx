import React from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import { ItemArtwork } from './ItemArtwork';
export function SampleStore({
  amount,
  onPurchase,
  category,
  message,
}: {
  amount: number;
  category: string;
  onPurchase: (amount: number, category: string) => void;
  message: string;
}) {
  return (
    <ScrollView
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 24, gap: 20 }}
    >
      <Text style={{ color: '#172330', fontSize: 28 }}>market · sample store</Text>
      <Text style={{ color: '#172330', fontSize: 24 }}>studio wireless headphones</Text>
      <ItemArtwork name="studio headphones" size={230} />
      <Text style={{ color: '#172330', fontSize: 32 }}>${amount}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="buy now"
        onPress={() => onPurchase(amount, category)}
        style={{ padding: 18, borderRadius: 24, backgroundColor: '#ffd447', alignItems: 'center' }}
      >
        <Text>buy now</Text>
      </Pressable>
      <Text style={{ color: '#172330' }}>{message}</Text>
      <Text style={{ color: '#657080' }}>demo store · no payment or order is placed.</Text>
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { View } from 'react-native';
import { SoftPressable as Pressable } from './SoftPressable';
import { Input, Icon, QuietButton, T } from './ui';
import { colors } from '../design/tokens';

const replies = [
  {
    text: 'i have a shopping addiction.',
    categories: ['clothes & beauty'],
    reply: 'thanks for sharing. let’s add a little space before shopping purchases.',
  },
  {
    text: 'i’m losing money from sports betting.',
    categories: ['sports betting'],
    reply:
      'let’s put a pause before betting purchases. you can choose how much support feels right.',
  },
  {
    text: 'i buy things without thinking.',
    categories: ['other'],
    reply: 'a moment before checkout can help you reconsider. let’s choose your pause rules.',
  },
  {
    text: 'i just want to save more.',
    categories: [],
    reply: 'let’s start with a simple purchase limit. you can adjust every suggestion.',
  },
];
export function OnboardingChat({
  categories,
  onCategories,
  onContinue,
  tint,
  current,
  onRefine,
}: {
  categories: string[];
  onCategories: (v: string[]) => void;
  onContinue: () => void;
  tint: string;
  current?: { amount: number; tone: number };
  onRefine?: (changes: { amount?: number; tone?: number }) => void;
}) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<{ text: string; user: boolean }[]>([]);
  const send = (text: string, selected?: (typeof replies)[number]) => {
    if (!text.trim()) return;
    // Local conversation adapter: no sensitive free text is uploaded or persisted.
    const inferred =
      selected?.categories ??
      (/bet|gambl/i.test(text)
        ? ['sports betting']
        : /shop|cloth|beauty/i.test(text)
          ? ['clothes & beauty']
          : []);
    onCategories([...new Set([...categories, ...inferred])]);
    const amountMatch = text.match(
      /(?:\$|over\s+|above\s+|limit\s+(?:to\s+)?)(\d+(?:\.\d{1,2})?)/i,
    );
    const amount =
      amountMatch && Number(amountMatch[1]) <= 1000000 ? Number(amountMatch[1]) : undefined;
    const tone = /less strict|gentler|lighter/i.test(text)
      ? 20
      : /more support|stricter|firmer/i.test(text)
        ? 85
        : undefined;
    if (amount !== undefined || tone !== undefined) onRefine?.({ amount, tone });
    setMessages((m) => [
      ...m,
      { text: text.trim().slice(0, 500), user: true },
      {
        text:
          amount !== undefined || tone !== undefined
            ? `i’ve drafted ${amount !== undefined ? `a $${amount} purchase threshold` : 'a ' + (tone === 20 ? 'gentler' : 'firmer') + ' reminder'}. review it next before saving.`
            : (selected?.reply ??
              'thanks for telling me. let’s find a level of support that feels right. you can refine the categories and limits next.'),
        user: false,
      },
    ]);
    setDraft('');
  };
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          padding: 18,
          borderRadius: 22,
          borderBottomLeftRadius: 5,
          backgroundColor: tint + '0D',
        }}
      >
        <T>{current ? 'what would you like to change?' : 'what brought you to snuffed?'}</T>
        <T variant="small" style={{ marginTop: 6 }}>
          {current
            ? `your current threshold is $${current.amount}. tell me what’s working, or what needs adjusting.`
            : 'tell me what you’d like a little help with.'}
        </T>
      </View>
      {messages.map((m, i) => (
        <View
          key={i}
          style={{
            alignSelf: m.user ? 'flex-end' : 'flex-start',
            maxWidth: '94%',
            borderRadius: 20,
            padding: 15,
            backgroundColor: m.user ? tint + '1A' : colors.surface,
          }}
        >
          <T style={{ fontSize: 14 }}>{m.text}</T>
        </View>
      ))}
      <View style={{ gap: 8 }}>
        {(current
          ? [
              {
                text: 'make my reminders gentler.',
                categories: [],
                reply: 'let’s ease the reminders.',
              },
              {
                text: 'i need more support.',
                categories: [],
                reply: 'let’s try a firmer reminder.',
              },
              ...replies.slice(0, 2),
            ]
          : replies
        ).map((reply) => (
          <Pressable
            key={reply.text}
            accessibilityRole="button"
            accessibilityLabel={reply.text}
            onPress={() => send(reply.text, reply)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 20,
            }}
          >
            <T style={{ fontSize: 13 }}>{reply.text}</T>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="your reply"
            value={draft}
            onChangeText={(v) => setDraft(v.slice(0, 500))}
            placeholder="or tell me in your own words"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="send reply"
          disabled={!draft.trim()}
          onPress={() => send(draft)}
          style={{
            width: 44,
            height: 44,
            marginBottom: 14,
            borderRadius: 22,
            backgroundColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: draft.trim() ? 1 : 0.3,
          }}
        >
          <Icon name="arrow-up" color={colors.bg} size={18} />
        </Pressable>
      </View>
      <QuietButton onPress={onContinue}>see suggested levels</QuietButton>
      <QuietButton secondary onPress={onContinue}>
        skip
      </QuietButton>
    </View>
  );
}

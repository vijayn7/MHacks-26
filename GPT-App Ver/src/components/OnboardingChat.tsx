import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { SoftPressable as Pressable } from './SoftPressable';
import { Input, Icon, QuietButton, T } from './ui';
import { useQuietMotion } from '../hooks/useQuietMotion';
import { colors } from '../design/tokens';
import { spendingCategories, supportLevel } from '../design/onboarding';
import type { PurchaseRules } from '../state/purchase-rules';
type Stage = 'reason' | 'amount' | 'tone' | 'categories' | 'review';
function Typing({ tint }: { tint: string }) {
  const pulse = useQuietMotion(1000);
  return (
    <View
      accessibilityLabel="snuffed is typing"
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        gap: 5,
        padding: 18,
        alignSelf: 'flex-start',
        borderRadius: 20,
        backgroundColor: colors.surface,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: tint,
            opacity: pulse.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: i === 1 ? [0.35, 1, 0.35] : [1, 0.35, 1],
            }),
          }}
        />
      ))}
    </View>
  );
}
export function OnboardingChat({
  existing,
  strength,
  editing,
  tint,
  onComplete,
  onActivity,
}: {
  onActivity?: () => void;
  existing: PurchaseRules;
  strength: number;
  editing: boolean;
  tint: string;
  onComplete: (rules: PurchaseRules, tone: number) => void;
}) {
  const [rules, setRules] = useState(existing);
  const [tone, setTone] = useState(strength);
  const [stage, setStage] = useState<Stage>('reason');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<
    {
      text: string;
      user: boolean;
    }[]
  >([]);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!messages.length) return;
    const frame = requestAnimationFrame(() => onActivity?.());
    return () => cancelAnimationFrame(frame);
  }, [messages.length, typing, onActivity]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const answer = (text: string, reply: string, next: Stage, update?: () => void) => {
    if (typing) return;
    setMessages((m) => [
      ...m,
      {
        text,
        user: true,
      },
    ]);
    setDraft('');
    setTyping(true);
    // Simulated response pacing only: no network request or hidden analysis.
    timer.current = setTimeout(() => {
      update?.();
      setMessages((m) => [
        ...m,
        {
          text: reply,
          user: false,
        },
      ]);
      setStage(next);
      setTyping(false);
    }, 750);
  };
  const send = (text: string) => {
    if (!text.trim() || typing) return;
    if (stage === 'amount') {
      const match =
        text.trim().match(/^(?:\$)?(\d+(?:\.\d{1,2})?)$/) ||
        text.match(/(?:\$|over\s+|above\s+)(\d+(?:\.\d{1,2})?)(?![\d.])/i);
      if (!match || Number(match[1]) > 1000000) {
        answer(
          text,
          'choose an amount from $0 to $1,000,000, with up to two decimal places.',
          'amount',
        );
        return;
      }
      const amount = Number(match[1]);
      answer(
        text,
        `got it. i’ll pause purchases at $${amount} or more. how should the reminder sound?`,
        'tone',
        () =>
          setRules((r) => ({
            ...r,
            amountEnabled: true,
            minAmount: amount,
          })),
      );
    } else if (stage === 'tone') {
      const nextTone = /gentl|soft|light/i.test(text)
        ? 20
        : /firm|strong|strict/i.test(text)
          ? 85
          : /balanc/i.test(text)
            ? 54
            : null;
      if (nextTone === null) {
        answer(text, 'would you prefer gentle, balanced, or firm wording?', 'tone');
        return;
      }
      answer(text, 'here’s what we’ve agreed on. does this feel right?', 'review', () =>
        setTone(nextTone),
      );
    } else {
      const categories = /bet|gambl/i.test(text)
        ? ['sports betting']
        : /shop|cloth|beauty/i.test(text)
          ? ['clothes & beauty']
          : [];
      const amount = text.match(/(?:\$|over\s+|above\s+)(\d+(?:\.\d{1,2})?)(?![\d.])/i);
      answer(
        text,
        'thanks for sharing. what purchase amount should make me step in? this is per item, not a monthly budget.',
        'amount',
        () =>
          setRules((r) => ({
            ...r,
            ...(amount && Number(amount[1]) <= 1000000
              ? {
                  minAmount: Number(amount[1]),
                }
              : {}),
            categories: [...new Set([...r.categories, ...categories])],
            categoryEnabled: r.categoryEnabled || categories.length > 0,
          })),
      );
    }
  };
  return (
    <View
      style={{
        gap: 14,
      }}
    >
      <View
        style={{
          padding: 18,
          borderRadius: 22,
          backgroundColor: tint + '0D',
        }}
      >
        <T>{editing ? 'what would you like to change?' : 'what brought you to snuffed?'}</T>
        <T
          variant="small"
          style={{
            marginTop: 6,
          }}
        >
          {editing
            ? `your current threshold is $${existing.minAmount}. we’ll refine it together before saving.`
            : 'tell me what you’d like a little help with.'}
        </T>
      </View>
      {messages.map((m, i) => (
        <View
          key={i}
          style={{
            alignSelf: m.user ? 'flex-end' : 'flex-start',
            maxWidth: '94%',
            padding: 15,
            borderRadius: 20,
            backgroundColor: m.user ? tint + '1A' : colors.surface,
          }}
        >
          <T
            style={{
              fontSize: 14,
            }}
          >
            {m.text}
          </T>
        </View>
      ))}
      {typing ? (
        <Typing tint={tint} />
      ) : (
        <>
          <View
            style={{
              gap: 8,
            }}
          >
            {stage === 'reason' &&
              [
                'i have a shopping addiction.',
                'i’m losing money from sports betting.',
                'i buy things without thinking.',
                'i just want to save more.',
              ].map((text) => (
                <ChatChoice key={text} text={text} onSelect={send} disabled={typing} />
              ))}
            {stage === 'amount' &&
              [...new Set([rules.minAmount, 25, 75, 150])].map((amount) => (
                <ChatChoice
                  key={`$${amount}`}
                  text={`$${amount}`}
                  onPress={() => send(String(amount))}
                  disabled={typing}
                />
              ))}
            {stage === 'tone' &&
              ['gentle', 'balanced', 'firm'].map((value) => (
                <ChatChoice key={value} text={value} onSelect={send} disabled={typing} />
              ))}
            {stage === 'categories' &&
              spendingCategories.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="checkbox"
                  accessibilityLabel={c}
                  aria-checked={rules.categories.includes(c)}
                  accessibilityState={{
                    checked: rules.categories.includes(c),
                  }}
                  onPress={() =>
                    setRules((r) => {
                      const categories = r.categories.includes(c)
                        ? r.categories.filter((v) => v !== c)
                        : [...r.categories, c];
                      return {
                        ...r,
                        categories,
                        categoryEnabled: categories.length > 0,
                      };
                    })
                  }
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: rules.categories.includes(c) ? tint : colors.border,
                  }}
                >
                  <T
                    style={{
                      fontSize: 13,
                    }}
                  >
                    {c}
                  </T>
                </Pressable>
              ))}
          </View>
          {stage === 'categories' && (
            <QuietButton
              onPress={() =>
                answer(
                  'these categories look right.',
                  'updated. shall we use these preferences?',
                  'review',
                )
              }
            >
              review preferences
            </QuietButton>
          )}
          {stage === 'review' ? (
            <>
              <View
                testID="chat-confirmation"
                style={{
                  padding: 18,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: tint + '50',
                  gap: 8,
                }}
              >
                <T>your pause, your rules.</T>
                <T variant="small">
                  {rules.amountEnabled
                    ? `$${rules.minAmount}+ per purchase`
                    : 'category-based purchases'}{' '}
                  · {supportLevel(tone).name} reminder
                </T>
                <T variant="small">
                  {rules.categoryEnabled
                    ? `${rules.categories.join(', ')} · ${rules.match === 'any' ? 'amount or category' : 'amount and category'}`
                    : 'all categories · amount rule only'}
                </T>
                <T variant="small">
                  when matched, snuff opens the flame overlay. reconsider, continue, or save for
                  later.
                </T>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {
                  <ChatChoice
                    key={'change amount'}
                    text={'change amount'}
                    onPress={() =>
                      answer('change my amount.', 'what amount should trigger a pause?', 'amount')
                    }
                    disabled={typing}
                  />
                }
                {
                  <ChatChoice
                    key={'change tone'}
                    text={'change tone'}
                    onPress={() => answer('change my tone.', 'gentle, balanced, or firm?', 'tone')}
                    disabled={typing}
                  />
                }
                {
                  <ChatChoice
                    key={'change categories'}
                    text={'change categories'}
                    onPress={() =>
                      answer(
                        'change my categories.',
                        'choose the categories you’d like help with. leave all unselected for amount only.',
                        'categories',
                      )
                    }
                    disabled={typing}
                  />
                }
                {rules.categoryEnabled && (
                  <ChatChoice
                    key={rules.match === 'any' ? 'require both rules' : 'use either rule'}
                    text={rules.match === 'any' ? 'require both rules' : 'use either rule'}
                    onPress={() =>
                      setRules((r) => ({
                        ...r,
                        match: r.match === 'any' ? 'all' : 'any',
                      }))
                    }
                    disabled={typing}
                  />
                )}
              </View>
              <QuietButton onPress={() => onComplete(rules, tone)}>confirm & continue</QuietButton>
              <T
                variant="small"
                style={{
                  fontSize: 10,
                }}
              >
                you can change these anytime. checkout connections are not live yet.
              </T>
            </>
          ) : (
            stage !== 'categories' && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Input
                    label="your reply"
                    value={draft}
                    onChangeText={(v) => setDraft(v.slice(0, 500))}
                    placeholder={stage === 'amount' ? 'enter a purchase amount' : 'your reply'}
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
                    opacity: draft.trim() ? 1 : 0.3,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="arrow-up" size={18} color={colors.bg} />
                </Pressable>
              </View>
            )
          )}
          {stage === 'reason' && (
            <QuietButton
              secondary
              onPress={() =>
                answer(
                  'use a starting point.',
                  'here’s a starting point. adjust anything before confirming.',
                  'review',
                )
              }
            >
              skip
            </QuietButton>
          )}
        </>
      )}
    </View>
  );
}
function ChatChoice({
  text,
  onPress,
  onSelect,
  disabled,
}: {
  text: string;
  onPress?: () => void;
  onSelect?: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      disabled={disabled}
      onPress={() => (onSelect ? onSelect(text) : onPress?.())}
      style={{
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
      }}
    >
      <T
        style={{
          fontSize: 13,
        }}
      >
        {text}
      </T>
    </Pressable>
  );
}

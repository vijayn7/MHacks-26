import React, { useState } from 'react';
import { View } from 'react-native';
import { SoftPressable as Pressable } from './SoftPressable';
import { Icon, Input, QuietButton, T } from './ui';
import { colors } from '../design/tokens';
import { spendingCategories, supportLevel } from '../design/onboarding';
import type { PurchaseRules } from '../state/purchase-rules';

type Level = {
  name: string;
  detail: string;
  amount: string;
  tone: number;
  categories: string[];
  match: 'any' | 'all';
};
function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <T style={{ fontSize: 12 }}>{label}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T variant="small">{value}</T>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} />
        </View>
      </Pressable>
      {open &&
        options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={option}
            accessibilityState={{ checked: option === value }}
            aria-checked={option === value}
            onPress={() => {
              onChange(option);
              setOpen(false);
            }}
            style={{
              padding: 12,
              backgroundColor: colors.surface,
              borderRadius: 12,
              marginBottom: 4,
            }}
          >
            <T style={{ fontSize: 13 }}>{option}</T>
          </Pressable>
        ))}
    </View>
  );
}
export function RestrictionSetup({
  categories,
  existing,
  strength,
  editing,
  tint,
  onComplete,
}: {
  categories: string[];
  existing: PurchaseRules;
  strength: number;
  editing: boolean;
  tint: string;
  onComplete: (rules: PurchaseRules, tone: number, demo?: boolean) => void;
}) {
  const [selected, setSelected] = useState(
    editing ? (strength < 34 ? 0 : strength < 67 ? 1 : 2) : 1,
  );
  const [expanded, setExpanded] = useState<number | null>(null);
  const [levels, setLevels] = useState<Level[]>(
    () =>
      [
        {
          name: 'light',
          detail: 'space for bigger purchases.',
          amount: '150',
          tone: 20,
          categories,
          match: 'all',
        },
        {
          name: 'balanced',
          detail: 'a pause for everyday impulses.',
          amount: '75',
          tone: 54,
          categories,
          match: 'any',
        },
        {
          name: 'strong',
          detail: 'step in earlier, with a firmer reminder.',
          amount: '25',
          tone: 85,
          categories,
          match: 'any',
        },
      ].map((l, i) =>
        editing && i === (strength < 34 ? 0 : strength < 67 ? 1 : 2)
          ? {
              ...l,
              amount: String(existing.minAmount),
              tone: strength,
              categories: existing.categoryEnabled ? existing.categories : [],
              match: existing.match,
            }
          : l,
      ) as Level[],
  );
  const update = (index: number, changes: Partial<Level>) =>
    setLevels((ls) => ls.map((l, i) => (i === index ? { ...l, ...changes } : l)));
  const chosen = levels[selected];
  const valid = /^\d+(\.\d{1,2})?$/.test(chosen.amount) && Number(chosen.amount) <= 1000000;
  const complete = (demo = false) =>
    onComplete(
      {
        amountEnabled: true,
        minAmount: Number(chosen.amount),
        categoryEnabled: chosen.categories.length > 0,
        categories: chosen.categories,
        match: chosen.match,
      },
      chosen.tone,
      demo,
    );
  return (
    <View style={{ gap: 12 }}>
      {levels.map((level, i) => (
        <View
          key={level.name}
          style={{
            borderWidth: 1,
            borderColor: selected === i ? tint + '80' : colors.border,
            backgroundColor: selected === i ? tint + '08' : 'transparent',
            borderRadius: 24,
            padding: 16,
          }}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${level.name} restriction`}
            accessibilityState={{ checked: selected === i }}
            aria-checked={selected === i}
            onPress={() => setSelected(i)}
            style={{ gap: 4, paddingVertical: 4 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <T variant="title" style={{ fontSize: 24 }}>
                {level.name}
              </T>
              {selected === i && <Icon name="check" color={tint} size={18} />}
            </View>
            <T variant="small">{level.detail}</T>
            <T style={{ fontSize: 12, marginTop: 8 }}>
              ${level.amount || '…'}+ · {supportLevel(level.tone).name} tone
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`adjust ${level.name}`}
            accessibilityState={{ expanded: expanded === i }}
            aria-expanded={expanded === i}
            onPress={() => {
              setSelected(i);
              setExpanded(expanded === i ? null : i);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
          >
            <T variant="small">adjust</T>
            <Icon name={expanded === i ? 'chevron-up' : 'chevron-down'} size={16} />
          </Pressable>
          {expanded === i && (
            <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 }}>
              <T variant="small">purchase amount · usd per item</T>
              <Input
                numeric
                label={`${level.name} purchase amount`}
                value={level.amount}
                onChangeText={(amount) => update(i, { amount })}
                placeholder="75"
              />
              <Dropdown
                label="reminder tone"
                value={supportLevel(level.tone).name}
                options={['gentle', 'balanced', 'firm']}
                onChange={(v) =>
                  update(i, { tone: v === 'gentle' ? 20 : v === 'balanced' ? 54 : 85 })
                }
              />
              <T variant="small" style={{ marginTop: 8, marginBottom: 8 }}>
                categories · optional
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {spendingCategories.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityRole="checkbox"
                    accessibilityLabel={c}
                    accessibilityState={{ checked: level.categories.includes(c) }}
                    aria-checked={level.categories.includes(c)}
                    onPress={() =>
                      update(i, {
                        categories: level.categories.includes(c)
                          ? level.categories.filter((v) => v !== c)
                          : [...level.categories, c],
                      })
                    }
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: level.categories.includes(c) ? tint : colors.border,
                      padding: 10,
                    }}
                  >
                    <T style={{ fontSize: 11 }}>{c}</T>
                  </Pressable>
                ))}
              </View>
              {!!level.categories.length && (
                <Dropdown
                  label="when to pause"
                  value={level.match === 'any' ? 'either rule' : 'both rules'}
                  options={['either rule', 'both rules']}
                  onChange={(v) => update(i, { match: v === 'either rule' ? 'any' : 'all' })}
                />
              )}
            </View>
          )}
        </View>
      ))}
      <T variant="small" style={{ marginTop: 8 }}>
        pause at ${chosen.amount || '…'} or more
        {chosen.categories.length
          ? `${chosen.match === 'any' ? ', or' : ','} in ${chosen.categories.join(', ')}`
          : ''}
        . reconsider, continue, or save for later.
      </T>
      <T variant="small" style={{ fontSize: 10 }}>
        tone changes the reminder, not the rules. these are editable suggestions, not a diagnosis.
        checkout connections are not live yet.
      </T>
      {!valid && (
        <T variant="small" color={tint}>
          enter $0–$1,000,000 with up to two decimal places.
        </T>
      )}
      <QuietButton disabled={!valid} onPress={() => complete()}>
        {editing ? 'save preferences' : 'start'}
      </QuietButton>
      <QuietButton secondary disabled={!valid} onPress={() => complete(true)}>
        save & try purchase demo
      </QuietButton>
    </View>
  );
}

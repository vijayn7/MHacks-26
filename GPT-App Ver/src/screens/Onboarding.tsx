import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../components/Mascot';
import { GlowSlider } from '../components/GlowSlider';
import { Icon, Input, QuietButton, T } from '../components/ui';
import { colors, palettes } from '../design/tokens';
import { spendingCategories, supportLevel } from '../design/onboarding';
import { validEmail } from '../state/model';
import { useStore } from '../state/Store';

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [step, setStep] = useState(edit === '1' && state.onboardingComplete ? 1 : -1);
  const [categories, setCategories] = useState(state.spendingCategories);
  const [strength, setStrength] = useState(state.burnRate);
  const [amount, setAmount] = useState(String(state.purchaseRules.minAmount));
  const [amountEnabled, setAmountEnabled] = useState(state.purchaseRules.amountEnabled);
  const [categoryEnabled, setCategoryEnabled] = useState(
    state.spendingCategories.length ? state.purchaseRules.categoryEnabled : true,
  );
  const [match, setMatch] = useState<'any' | 'all'>(state.purchaseRules.match);
  const hasCategories = categoryEnabled && categories.length > 0;
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) <= 1000000;
  const validRules = (!amountEnabled || validAmount) && (amountEnabled || hasCategories);
  const ruleSummary = [
    amountEnabled ? `$${validAmount ? Number(amount) : '…'} or more` : '',
    hasCategories ? `in ${categories.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(match === 'all' ? ' and ' : ' or ');
  const option = (label: string, selected: boolean, action: () => void) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={action}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <T style={{ fontSize: 14 }}>{label}</T>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: selected ? palettes[state.hue].body : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <Icon name="check" size={14} color={palettes[state.hue].body} />}
      </View>
    </Pressable>
  );
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState(
    state.onboardingComplete ? state.name.split(' ')[0] : '',
  );
  const [lastName, setLastName] = useState(
    state.onboardingComplete ? state.name.split(' ').slice(1).join(' ') : '',
  );
  const named = !!firstName.trim() && !!lastName.trim();
  const support = supportLevel(strength);
  const p = palettes[state.hue];
  const finish = () => {
    if (named) dispatch({ type: 'NAME', name: `${firstName.trim()} ${lastName.trim()}` });
    if (!validRules) return;
    dispatch({
      type: 'COMPLETE_ONBOARDING',
      categories,
      strength,
      rules: {
        amountEnabled,
        minAmount: Number(amount),
        categoryEnabled: hasCategories,
        categories,
        match,
      },
    });
    router.replace('/');
  };
  if (step === -1)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}
        >
          <Mascot hue={state.hue} size={Math.min(300, width - 40, height * 0.42)} />
          <T variant="title" style={{ fontSize: 48, lineHeight: 58, marginTop: 16 }}>
            snuffed
          </T>
          <T variant="small" style={{ marginTop: 8, textAlign: 'center' }}>
            snuff your impulse spending.
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="begin onboarding"
          onPress={() => setStep(0)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 38,
            alignSelf: 'center',
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-right" size={20} color={p.body} />
        </Pressable>
      </View>
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView
        key={step}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 440,
          alignSelf: 'center',
          paddingHorizontal: 24,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            height: 64,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="previous step"
            onPress={() => setStep(step - 1)}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            <Icon name="arrow-left" size={18} />
          </Pressable>
          <T variant="small">{step + 1} / 3</T>
        </View>
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Mascot
            hue={state.hue}
            size={step === 2 || height < 700 ? 80 : 112}
            intensity={step === 2 && strength < 34 ? 'Low' : undefined}
          />
        </View>
        <T variant="title" style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
          {step === 0 ? 'make space.' : step === 1 ? 'what pulls you in?' : 'your pause rules.'}
        </T>
        <T variant="small" style={{ textAlign: 'center', marginTop: 12, marginBottom: 24 }}>
          {step === 0
            ? 'sign in to snuffed.'
            : step === 1
              ? 'which purchases need a little more space?'
              : 'snuff interrupts matching purchases with a moment to reconsider.'}
        </T>
        {step === 0 ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <View style={{ flexDirection: width < 360 ? 'column' : 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <T variant="small">first name</T>
                <Input
                  label="first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="first name"
                />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="small">last name</T>
                <Input
                  label="last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="last name"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  email
                  label="email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email address"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="continue with email"
                disabled={!named || !validEmail(email)}
                onPress={() => setStep(1)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  marginBottom: 14,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: p.body,
                  opacity: !named || !validEmail(email) ? 0.3 : pressed ? 0.65 : 1,
                })}
              >
                <Icon name="arrow-right" size={18} color={p.wash} />
              </Pressable>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 10 }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <T variant="small">or</T>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>
            {(['google', 'apple', 'guest'] as const).map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={
                  name === 'guest' ? 'continue as guest' : `continue with ${name}`
                }
                disabled={!named}
                onPress={() => setStep(1)}
                style={({ pressed }) => ({
                  opacity: !named ? 0.4 : pressed ? 0.65 : 1,
                  minHeight: 50,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 44,
                })}
              >
                <View style={{ position: 'absolute', left: 20, width: 22, alignItems: 'center' }}>
                  {name === 'guest' ? (
                    <Icon name="user" size={18} color={colors.text} />
                  ) : (
                    <FontAwesome name={name} size={18} color={colors.text} />
                  )}
                </View>
                <T style={{ fontSize: 15 }}>
                  {name === 'guest' ? 'continue as guest' : `continue with ${name}`}
                </T>
              </Pressable>
            ))}
          </View>
        ) : step === 1 ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'space-between',
              }}
            >
              {spendingCategories.map((category) => {
                const chosen = categories.includes(category);
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="checkbox"
                    accessibilityLabel={category}
                    accessibilityState={{ checked: chosen }}
                    aria-checked={chosen}
                    onPress={() =>
                      setCategories(
                        chosen
                          ? categories.filter((c) => c !== category)
                          : [...categories, category],
                      )
                    }
                    style={{
                      width: '48%',
                      minHeight: 60,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 14,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: chosen ? p.body + '70' : colors.border,
                      backgroundColor: chosen ? p.body + '12' : 'transparent',
                    }}
                  >
                    <T
                      style={{ fontSize: 13, textAlign: 'center' }}
                      color={chosen ? p.body : colors.secondary}
                    >
                      {(
                        {
                          'clothes & beauty': 'shopping',
                          'tech & gadgets': 'tech',
                          'food & delivery': 'food',
                          'games & in-app purchases': 'gaming',
                        } as Record<string, string>
                      )[category] || category}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <T variant="small" style={{ marginTop: 22, textAlign: 'center', fontSize: 11 }}>
              next, choose when snuff steps in.
            </T>
            <View style={{ flex: 1, minHeight: 22 }} />
            <QuietButton onPress={() => setStep(2)}>continue</QuietButton>
            <QuietButton
              secondary
              onPress={() => {
                setCategories([]);
                setStep(2);
              }}
            >
              skip
            </QuietButton>
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              {option('use a purchase amount', amountEnabled, () =>
                setAmountEnabled(!amountEnabled),
              )}
              {amountEnabled && (
                <>
                  <Input
                    numeric
                    label="purchase amount in dollars"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="50"
                  />
                  <T variant="small" style={{ fontSize: 11 }}>
                    usd per item · at or above this amount, not a monthly budget.
                  </T>
                  {!validAmount && (
                    <T variant="small" color={p.body}>
                      enter $0–$1,000,000, with up to two decimal places.
                    </T>
                  )}
                </>
              )}
              {categories.length > 0 ? (
                <>
                  {option('use selected categories', hasCategories, () =>
                    setCategoryEnabled(!categoryEnabled),
                  )}
                  <T variant="small" style={{ fontSize: 11 }}>
                    {categories.join(' · ')}
                  </T>
                </>
              ) : (
                <QuietButton secondary onPress={() => setStep(1)}>
                  choose categories
                </QuietButton>
              )}
              {amountEnabled && hasCategories && (
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
                  {(['any', 'all'] as const).map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={value === 'any' ? 'either rule' : 'both rules'}
                      accessibilityState={{ checked: match === value }}
                      onPress={() => setMatch(value)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 24,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: match === value ? p.body : colors.border,
                        backgroundColor: match === value ? p.body + '12' : 'transparent',
                      }}
                    >
                      <T style={{ fontSize: 13 }}>
                        {value === 'any' ? 'either rule' : 'both rules'}
                      </T>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <View
              style={{
                borderTopWidth: 1,
                borderColor: colors.border,
                paddingTop: 20,
                marginTop: 20,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T style={{ fontSize: 14 }}>reminder tone</T>
                <T color={p.body} style={{ fontSize: 14 }}>
                  {support.name}
                </T>
              </View>
              <GlowSlider
                label="popup strength"
                value={strength}
                onChange={setStrength}
                glow
                tint={p.body}
              />
              <T variant="small" style={{ fontSize: 12 }}>
                {support.detail} tone changes the wording and flame, not your rules.
              </T>
            </View>
            <View
              style={{
                marginTop: 24,
                padding: 18,
                borderRadius: 20,
                backgroundColor: p.body + '08',
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <T style={{ fontSize: 14 }}>
                when a purchase is {ruleSummary || 'outside your rules'}…
              </T>
              <T variant="small" style={{ fontSize: 12 }}>
                snuff opens a pause with your flame, heart rate, and emotion estimate. reconsider,
                continue, or save it for later.
              </T>
            </View>
            <T variant="small" style={{ fontSize: 10, textAlign: 'center', marginTop: 16 }}>
              rules apply to purchases received by snuff. checkout connections are not live yet.
              change your rules anytime in settings.
            </T>
            {!validRules && (
              <T variant="small" color={p.body} style={{ marginTop: 12 }}>
                choose at least one valid rule to continue.
              </T>
            )}
            <QuietButton disabled={!validRules} onPress={finish}>
              start
            </QuietButton>
          </>
        )}
      </ScrollView>
    </View>
  );
}

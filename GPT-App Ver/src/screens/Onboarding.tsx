import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../components/Mascot';
import { GlowSlider } from '../components/GlowSlider';
import { Icon, Input, QuietButton, Sheet, T } from '../components/ui';
import { colors, palettes } from '../design/tokens';
import { spendingCategories, supportLevel } from '../design/onboarding';
import { validEmail } from '../state/model';
import { useStore } from '../state/Store';

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [step, setStep] = useState(edit === '1' && state.onboardingComplete ? 1 : 0);
  const [categories, setCategories] = useState(state.spendingCategories);
  const [strength, setStrength] = useState(state.burnRate);
  const [provider, setProvider] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const support = supportLevel(strength);
  const p = palettes[state.hue];
  const finish = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING', categories, strength });
    router.replace('/');
  };
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
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 }}
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
            accessibilityLabel={step ? 'previous step' : 'snuff'}
            disabled={!step}
            onPress={() => setStep(step - 1)}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            {step ? (
              <Icon name="arrow-left" size={18} />
            ) : (
              <T variant="title" style={{ fontSize: 24 }}>
                snuff.
              </T>
            )}
          </Pressable>
          <T variant="small">{step + 1} / 3</T>
        </View>
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Mascot
            hue={state.hue}
            size={step === 0 ? 210 : 158}
            intensity={step === 2 && strength < 34 ? 'Low' : undefined}
          />
        </View>
        <T variant="title" style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
          {step === 0
            ? 'a little space\nbefore you spend.'
            : step === 1
              ? 'where do you\nget carried away?'
              : 'how much of\na nudge?'}
        </T>
        <T variant="small" style={{ textAlign: 'center', marginTop: 12, marginBottom: 24 }}>
          {step === 0
            ? 'meet your flame. find your pause.'
            : step === 1
              ? 'pick what feels familiar. no judgment.'
              : 'your flame follows your pace. change this anytime.'}
        </T>
        {step === 0 ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            {['google', 'apple', 'email'].map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`continue with ${name}`}
                onPress={() => (name === 'email' ? setProvider(name) : setStep(1))}
                style={{
                  minHeight: 54,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                <T style={{ fontSize: 15 }}>continue with {name}</T>
              </Pressable>
            ))}
            <QuietButton secondary onPress={() => setStep(1)}>
              try without an account
            </QuietButton>
            <T variant="small" style={{ textAlign: 'center', fontSize: 10 }}>
              demo sign-in · no account is created
            </T>
          </View>
        ) : step === 1 ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: chosen ? p.body + '70' : colors.border,
                      backgroundColor: chosen ? p.body + '12' : 'transparent',
                    }}
                  >
                    <T style={{ fontSize: 13 }} color={chosen ? p.body : colors.secondary}>
                      {category}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <T variant="small" style={{ marginTop: 22, textAlign: 'center', fontSize: 11 }}>
              optional · saved only on this device
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
              prefer not to say
            </QuietButton>
          </>
        ) : (
          <>
            <T color={p.body} style={{ textAlign: 'center', marginBottom: 8 }}>
              {support.name}
            </T>
            <GlowSlider
              label="popup strength"
              value={strength}
              onChange={setStrength}
              glow
              tint={p.body}
            />
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 }}
            >
              <T variant="small">gentle</T>
              <T variant="small">firm</T>
            </View>
            <View
              style={{
                borderRadius: 24,
                padding: 22,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <T variant="small" style={{ fontSize: 10, marginBottom: 10 }}>
                your popup · preview
              </T>
              <T variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
                {support.title}
              </T>
              <T variant="small" style={{ marginTop: 8 }}>
                {support.detail}
              </T>
            </View>
            <T variant="small" style={{ textAlign: 'center', fontSize: 11, marginTop: 16 }}>
              a reminder, never a lock. you’re always in control.
            </T>
            <View style={{ flex: 1, minHeight: 20 }} />
            <QuietButton onPress={finish}>meet your snuff</QuietButton>
          </>
        )}
      </ScrollView>
      <Sheet
        visible={!!provider}
        title={`continue with ${provider || 'an account'}`}
        onClose={() => setProvider(null)}
      >
        <Input
          email
          label="email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />
        <T variant="small">demo only. no email is sent or saved.</T>
        <QuietButton
          disabled={!validEmail(email)}
          onPress={() => {
            setProvider(null);
            setStep(1);
          }}
        >
          continue
        </QuietButton>
      </Sheet>
    </View>
  );
}

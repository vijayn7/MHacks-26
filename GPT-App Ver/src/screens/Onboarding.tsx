import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
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
  const { width, height } = useWindowDimensions();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [step, setStep] = useState(edit === '1' && state.onboardingComplete ? 1 : -1);
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Mascot hue={state.hue} size={Math.min(300, width - 40, height * 0.48)} />
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
            size={128}
            intensity={step === 2 && strength < 34 ? 'Low' : undefined}
          />
        </View>
        <T variant="title" style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
          {step === 0 ? 'make space.' : step === 1 ? 'what pulls you in?' : 'find your balance.'}
        </T>
        <T variant="small" style={{ textAlign: 'center', marginTop: 12, marginBottom: 24 }}>
          {step === 0
            ? 'sign in to snuff.'
            : step === 1
              ? 'choose any. or skip.'
              : 'a little nudge, or a firmer pause.'}
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
                  backgroundColor: 'transparent',
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
              continue as guest
            </QuietButton>
            <T variant="small" style={{ textAlign: 'center', fontSize: 10 }}>
              demo sign-in
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
              private to this device
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
                paddingVertical: 24,
                borderTopWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <T variant="small" style={{ fontSize: 10, marginBottom: 10 }}>
                popup preview
              </T>
              <T variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
                {support.title}
              </T>
            </View>
            <T variant="small" style={{ textAlign: 'center', fontSize: 11, marginTop: 16 }}>
              change this anytime.
            </T>
            <View style={{ flex: 1, minHeight: 20 }} />
            <QuietButton onPress={finish}>start</QuietButton>
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

import { SoftPressable as Pressable } from '../components/SoftPressable';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../components/Mascot';
import { OnboardingChat } from '../components/OnboardingChat';
import { OrangeMeshBackground } from '../components/OrangeMeshBackground';
import type { PurchaseRules } from '../state/purchase-rules';
import { Icon, Input, T } from '../components/ui';
import { colors, palettes } from '../design/tokens';
import { validEmail } from '../state/model';
import { useStore } from '../state/Store';

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [step, setStep] = useState(edit === '1' && state.onboardingComplete ? 1 : -1);
  const [fade] = useState(() => new Animated.Value(1));
  const transitioning = useRef(false);
  const chatScroll = useRef<ScrollView>(null);
  const reduced = useRef(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) reduced.current = value;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
    });
    return () => {
      active = false;
      sub.remove();
      fade.stopAnimation();
    };
  }, [fade]);
  const transition = (change: () => void) => {
    if (transitioning.current) return;
    if (reduced.current) {
      change();
      return;
    }
    transitioning.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!finished) {
        transitioning.current = false;
        return;
      }
      change();
      transitioning.current = false;
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        transitioning.current = false;
      });
    });
  };
  const goTo = (next: number) => transition(() => setStep(next));
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState(
    state.onboardingComplete ? state.name.split(' ')[0] : '',
  );
  const [lastName, setLastName] = useState(
    state.onboardingComplete ? state.name.split(' ').slice(1).join(' ') : '',
  );
  const named = !!firstName.trim() && !!lastName.trim();
  const p = palettes[state.hue];
  const finish = (rules: PurchaseRules, strength: number) => {
    if (named) dispatch({ type: 'NAME', name: `${firstName.trim()} ${lastName.trim()}` });
    dispatch({ type: 'COMPLETE_ONBOARDING', categories: rules.categories, strength, rules });
    transition(() => router.replace(edit === '1' ? '/profile' : '/'));
  };
  if (step === -1)
    return (
      <Animated.View
        style={{
          opacity: fade,
          flex: 1,
          backgroundColor: '#0C0401',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          overflow: 'hidden',
        }}
      >
        <OrangeMeshBackground />
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
          onPress={() => goTo(0)}
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
            backgroundColor: '#00000055',
          }}
        >
          <Icon name="arrow-right" size={20} color={p.body} />
        </Pressable>
      </Animated.View>
    );

  return (
    <Animated.View
      style={{
        opacity: fade,
        flex: 1,
        backgroundColor: '#0C0401',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        overflow: 'hidden',
      }}
    >
      <OrangeMeshBackground />
      <ScrollView
        ref={chatScroll}
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
            onPress={() =>
              edit === '1' && step === 1
                ? transition(() => router.replace('/profile'))
                : goTo(step - 1)
            }
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            <Icon name="arrow-left" size={18} />
          </Pressable>
          <T variant="small">{step + 1} / 2</T>
        </View>
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Mascot hue={state.hue} size={step === 2 || height < 700 ? 80 : 112} />
        </View>
        <T variant="title" style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
          {step === 0 ? 'make space.' : 'let’s talk.'}
        </T>
        <T variant="small" style={{ textAlign: 'center', marginTop: 12, marginBottom: 24 }}>
          {step === 0
            ? 'sign in to snuffed.'
            : step === 1
              ? 'a little context, a better starting point.'
              : 'three starting points. every detail is yours to change.'}
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
                onPress={() => goTo(1)}
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
                onPress={() => goTo(1)}
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
        ) : (
          <OnboardingChat
            existing={state.purchaseRules}
            strength={state.burnRate}
            editing={edit === '1'}
            tint={p.body}
            onComplete={finish}
            onActivity={() => chatScroll.current?.scrollToEnd({ animated: !reduced.current })}
          />
        )}
      </ScrollView>
    </Animated.View>
  );
}

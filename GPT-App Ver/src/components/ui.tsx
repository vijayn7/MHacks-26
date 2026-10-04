import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, palettes } from '../design/tokens';
import { useStore } from '../state/Store';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};
export const celebrate = () => {
  if (Platform.OS !== 'web')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export function Icon({
  name,
  size = 20,
  color = colors.secondary,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function T({
  children,
  variant = 'body',
  color,
  style,
}: React.PropsWithChildren<{
  variant?: 'body' | 'small' | 'title' | 'quote' | 'mono';
  color?: string;
  style?: TextStyle | TextStyle[];
}>) {
  return (
    <Text
      style={[
        s.text,
        variant === 'small' && s.small,
        variant === 'title' && s.title,
        variant === 'quote' && s.quote,
        variant === 'mono' && s.mono,
        color ? { color } : null,
        style,
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === 'string' ? child.toLowerCase() : child,
      )}
    </Text>
  );
}
export function Canvas({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 100 + insets.bottom }}>
      <LinearGradient colors={['#000000', '#0B0302', '#000000']} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  contentKey,
  expanded = false,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  contentKey?: number | string;
  expanded?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="dismiss sheet"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: '#00000099' }]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '86%',
            height: expanded ? '86%' : undefined,
          }}
        >
          <LinearGradient
            colors={['#24150F', '#130A07', '#0B0302']}
            style={{
              flex: expanded ? 1 : undefined,
              flexShrink: 1,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 28,
              paddingTop: 14,
              paddingBottom: 26 + insets.bottom,
            }}
          >
            <View
              style={{
                width: 30,
                height: 3,
                borderRadius: 9,
                backgroundColor: colors.muted,
                opacity: 0.5,
                alignSelf: 'center',
                marginBottom: 22,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}>
              {title && (
                <T variant="title" style={{ flex: 1, fontSize: 34 }}>
                  {title}
                </T>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="close sheet"
                hitSlop={14}
                onPress={onClose}
                style={{ marginLeft: 'auto' }}
              >
                <Icon name="x" size={18} />
              </Pressable>
            </View>
            <ScrollView
              key={contentKey}
              style={{ flexShrink: 1, minHeight: 0 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
export function QuietButton({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: React.PropsWithChildren<{ onPress: () => void; disabled?: boolean; secondary?: boolean }>) {
  const { state } = useStore();
  const p = palettes[state.hue];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children.toLowerCase() : undefined}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.7 : 1, marginTop: 14 })}
    >
      {secondary ? (
        <T style={{ textAlign: 'center', paddingVertical: 12 }} color={colors.secondary}>
          {children}
        </T>
      ) : (
        <LinearGradient
          colors={[p.core, p.body, p.mid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 99 }}
        >
          <T color={p.wash} style={{ fontFamily: fonts.medium }}>
            {children}
          </T>
        </LinearGradient>
      )}
    </Pressable>
  );
}
export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  email = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  placeholder?: string;
  email?: boolean;
}) {
  return (
    <TextInput
      accessibilityLabel={label.toLowerCase()}
      value={value.toLowerCase()}
      onChangeText={(text) => onChangeText(text.toLowerCase())}
      placeholder={placeholder?.toLowerCase()}
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      keyboardType={email ? 'email-address' : 'default'}
      style={{
        color: colors.text,
        fontFamily: fonts.body,
        fontSize: 18,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#FFFFFF26',
        marginBottom: 14,
      }}
    />
  );
}
const s = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.text },
  small: { fontSize: 12, lineHeight: 18, color: colors.secondary },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  quote: { fontFamily: fonts.italic, fontSize: 24, lineHeight: 31 },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.7,
    color: colors.muted,
  },
});

import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable } from 'react-native';
import { ItemArtwork } from './ItemArtwork';

export function ArchiveObject({
  name,
  label,
  size,
  reduce,
  onPress,
}: {
  name: string;
  label: string;
  size: number;
  reduce: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const active = hovered || focused || pressed;
  useEffect(() => {
    const motion = Animated.timing(scale, {
      // Keep hover zoom subtle — Archive already magnifies the focused card heavily.
      toValue: active ? 1.06 : 1,
      duration: reduce ? 0 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    motion.start();
    return () => motion.stop();
  }, [active, reduce, scale]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        pointerEvents="none"
        testID="archive-object-zoom"
        style={{ transform: [{ scale }] }}
      >
        <ItemArtwork name={name} size={size} />
      </Animated.View>
    </Pressable>
  );
}

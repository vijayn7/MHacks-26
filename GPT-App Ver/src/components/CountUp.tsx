import React from 'react';
import { Animated, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { T } from './ui';

type Props = {
  children: React.ReactNode;
  opacity: Animated.Value;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle | TextStyle[];
  color?: string;
  variant?: React.ComponentProps<typeof T>['variant'];
  testID?: string;
};

/** Fades a counting value in while the parent drives the numeric text. */
export function CountUpText({
  children,
  opacity,
  style,
  textStyle,
  color,
  variant = 'title',
  testID,
}: Props) {
  return (
    <Animated.View testID={testID} style={[{ opacity }, style]}>
      <T variant={variant} color={color} style={textStyle}>
        {children}
      </T>
    </Animated.View>
  );
}

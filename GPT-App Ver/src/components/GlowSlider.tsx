import React, { useId, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { colors, palettes } from '../design/tokens';

export function GlowSlider({
  label,
  value,
  onChange,
  glow = false,
  tint = palettes.Violet.body,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  glow?: boolean;
  tint?: string;
}) {
  const [width, setWidth] = useState(0);
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const change = (next: number) => onChange(Math.round(Math.max(0, Math.min(100, next))));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: glow ? 62 : 44 }}>
      {glow && (
        <View
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: 12,
            left: 0,
            right: 0,
            height: 38,
            borderRadius: 99,
            borderWidth: 1,
            borderColor: '#FFFFFF12',
            backgroundColor: '#FFFFFF06',
            overflow: 'hidden',
          }}
        >
          <View style={{ width: `${value}%`, height: '100%', backgroundColor: '#FFFFFF0C' }} />
        </View>
      )}
      <Slider
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          change(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))
        }
        tapToSeek
        value={value}
        minimumValue={0}
        maximumValue={100}
        step={1}
        onValueChange={change}
        onSlidingComplete={change}
        minimumTrackTintColor={glow ? 'transparent' : tint + '70'}
        maximumTrackTintColor={glow ? 'transparent' : '#FFFFFF1C'}
        thumbTintColor={glow ? 'transparent' : tint}
        style={{ width: '100%', height: glow ? 62 : 44 }}
        {...(Platform.OS === 'web'
          ? {
              tabIndex: 0,
              'aria-valuenow': value,
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuetext': `${value}%`,
              onKeyDown: (e: { key: string; preventDefault: () => void }) => {
                const step = ['ArrowRight', 'ArrowUp'].includes(e.key)
                  ? 1
                  : ['ArrowLeft', 'ArrowDown'].includes(e.key)
                    ? -1
                    : 0;
                if (step || e.key === 'Home' || e.key === 'End') {
                  e.preventDefault();
                  change(e.key === 'Home' ? 0 : e.key === 'End' ? 100 : value + step);
                }
              },
            }
          : {})}
      />
      {glow && width > 0 && (
        <View
          style={{
            pointerEvents: 'none',
            ...StyleSheet.absoluteFill,
            left: 10 + ((width - 20) * value) / 100 - 31,
            width: 62,
          }}
        >
          <Svg width={62} height={62} viewBox="0 0 62 62">
            <Defs>
              <RadialGradient id={id}>
                <Stop offset="0" stopColor={colors.text} stopOpacity="1" />
                <Stop offset=".2" stopColor={palettes.Ember.core} stopOpacity=".92" />
                <Stop offset=".48" stopColor={tint} stopOpacity=".48" />
                <Stop offset="1" stopColor={tint} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="31" cy="31" r="31" fill={`url(#${id})`} />
            <Circle cx="31" cy="31" r="5" fill={palettes.Ember.core} />
          </Svg>
        </View>
      )}
    </View>
  );
}

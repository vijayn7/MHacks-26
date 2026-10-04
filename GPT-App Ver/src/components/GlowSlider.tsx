import React, { useId, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSliderCompanion } from '../hooks/useSliderCompanion';
import { sliderGlow } from '../design/slider';
import Slider from '@react-native-community/slider';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { colors, palettes } from '../design/tokens';

export function GlowSlider({
  label,
  value,
  onChange,
  glow = false,
  tint = palettes.Violet.body,
  startTint = tint,
  endTint = tint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  glow?: boolean;
  tint?: string;
  startTint?: string;
  endTint?: string;
}) {
  const [width, setWidth] = useState(0);
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const change = (next: number) => {
    companion.change();
    onChange(Math.round(Math.max(0, Math.min(100, next))));
  };
  const companion = useSliderCompanion();
  const light = sliderGlow(value);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: glow ? 62 : 44, marginHorizontal: glow ? 12 : 0 }}
    >
      <View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: 0,
          right: 0,
          top: glow ? 29.5 : 20.5,
          height: 3,
          borderRadius: 9,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={glow ? ['#FFFFFF12', '#FFFFFF12'] : [startTint, endTint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </View>
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
        onSlidingStart={companion.start}
        onTouchCancel={companion.end}
        onSlidingComplete={(next) => {
          change(next);
          companion.end();
        }}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor={glow ? 'transparent' : colors.text}
        style={{ width: '100%', height: glow ? 62 : 44 }}
      />
      {glow && width > 0 && (
        <View
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: (62 - light.size) / 2,
            opacity: light.opacity,
            left: 10 + ((width - 20) * value) / 100 - light.size / 2,
            width: light.size,
          }}
        >
          <Svg width={light.size} height={light.size} viewBox="0 0 62 62">
            <Defs>
              <RadialGradient id={id}>
                <Stop offset="0" stopColor={colors.text} stopOpacity="1" />
                <Stop offset=".2" stopColor={palettes.Ember.core} stopOpacity=".92" />
                <Stop offset=".48" stopColor={tint} stopOpacity=".48" />
                <Stop offset="1" stopColor={tint} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="31" cy="31" r="31" fill={`url(#${id})`} />
            <Circle cx="31" cy="31" r="2.5" fill={palettes.Ember.core} />
          </Svg>
        </View>
      )}
    </View>
  );
}

import React from 'react';
import { useWindowDimensions, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../state/Store';
import { money } from '../state/model';
import { palettes } from '../design/tokens';
import { Canvas, T } from '../components/ui';
import { useCompanion } from '../state/Companion';
import { Mascot } from '../components/Mascot';
import { ExtensionScore } from '../components/ExtensionScore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavingsChart } from '../components/Chart';

export default function Home() {
  const { state } = useStore();
  const { width, height } = useWindowDimensions();
  const p = palettes[state.hue];
  const insets = useSafeAreaInsets();
  const { level } = useCompanion();
  const size = Math.min(286, width - 54, Math.max(112, (height - 435) * 0.83));
  const textSize = width < 360 ? 25 : 31;
  const textLineHeight = width < 360 ? 34 : 40;
  const pill = (value: string) => (
    <LinearGradient
      colors={[p.body + '22', p.mid + '10']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 99,
        paddingHorizontal: 11,
        borderWidth: 1,
        borderColor: p.body + '20',
      }}
    >
      <T variant="title" color={p.body} style={{ fontSize: textSize, lineHeight: textLineHeight }}>
        {value}
      </T>
    </LinearGradient>
  );
  return (
    <Canvas>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View
          style={{
            height: Math.max(560, height - 100 - insets.top - insets.bottom),
            paddingHorizontal: 28,
            paddingTop: 8,
          }}
        >
          <View style={{ flex: 1, minHeight: 120, alignItems: 'center', justifyContent: 'center' }}>
            <View testID="snuff-flame" style={{ alignItems: 'center' }}>
              <Mascot hue={state.hue} size={size} />
            </View>
            <T
              variant="small"
              style={{ position: 'absolute', bottom: 6, fontSize: 11 }}
              color={p.body + (level === 'Out' ? 'B0' : '70')}
            >
              {level === 'Out' ? 'a little space. that’s all.' : 'pet your flame'}
            </T>
          </View>
          <View style={{ alignItems: 'center', gap: 4, marginTop: 16, marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T variant="title" style={{ fontSize: textSize, lineHeight: textLineHeight }}>
                you’ve saved
              </T>
              {pill(money(state.savings))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <T variant="title" style={{ fontSize: textSize, lineHeight: textLineHeight }}>
                by pausing
              </T>
              {pill(String(state.pauses))}
              <T variant="title" style={{ fontSize: textSize, lineHeight: textLineHeight }}>
                times
              </T>
            </View>
            <T variant="title" style={{ fontSize: textSize, lineHeight: textLineHeight }}>
              this week.
            </T>
          </View>
          <View style={{ marginHorizontal: 8, marginBottom: 10 }}>
            <SavingsChart />
          </View>
          <ExtensionScore />
        </View>
      </ScrollView>
    </Canvas>
  );
}

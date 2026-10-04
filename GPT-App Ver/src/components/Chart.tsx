import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Line } from 'react-native-svg';
import { useStore } from '../state/Store';
import { dayKey, money } from '../state/model';
import { palettes } from '../design/tokens';
import { T } from './ui';
import { useNow } from '../hooks/useNow';

export function SavingsChart() {
  const { state } = useStore();
  const p = palettes[state.hue];
  const now = useNow(60000);
  const [selected, setSelected] = useState<number | null>(null);
  const data = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const at = now - (6 - i) * 86400000;
      return { at, amount: state.dailySavings[dayKey(at)] || 0 };
    });
    return days.map((d, i) => ({
      at: d.at,
      total: days.slice(0, i + 1).reduce((sum, day) => sum + day.amount, 0),
    }));
  }, [now, state.dailySavings]);
  const max = Math.max(1, data[6].total);
  const points = data.map((d, i) => ({ x: 12 + i * 49, y: 126 - (d.total / max) * 105 }));
  const line = points.reduce(
    (path, pt, i) =>
      i === 0
        ? 'M ' + pt.x + ' ' + pt.y
        : path +
          ' C ' +
          (points[i - 1].x + pt.x) / 2 +
          ' ' +
          points[i - 1].y +
          ' ' +
          (points[i - 1].x + pt.x) / 2 +
          ' ' +
          pt.y +
          ' ' +
          pt.x +
          ' ' +
          pt.y,
    '',
  );
  return (
    <View testID="savings-chart" style={{ height: 166 }}>
      <Svg width="100%" height={140} viewBox="0 0 318 140">
        <Defs>
          <LinearGradient id="savings-bars" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.body} stopOpacity=".32" />
            <Stop offset="1" stopColor={p.edge} stopOpacity=".025" />
          </LinearGradient>
        </Defs>
        {points.map((pt, i) => (
          <Line
            key={i}
            x1={pt.x}
            x2={pt.x}
            y1={pt.y + 6}
            y2={137}
            stroke="url(#savings-bars)"
            strokeWidth="2"
          />
        ))}
        <Line x1="0" x2="318" y1="137" y2="137" stroke={p.body} strokeOpacity=".08" />
        <Path d={line} fill="none" stroke={p.body} strokeOpacity=".8" strokeWidth="1.5" />
        {[1, 3, 5].map((i) => (
          <React.Fragment key={i}>
            <Circle
              cx={points[i].x}
              cy={points[i].y}
              r="8"
              fill={p.wash}
              stroke={p.body}
              strokeOpacity=".5"
              strokeWidth=".8"
            />
            <Circle cx={points[i].x} cy={points[i].y} r="2" fill={p.body} />
          </React.Fragment>
        ))}
        {selected !== null && (
          <Circle cx={points[selected].x} cy={points[selected].y} r="5" fill={p.core} />
        )}
      </Svg>
      <View
        style={{
          position: 'absolute',
          height: 140,
          top: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
        }}
      >
        {data.map((d, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              new Date(d.at).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() +
              ' savings'
            }
            key={i}
            onPress={() => setSelected(i)}
            style={{ flex: 1 }}
          />
        ))}
      </View>
      <T
        variant="small"
        style={{ textAlign: 'center', marginTop: 8, fontSize: 10 }}
        color={p.body + '70'}
      >
        {selected === null
          ? 'Room you’ve made, this week'
          : money(data[selected].total) +
            ' · ' +
            new Date(data[selected].at).toLocaleDateString('en-US', { weekday: 'short' })}
      </T>
    </View>
  );
}

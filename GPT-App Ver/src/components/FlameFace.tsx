import React from 'react';
import { Ellipse, G, Path } from 'react-native-svg';
import type { Face } from '../design/faces';

/** Shared vector eyes, anchored to the original companion's face. */
export function FlameFace({
  face = 'classic',
  color,
  relaxed = false,
}: {
  face?: Face | 'wistful';
  color: string;
  relaxed?: boolean;
}) {
  const curve = (d: string) => (
    <Path d={d} fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
  );
  const left = (
    <Ellipse
      cx={111.2}
      cy={165.24}
      rx={4.14}
      ry={6.9}
      fill={color}
      transform="rotate(22 111.2 165.24)"
    />
  );
  const right = (
    <Ellipse
      cx={145.24}
      cy={163.4}
      rx={4.14}
      ry={6.9}
      fill={color}
      transform="rotate(22 145.24 163.4)"
    />
  );
  return (
    <G>
      {relaxed ? (
        <>
          {curve('M 104.8 167.1 Q 111.2 173.5 117.6 166.2')}
          {curve('M 138.8 165.2 Q 145.2 171.7 151.7 164.3')}
        </>
      ) : face === 'wistful' ? (
        <>
          {curve('M 104 162 Q 110 172 118 168')}
          {curve('M 138 166 Q 146 170 152 159')}
        </>
      ) : face === 'happy' ? (
        <>
          {curve('M 105 167 Q 111 155 117.5 166')}
          {curve('M 139 165 Q 145 153 151.5 164')}
        </>
      ) : face === 'dreamy' ? (
        <>
          {curve('M 105 164 Q 111 168 117.5 163')}
          {curve('M 139 162 Q 145 166 151.5 161')}
          <Ellipse cx={111.2} cy={166.3} rx={3} ry={2.6} fill={color} />
          <Ellipse cx={145.2} cy={164.3} rx={3} ry={2.6} fill={color} />
        </>
      ) : face === 'wink' ? (
        <>
          {left}
          {curve('M 139 162 L 145 165 L 151 160')}
        </>
      ) : (
        <>
          {left}
          {right}
        </>
      )}
    </G>
  );
}

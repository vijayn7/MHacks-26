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
      ) : face === 'curious' ? (
        <>
          <Ellipse cx={111} cy={165} rx={4} ry={5} fill={color} />
          <Ellipse cx={145} cy={163} rx={5} ry={8} fill={color} />
          {curve('M 105 154 Q 111 149 117 153')}
        </>
      ) : face === 'sparkle' ? (
        <>
          <Path
            d="M111 156 L114 162 L120 165 L114 168 L111 174 L108 168 L102 165 L108 162 Z"
            fill={color}
          />
          <Path
            d="M145 154 L148 160 L154 163 L148 166 L145 172 L142 166 L136 163 L142 160 Z"
            fill={color}
          />
        </>
      ) : face === 'love' ? (
        <>
          <Path d="M111 172 C91 158 108 153 111 161 C115 151 131 158 111 172 Z" fill={color} />
          <Path d="M145 170 C125 156 142 151 145 159 C149 149 165 156 145 170 Z" fill={color} />
        </>
      ) : face === 'sleepy' ? (
        <>
          {curve('M 105 165 Q 111 171 118 165')}
          {curve('M 139 163 Q 145 169 152 163')}
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

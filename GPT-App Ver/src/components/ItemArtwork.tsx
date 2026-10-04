import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Local, reusable product illustrations; no third-party image requests. */
export function ItemArtwork({ name, size = 112 }: { name: string; size?: number }) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const kind = /headphone/i.test(name)
    ? 'headphones'
    : /camera/i.test(name)
      ? 'camera'
      : /light|lamp/i.test(name)
        ? 'lamp'
        : /tote|bag/i.test(name)
          ? 'bag'
          : /watch/i.test(name)
            ? 'watch'
            : /speaker/i.test(name)
              ? 'speaker'
              : 'box';
  const bg = {
    headphones: '#CFBFAF',
    camera: '#C2C8D4',
    lamp: '#D2D1B4',
    bag: '#D6BFA6',
    watch: '#C2CBC8',
    speaker: '#C7BFCF',
    box: '#D0C8BA',
  }[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <LinearGradient id={'bg' + id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={bg} />
        </LinearGradient>
        <LinearGradient id={'metal' + id} x1="0" y1="0" x2="1" y2=".6">
          <Stop offset="0" stopColor="#F4EFE4" />
          <Stop offset=".45" stopColor="#C6BFAF" />
          <Stop offset=".65" stopColor="#E7E0D5" />
          <Stop offset="1" stopColor="#8F8A7D" />
        </LinearGradient>
        <LinearGradient id={'dark' + id}>
          <Stop offset="0" stopColor="#555653" />
          <Stop offset=".5" stopColor="#232A2C" />
          <Stop offset="1" stopColor="#101516" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="160" rx="4" fill={bg} />
      <Rect width="160" height="160" rx="4" fill={'url(#bg' + id + ')'} opacity=".28" />
      <Ellipse cx="84" cy="130" rx="45" ry="8" fill="#38342C" opacity=".08" />
      <Ellipse cx="84" cy="130" rx="31" ry="4" fill="#38342C" opacity=".1" />
      <G transform="rotate(-12 80 80)">
        {kind === 'headphones' ? (
          <>
            <Path
              d="M 42 90 V 72 C 42 17 120 17 120 72 V 91"
              fill="none"
              stroke="#575752"
              strokeWidth="12"
            />
            <Path
              d="M 43 76 V 69 C 43 21 119 21 119 69 V 76"
              fill="none"
              stroke={'url(#metal' + id + ')'}
              strokeWidth="9"
            />
            <Rect x="31" y="77" width="27" height="48" rx="13" fill={'url(#dark' + id + ')'} />
            <Rect x="106" y="77" width="27" height="48" rx="13" fill={'url(#dark' + id + ')'} />
            <Rect x="33" y="80" width="16" height="40" rx="8" fill={'url(#metal' + id + ')'} />
            <Rect x="114" y="80" width="16" height="40" rx="8" fill={'url(#metal' + id + ')'} />
          </>
        ) : kind === 'camera' ? (
          <>
            <Rect x="26" y="59" width="107" height="65" rx="8" fill={'url(#dark' + id + ')'} />
            <Path
              d="M 26 65 Q 26 55 35 55 H 57 L 64 43 H 95 L 102 55 H 125 Q 133 55 133 65 V 75 H 26 Z"
              fill={'url(#metal' + id + ')'}
            />
            <Circle cx="83" cy="91" r="29" fill="#B2AD9F" />
            <Circle cx="83" cy="91" r="24" fill="#373E3D" />
            <Circle cx="83" cy="91" r="17" fill="#111F22" />
            <Circle cx="80" cy="87" r="8" fill="#47606B" />
            <Circle cx="77" cy="83" r="3" fill="#A4C1C3" opacity=".7" />
            <Rect x="112" y="60" width="12" height="8" rx="2" fill="#232B2D" />
          </>
        ) : kind === 'lamp' ? (
          <>
            <Ellipse cx="80" cy="125" rx="31" ry="7" fill={'url(#metal' + id + ')'} />
            <Rect x="76" y="55" width="8" height="70" fill={'url(#metal' + id + ')'} />
            <Path d="M 35 71 C 38 12 123 12 126 71 Z" fill={'url(#metal' + id + ')'} />
            <Ellipse cx="80" cy="71" rx="45" ry="6" fill="#FCEDC7" />
          </>
        ) : kind === 'bag' ? (
          <>
            <Path
              d="M 59 57 V 42 C 59 18 101 18 101 42 V 57"
              stroke="#746653"
              strokeWidth="7"
              fill="none"
            />
            <Path d="M 42 52 H 118 L 127 130 H 33 Z" fill={'url(#metal' + id + ')'} />
            <Path d="M 49 57 L 42 122 M 109 57 L 118 122" stroke="#9D927F" opacity=".55" />
            <Rect x="65" y="78" width="31" height="19" rx="2" fill="#9F9279" opacity=".55" />
          </>
        ) : kind === 'watch' ? (
          <>
            <Rect x="67" y="17" width="29" height="126" rx="8" fill="#665549" />
            <Rect x="59" y="48" width="45" height="65" rx="17" fill={'url(#metal' + id + ')'} />
            <Circle cx="81" cy="80" r="22" fill="#EBE5D8" />
            <Circle cx="81" cy="80" r="18" fill="none" stroke="#A29B8C" strokeWidth=".6" />
            <Path d="M 81 65 V 80 L 91 88" stroke="#363932" strokeWidth="2" fill="none" />
            <Circle cx="81" cy="80" r="2" fill="#363932" />
          </>
        ) : kind === 'speaker' ? (
          <>
            <Rect x="48" y="27" width="68" height="106" rx="7" fill="#806D59" />
            <Rect x="44" y="23" width="65" height="106" rx="6" fill={'url(#metal' + id + ')'} />
            <Circle cx="77" cy="51" r="15" fill={'url(#dark' + id + ')'} />
            <Circle cx="77" cy="51" r="6" fill="#565951" />
            <Circle cx="77" cy="96" r="26" fill={'url(#dark' + id + ')'} />
            <Circle cx="77" cy="96" r="17" fill="#575A52" />
            <Circle cx="77" cy="96" r="9" fill="#242B29" />
          </>
        ) : (
          <>
            <Path
              d="M 36 57 L 80 35 L 125 57 V 115 L 81 138 L 36 114 Z"
              fill={'url(#metal' + id + ')'}
            />
            <Path
              d="M 36 57 L 81 79 L 125 57 M 81 79 V 138 M 60 45 L 104 68"
              stroke="#9C927C"
              fill="none"
              strokeWidth="2"
            />
          </>
        )}
      </G>
    </Svg>
  );
}

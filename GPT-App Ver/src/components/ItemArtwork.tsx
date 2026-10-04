import React, { useId } from 'react';
import { Image, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  RadialGradient,
} from 'react-native-svg';
import { archivePlaceholderFor } from '../design/archive-assets';

/** Local product art for archive / sample store; prefers studio placeholders. */
export function ItemArtwork({ name, size = 112 }: { name: string; size?: number }) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const photo = archivePlaceholderFor(name);
  if (photo) {
    return (
      <View style={{ width: size, height: size }}>
        <Image
          accessibilityIgnoresInvertColors
          source={photo}
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      </View>
    );
  }

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
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <LinearGradient id={'metal' + id} x1="0" y1="0" x2="1" y2=".6">
          <Stop offset="0" stopColor="#F4EFE4" />
          <Stop offset=".2" stopColor="#FFFFFF" />
          <Stop offset=".35" stopColor="#A39E94" />
          <Stop offset=".45" stopColor="#C6BFAF" />
          <Stop offset=".65" stopColor="#E7E0D5" />
          <Stop offset="1" stopColor="#8F8A7D" />
        </LinearGradient>
        <LinearGradient id={'dark' + id}>
          <Stop offset="0" stopColor="#555653" />
          <Stop offset=".5" stopColor="#232A2C" />
          <Stop offset="1" stopColor="#101516" />
        </LinearGradient>
        <RadialGradient id={'glass' + id} cx="35%" cy="28%" r="75%">
          <Stop offset="0" stopColor="#91BFC4" />
          <Stop offset=".22" stopColor="#294C59" />
          <Stop offset=".6" stopColor="#0A202B" />
          <Stop offset="1" stopColor="#03080E" />
        </RadialGradient>
        <LinearGradient id={'leather' + id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#554337" />
          <Stop offset=".3" stopColor="#A18B6B" />
          <Stop offset=".7" stopColor="#807057" />
          <Stop offset="1" stopColor="#3E3027" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="84" cy="130" rx="45" ry="8" fill="#000000" opacity=".28" />
      <Ellipse cx="84" cy="130" rx="31" ry="4" fill="#000000" opacity=".35" />
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
            <Path d="M 48 66 C 48 27 114 27 114 66" stroke="#141719" strokeWidth="4" fill="none" />
            <Path d="M 43 70 V 86 M 120 70 V 86" stroke="#DADDDD" strokeWidth="3" />
            <Path
              d="M 36 86 V 111 M 117 86 V 111"
              stroke="#FFFFFF"
              strokeWidth="1.1"
              opacity=".65"
            />
            <Path
              d="M 53 84 Q 60 101 52 119 M 109 84 Q 103 101 110 119"
              stroke="#666D6C"
              strokeWidth="1.5"
              fill="none"
            />
            {[91, 95, 99, 103, 107].map((y) => (
              <Path key={y} d={`M 125 ${y} h 3`} stroke="#797B73" strokeWidth=".5" />
            ))}
            <Circle cx="122" cy="115" r="1.3" fill="#606960" />
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
            <Rect
              x="30"
              y="80"
              width="17"
              height="36"
              rx="4"
              fill="#161C1C"
              stroke="#5F6259"
              strokeWidth=".6"
            />
            {Array.from({ length: 9 }, (_, i) => (
              <Path
                key={i}
                d={`M 32 ${84 + i * 3} h 12`}
                stroke="#6F7068"
                strokeWidth=".35"
                opacity=".5"
              />
            ))}
            <Rect x="35" y="49" width="15" height="7" rx="2" fill={'url(#metal' + id + ')'} />
            <Rect
              x="67"
              y="49"
              width="21"
              height="10"
              rx="2"
              fill="#192527"
              stroke="#ECE8DC"
              strokeWidth="1"
            />
            <Circle cx="83" cy="91" r="26" fill="none" stroke="#E3DED2" strokeWidth=".7" />
            <Circle cx="83" cy="91" r="21" fill="none" stroke="#828D89" strokeWidth="2" />
            <Circle cx="83" cy="91" r="17" fill={'url(#glass' + id + ')'} />
            <Circle cx="83" cy="91" r="10" fill="none" stroke="#50818C" strokeWidth=".7" />
            <Ellipse
              cx="77"
              cy="83"
              rx="7"
              ry="3"
              transform="rotate(-35 77 83)"
              fill="#CCE7E2"
              opacity=".5"
            />
            <Circle cx="121" cy="82" r="2" fill="#BF5B3A" />
          </>
        ) : kind === 'lamp' ? (
          <>
            <Ellipse cx="80" cy="125" rx="31" ry="7" fill={'url(#metal' + id + ')'} />
            <Rect x="76" y="55" width="8" height="70" fill={'url(#metal' + id + ')'} />
            <Path d="M 35 71 C 38 12 123 12 126 71 Z" fill={'url(#metal' + id + ')'} />
            <Ellipse cx="80" cy="71" rx="45" ry="6" fill="#FCEDC7" />
            <Path
              d="M 42 59 C 48 33 66 23 87 25"
              fill="none"
              stroke="#FFF9E7"
              strokeWidth="2"
              opacity=".7"
            />
            <Ellipse cx="80" cy="71" rx="38" ry="3.5" fill="#D8B876" />
            <Ellipse cx="80" cy="71" rx="26" ry="2" fill="#FFF5CF" />
            <Path d="M 78 79 V 120" stroke="#FFFFFF" strokeWidth="1" opacity=".7" />
            <Ellipse
              cx="80"
              cy="123"
              rx="26"
              ry="3"
              fill="none"
              stroke="#E4DFD1"
              strokeWidth=".7"
            />
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
            <Path
              d="M 39 125 L 47 57 H 113 L 122 125 Z"
              fill="none"
              stroke="#EFE7D6"
              strokeWidth=".65"
              strokeDasharray="2 1.5"
            />
            <Path
              d="M 59 58 V 42 C 59 18 101 18 101 42 V 58"
              stroke="#B8A78B"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M 45 61 L 53 116 L 42 122 M 111 62 L 107 117 L 120 123"
              fill="#988B73"
              opacity=".3"
            />
            <Rect
              x="67"
              y="80"
              width="27"
              height="15"
              rx="1"
              fill="none"
              stroke="#DFD1B8"
              strokeWidth=".6"
              strokeDasharray="1 1"
            />
            <Path d="M 72 87 H 89" stroke="#796C55" strokeWidth="1.2" />
          </>
        ) : kind === 'watch' ? (
          <>
            <Rect x="67" y="17" width="29" height="126" rx="8" fill={'url(#leather' + id + ')'} />
            <Rect x="59" y="48" width="45" height="65" rx="17" fill={'url(#metal' + id + ')'} />
            <Circle cx="81" cy="80" r="22" fill="#EBE5D8" />
            <Circle cx="81" cy="80" r="18" fill="none" stroke="#A29B8C" strokeWidth=".6" />
            <Path d="M 81 65 V 80 L 91 88" stroke="#363932" strokeWidth="2" fill="none" />
            <Circle cx="81" cy="80" r="2" fill="#363932" />
            {Array.from({ length: 12 }, (_, i) => (
              <Path
                key={i}
                d="M 81 61 V 64"
                transform={`rotate(${i * 30} 81 80)`}
                stroke="#494A41"
                strokeWidth={i % 3 === 0 ? 1.3 : 0.65}
              />
            ))}
            <Path
              d="M 71 22 V 43 M 92 22 V 43 M 71 118 V 137 M 92 118 V 137"
              stroke="#C6AD87"
              strokeWidth=".6"
              strokeDasharray="2 2"
            />
            <Rect x="104" y="76" width="4" height="9" rx="1" fill={'url(#metal' + id + ')'} />
            <Path d="M 81 80 L 70 88" stroke="#AA593F" strokeWidth=".7" />
            <Path
              d="M 65 71 Q 73 57 92 66"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              opacity=".45"
            />
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
            {[19, 22, 24].map((r) => (
              <Circle
                key={r}
                cx="77"
                cy="96"
                r={r}
                fill="none"
                stroke="#8C9184"
                strokeWidth=".5"
                opacity=".65"
              />
            ))}
            <Circle cx="77" cy="51" r="12" fill="none" stroke="#92998A" strokeWidth=".6" />
            {[
              [50, 30],
              [102, 30],
              [50, 121],
              [102, 121],
            ].map(([x, y]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="#4A5149" />
            ))}
            <Path
              d="M 111 33 V 122 M 113 39 V 117"
              stroke="#B39D79"
              strokeWidth=".6"
              opacity=".65"
            />
            <Path d="M 49 27 H 103" stroke="#FFFFFF" strokeWidth=".7" opacity=".6" />
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

import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { useStore } from '../state/Store';
import { money, validEmail } from '../state/model';
import { colors, palettes, Hue } from '../design/tokens';
import { Canvas, Icon, Input, QuietButton, Sheet, T, tap } from '../components/ui';
import { ContactSync } from '../components/ContactSync';
import { Mascot } from '../components/Mascot';

export default function Social() {
  const { state, dispatch } = useStore();
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const [sheet, setSheet] = useState<'connect' | null>(null);
  const [contactsMode, setContactsMode] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const ranked = [
    ...state.friends,
    { id: 'you', name: 'You', email: '', savings: state.savings, hue: state.hue },
  ].sort((a, b) => b.savings - a.savings);
  const emptySpot = (id: string) => ({ id, name: ' ', hue: 'Ash' as Hue });
  const podium = [
    ranked[1] || emptySpot('empty-left'),
    ranked[0],
    ranked[2] || emptySpot('empty-right'),
  ];
  const heights = compact ? [105, 164, 90] : [135, 210, 116];
  const p = palettes[state.hue];
  const connect = () => {
    const value = email.trim().toLowerCase();
    if (!validEmail(value)) {
      setError('A valid email is all you need.');
      return;
    }
    if (state.friends.some((f) => f.email.toLowerCase() === value)) {
      setError('You’re already connected.');
      return;
    }
    dispatch({ type: 'CONNECT', email: value });
    setAdded(true);
    setError('');
  };
  return (
    <Canvas>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 34, paddingBottom: 28 }}
      >
        <View style={{ height: compact ? 260 : 330 }}>
          <T
            variant="small"
            color={colors.secondary}
            style={{ alignSelf: 'flex-end', fontSize: 12 }}
          >
            leaderboard
          </T>
          <View style={{ position: 'absolute', inset: 0, top: 38, justifyContent: 'flex-end' }}>
            <Svg
              width="100%"
              height={230}
              viewBox="0 0 334 230"
              style={{ position: 'absolute', bottom: 8 }}
            >
              <Defs>
                <SvgGradient id="skyline" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={p.body} stopOpacity=".12" />
                  <Stop offset="1" stopColor={p.wash} stopOpacity=".02" />
                </SvgGradient>
              </Defs>
              {[
                { x: 6, h: 28 },
                { x: 33, h: 55 },
                { x: 93, h: 110 },
                { x: 114, h: 83 },
                { x: 213, h: 124 },
                { x: 241, h: 90 },
                { x: 312, h: 38 },
              ].map((b) => (
                <Rect
                  key={b.x}
                  x={b.x}
                  y={204 - b.h}
                  width="11"
                  height={b.h}
                  rx="5"
                  fill="url(#skyline)"
                  stroke={p.body}
                  strokeOpacity=".10"
                  strokeWidth=".6"
                />
              ))}
              <Path
                d="M 0 204 Q 20 210 39 203 T 81 205 T 127 202 T 170 205 T 215 203 T 260 205 T 300 202 T 334 204"
                fill="none"
                stroke={p.body}
                strokeOpacity=".20"
              />
            </Svg>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                paddingHorizontal: 13,
                paddingBottom: 0,
              }}
            >
              {podium.map((f, i) => (
                <View key={f.id} style={{ width: '29%', alignItems: 'center' }}>
                  <View style={{ marginBottom: -11, zIndex: 1 }}>
                    <Mascot
                      companionId={f.id}
                      hue={f.hue}
                      size={compact ? (i === 1 ? 78 : 64) : i === 1 ? 99 : 81}
                    />
                  </View>
                  <LinearGradient
                    colors={[
                      palettes[f.hue].body + '35',
                      palettes[f.hue].mid + '17',
                      palettes[f.hue].wash + '03',
                    ]}
                    style={{
                      height: heights[i],
                      width: '100%',
                      borderTopLeftRadius: 15,
                      borderTopRightRadius: 15,
                      borderWidth: 1,
                      borderColor: palettes[f.hue].body + '13',
                      borderBottomWidth: 0,
                    }}
                  />
                  <T
                    variant="small"
                    color={f.id === 'you' ? p.body : colors.secondary}
                    style={{ marginTop: 16 }}
                  >
                    {f.name.split(' ')[0]}
                  </T>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View testID="leaderboard-list" style={{ gap: 8, marginTop: 28 }}>
          {ranked.map((f, i) => (
            <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <T variant="small" style={{ width: 14 }}>
                {i + 1}
              </T>
              <Mascot companionId={f.id} hue={f.hue} size={42} />
              <T style={{ flex: 1 }}>{f.name}</T>
              <T variant="title" color={palettes[f.hue].body} style={{ fontSize: 23 }}>
                {money(f.savings)}
              </T>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="connect with a friend"
          onPress={() => {
            tap();
            setContactsMode(false);
            setAdded(false);
            setError('');
            setEmail('');
            setSheet('connect');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 28,
          }}
        >
          <T variant="title" style={{ fontSize: 30 }}>
            Connect with
          </T>
          <LinearGradient
            colors={[p.body + '19', p.wash + '30']}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: p.body + '24',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="user-plus" color={p.body} size={19} />
          </LinearGradient>
        </Pressable>
        <Sheet
          visible={sheet === 'connect'}
          title={
            contactsMode ? 'your contacts.' : added ? 'Good company.' : 'Connect with a friend.'
          }
          expanded={contactsMode}
          contentKey={contactsMode ? 'contacts' : 'email'}
          onClose={() => setSheet(null)}
        >
          {contactsMode && sheet === 'connect' ? (
            <ContactSync onBack={() => setContactsMode(false)} />
          ) : added ? (
            <>
              <T>{email.trim()} is in your circle.</T>
              <QuietButton onPress={() => setSheet(null)}>Done</QuietButton>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="sync contacts"
                onPress={() => {
                  tap();
                  setContactsMode(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 16,
                  marginBottom: 18,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Icon name="users" color={p.body} size={22} />
                <View style={{ flex: 1 }}>
                  <T>sync contacts</T>
                  <T variant="small">choose from your phone</T>
                </View>
                <Icon name="chevron-right" size={17} />
              </Pressable>
              <Input
                email
                label="Friend’s email"
                value={email}
                onChangeText={setEmail}
                placeholder="name@email.com"
              />
              {!!error && (
                <T variant="small" color={palettes.Crimson.body}>
                  {error}
                </T>
              )}
              <T variant="small">This is a local connection for the demo. No invitation is sent.</T>
              <QuietButton onPress={connect}>Connect</QuietButton>
            </>
          )}
        </Sheet>
      </ScrollView>
    </Canvas>
  );
}

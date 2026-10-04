import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '../design/tokens';
import { useStore } from '../state/Store';
import { Mascot } from './Mascot';
import { Icon, QuietButton, Sheet, T } from './ui';

const slot = 44;
const gap = 6;
export function FriendStrip() {
  const { state } = useStore();
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  // Keep touch targets intact, reserve a slot for overflow, and never wrap.
  const capacity = Math.max(1, Math.min(10, Math.floor((width + gap) / (slot + gap))));
  const overflows = state.friends.length > capacity;
  const visible = state.friends.slice(0, overflows ? capacity - 1 : capacity);
  const more = state.friends.length - visible.length;
  return (
    <>
      <View
        testID="friend-strip"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          minHeight: 76,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap,
        }}
      >
        {width > 0 &&
          visible.map((friend) => (
            <View
              key={friend.id}
              testID="friend-avatar"
              style={{ width: slot, alignItems: 'center', justifyContent: 'center' }}
            >
              <Mascot
                hue={friend.hue}
                size={44}
                companionId={friend.id}
                companionName={friend.name}
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  width: slot,
                  marginTop: 3,
                  fontFamily: fonts.body,
                  fontSize: 10,
                  lineHeight: 14,
                  color: colors.secondary,
                  textAlign: 'center',
                }}
              >
                {friend.name.trim().split(/\s+/)[0].toLowerCase()}
              </Text>
            </View>
          ))}
        {width > 0 && overflows && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`show all trusted friends, ${more} more`}
            onPress={() => setOpen(true)}
            style={{
              width: slot,
              height: slot,
              borderRadius: 22,
              backgroundColor: '#FFFFFF05',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="more-horizontal" color={colors.secondary} size={21} />
          </Pressable>
        )}
        {!state.friends.length && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="add trusted friends"
            onPress={() => router.push('/social')}
            style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Icon name="user-plus" size={18} />
            <T variant="small">a little company</T>
          </Pressable>
        )}
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title="your quiet circle." expanded>
        {state.friends.map((friend) => (
          <View
            key={friend.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 6 }}
          >
            <Mascot
              hue={friend.hue}
              size={44}
              companionId={friend.id}
              companionName={friend.name}
            />
            <T style={{ fontSize: 15 }}>{friend.name}</T>
          </View>
        ))}
        <QuietButton
          secondary
          onPress={() => {
            setOpen(false);
            router.push('/social');
          }}
        >
          connect with a friend
        </QuietButton>
      </Sheet>
    </>
  );
}

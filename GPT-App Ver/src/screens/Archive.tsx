import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/Store';
import { archiveSamples, savedDate, savedSource, type SavedItem } from '../state/archive';
import { money } from '../state/model';
import { colors, palettes } from '../design/tokens';
import { ArchiveObject } from '../components/ArchiveObject';
import { ItemArtwork } from '../components/ItemArtwork';
import { Icon, Sheet, T, tap } from '../components/ui';

/** Colton lens-scroll approximation: tall center focus, fisheye bend at edges. */
const step = 200;
const tile = 128;
const focusScale = 2.72;
export default function Archive() {
  const { state, dispatch, openNudge } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [showPreview, setPreview] = useState(false);
  const preview = showPreview && state.archive.length === 0;
  const focused = useIsFocused();
  const [samples] = useState(() => archiveSamples());
  const items = preview ? samples : state.archive;
  const [scrollIndex, setSelected] = useState(0);
  const selected = Math.min(scrollIndex, Math.max(0, items.length - 1));
  const [detail, setDetail] = useState<SavedItem | null>(null);
  const [viewport, setViewport] = useState(500);
  const [reduce, setReduce] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const [offset] = useState(() => new Animated.Value(0));
  const labelClearance = Math.min(118, Math.max(72, (tile * focusScale) / 2 + 18));
  const sideWidth = Math.max(64, Math.min(96, width / 2 - labelClearance - 8));
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    const y = preview ? 2 * step : 0;
    offset.setValue(y);
    scroll.current?.scrollTo({ y, animated: false });
  }, [preview, items.length, offset]);
  const focus = (index: number) => {
    tap();
    scroll.current?.scrollTo({ y: index * step, animated: !reduce });
    setSelected(index);
  };
  const revisit = (item: SavedItem) => {
    setDetail(null);
    dispatch({ type: 'REVISIT_ITEM', id: item.id });
    openNudge(item.id);
  };
  return (
    <View style={[s.page, { paddingTop: insets.top + 24, paddingBottom: 100 + insets.bottom }]}>
      {focused && <StatusBar style="light" />}
      {!items.length ? (
        <View style={s.empty}>
          <Icon name="archive" size={24} color={colors.secondary} />
          <T variant="title" color={colors.text} style={{ marginTop: 24 }}>
            nothing here, yet.
          </T>
          <T
            variant="small"
            color={colors.secondary}
            style={{ textAlign: 'center', marginTop: 12, maxWidth: 235 }}
          >
            choose “save for later” on a nudge. it’ll be waiting here.
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="preview archive"
            onPress={() => {
              setSelected(2);
              setPreview(true);
            }}
            style={s.preview}
          >
            <T variant="small" color={colors.text}>
              explore collection ↗
            </T>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={s.lens} onLayout={(e) => setViewport(e.nativeEvent.layout.height)}>
            <Animated.ScrollView
              ref={scroll}
              testID="archive-scroll"
              showsVerticalScrollIndicator={false}
              snapToInterval={step}
              decelerationRate="fast"
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingVertical: Math.max(0, (viewport - step) / 2) }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: offset } } }], {
                useNativeDriver: Platform.OS !== 'web',
                listener: (e: any) =>
                  setSelected(
                    Math.max(
                      0,
                      Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / step)),
                    ),
                  ),
              })}
            >
              {items.map((item, index) => {
                const half = Math.max(step * 1.15, viewport * 0.48);
                const range = [
                  index * step - half,
                  index * step - step * 0.55,
                  index * step,
                  index * step + step * 0.55,
                  index * step + half,
                ];
                const interpolate = (outputRange: number[]) =>
                  offset.interpolate({ inputRange: range, outputRange, extrapolate: 'clamp' });
                return (
                  <View key={item.id} style={s.row}>
                    <Animated.View
                      testID={`archive-card-${item.id}`}
                      style={{
                        zIndex: selected === index ? 4 : 1,
                        opacity: reduce ? 1 : interpolate([0.22, 0.72, 1, 0.72, 0.22]),
                        transform: reduce
                          ? []
                          : [
                              { perspective: 980 },
                              {
                                rotateX: offset.interpolate({
                                  inputRange: range,
                                  outputRange: ['-72deg', '-28deg', '0deg', '28deg', '72deg'],
                                  extrapolate: 'clamp',
                                }),
                              },
                              // Fisheye: edges stretch wide + squash tall; center is much larger + flat.
                              {
                                scaleX: interpolate([2.55, 0.95, focusScale, 0.95, 2.55]),
                              },
                              {
                                scaleY: interpolate([0.34, 0.72, focusScale, 0.72, 0.34]),
                              },
                            ],
                      }}
                    >
                      <ArchiveObject
                        name={item.name}
                        size={reduce && selected === index ? Math.round(tile * 1.55) : tile}
                        reduce={reduce}
                        label={`${item.name.toLowerCase()}, ${money(item.amount)}, saved ${savedDate(item.savedAt)}, from ${savedSource(item)}`}
                        onPress={() => {
                          if (selected !== index) focus(index);
                          else setDetail(item);
                        }}
                      />
                    </Animated.View>
                    {selected === index && (
                      <>
                        <View
                          pointerEvents="none"
                          style={[
                            s.date,
                            {
                              width: sideWidth,
                              marginRight: labelClearance,
                            },
                          ]}
                        >
                          <T
                            variant="mono"
                            color={colors.secondary}
                            style={{ fontSize: 8, lineHeight: 13 }}
                          >
                            saved
                          </T>
                          <T
                            variant="small"
                            color={colors.secondary}
                            style={{ fontSize: 10, lineHeight: 14 }}
                          >
                            {savedDate(item.savedAt)}
                          </T>
                          <T
                            variant="small"
                            color={colors.muted}
                            style={{ fontSize: 9, lineHeight: 13, marginTop: 4 }}
                          >
                            {savedSource(item)}
                          </T>
                        </View>
                        <View
                          pointerEvents="none"
                          style={[
                            s.label,
                            {
                              width: sideWidth,
                              marginLeft: labelClearance,
                            },
                          ]}
                        >
                          <T
                            variant="title"
                            color={colors.text}
                            style={{ fontSize: width < 360 ? 15 : 19, lineHeight: 23 }}
                          >
                            {item.name}
                          </T>
                          <T
                            variant="small"
                            color={palettes[state.hue].body}
                            style={{ marginTop: 6, fontSize: 12 }}
                          >
                            {money(item.amount)}
                          </T>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </Animated.ScrollView>
            {!reduce && (
              <>
                {/* Soft circular lens falloff at the extremes — not a mid-frame halo. */}
                <View
                  pointerEvents="none"
                  style={[
                    s.lensGlow,
                    {
                      top: -Math.max(160, viewport * 0.42),
                      opacity: 0.55,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    s.lensGlow,
                    {
                      bottom: -Math.max(160, viewport * 0.42),
                      opacity: 0.55,
                    },
                  ]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.bg, colors.bg + 'E6', colors.bg + '00']}
                  locations={[0, 0.4, 1]}
                  style={[s.fade, { top: 0, height: Math.max(110, viewport * 0.28) }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.bg + '00', colors.bg + 'E6', colors.bg]}
                  locations={[0, 0.6, 1]}
                  style={[s.fade, { bottom: 0, height: Math.max(110, viewport * 0.28) }]}
                />
              </>
            )}
          </View>
          <View style={s.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="previous saved item"
              disabled={selected === 0}
              onPress={() => focus(selected - 1)}
              style={[s.arrow, { opacity: selected === 0 ? 0.25 : 1 }]}
            >
              <Icon name="chevron-up" size={15} color={colors.text} />
            </Pressable>
            <T
              variant="mono"
              color={colors.secondary}
            >{`${String(selected + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`}</T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="next saved item"
              disabled={selected === items.length - 1}
              onPress={() => focus(selected + 1)}
              style={[s.arrow, { opacity: selected === items.length - 1 ? 0.25 : 1 }]}
            >
              <Icon name="chevron-down" size={15} color={colors.text} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={preview ? 'close archive preview' : 'open saved item'}
            onPress={() =>
              preview ? (setSelected(0), setPreview(false)) : setDetail(items[selected])
            }
            style={s.bottom}
          >
            <T variant="small" color={colors.secondary} style={{ fontSize: 10 }}>
              {preview ? 'close' : 'tap an item to revisit'}
            </T>
          </Pressable>
        </>
      )}
      <Sheet visible={!!detail} title={detail?.name} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <ItemArtwork name={detail.name} size={180} />
            </View>
            <T variant="title" style={{ textAlign: 'center' }}>
              {money(detail.amount)}
            </T>
            <T variant="small" style={{ textAlign: 'center', marginTop: 8 }}>
              saved {savedDate(detail.savedAt)}
            </T>
            <T variant="small" style={{ textAlign: 'center', marginTop: 4 }}>
              {savedSource(detail)}
            </T>
            {!preview && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="revisit this item"
                onPress={() => revisit(detail)}
                style={s.detailAction}
              >
                <T>revisit this item ↗</T>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="keep for later"
              onPress={() => setDetail(null)}
              style={s.detailAction}
            >
              <T variant="small">keep for later</T>
            </Pressable>
          </>
        )}
      </Sheet>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  preview: { padding: 18, marginTop: 22 },
  lens: { flex: 1, overflow: 'hidden', marginTop: 8 },
  row: {
    height: step,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  card: {
    width: tile,
    height: tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    position: 'absolute',
    right: '50%',
    alignItems: 'flex-end',
    zIndex: 5,
  },
  label: { position: 'absolute', left: '50%', zIndex: 5 },
  fade: { position: 'absolute', left: 0, right: 0 },
  lensGlow: {
    position: 'absolute',
    alignSelf: 'center',
    width: '140%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: '#C45A2A18',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', padding: 8 },
  detailAction: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
});

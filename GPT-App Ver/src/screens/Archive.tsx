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
import { archiveSamples, savedDate, type SavedItem } from '../state/archive';
import { money } from '../state/model';
import { colors, palettes } from '../design/tokens';
import { ArchiveObject } from '../components/ArchiveObject';
import { ItemArtwork } from '../components/ItemArtwork';
import { Icon, Sheet, T, tap } from '../components/ui';

const step = 140,
  tile = 112;
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
      <View style={s.header}>
        <T color={colors.text} style={{ fontSize: 14 }}>
          for another day.
        </T>
        <T variant="mono" color={colors.secondary}>
          {preview ? 'preview' : `${items.length} saved`}
        </T>
      </View>
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
              preview the collection ↗
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
                const range = [
                  index * step - Math.max(step + 1, viewport / 2),
                  index * step - step,
                  index * step,
                  index * step + step,
                  index * step + Math.max(step + 1, viewport / 2),
                ];
                const interpolate = (outputRange: number[]) =>
                  offset.interpolate({ inputRange: range, outputRange, extrapolate: 'clamp' });
                return (
                  <View key={item.id} style={s.row}>
                    <Animated.View
                      testID={`archive-card-${item.id}`}
                      style={{
                        opacity: reduce ? 1 : interpolate([0.45, 0.9, 1, 0.9, 0.45]),
                        transform: reduce
                          ? []
                          : [
                              { perspective: 450 },
                              {
                                rotateX: offset.interpolate({
                                  inputRange: range,
                                  outputRange: ['-48deg', '-9deg', '0deg', '9deg', '48deg'],
                                  extrapolate: 'clamp',
                                }),
                              },
                              { scaleX: interpolate([1.65, 1, 1.45, 1, 1.65]) },
                              { scaleY: interpolate([1.1, 0.96, 1.45, 0.96, 1.1]) },
                            ],
                      }}
                    >
                      <ArchiveObject
                        name={item.name}
                        size={tile}
                        reduce={reduce}
                        label={`${item.name.toLowerCase()}, ${money(item.amount)}, saved ${savedDate(item.savedAt)}`}
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
                          style={[s.date, { width: Math.min(78, width / 2 - 96) }]}
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
                        </View>
                        <View
                          pointerEvents="none"
                          style={[s.label, { width: Math.min(88, width / 2 - 96) }]}
                        >
                          <T
                            variant="title"
                            color={colors.text}
                            style={{ fontSize: width < 360 ? 14 : 17, lineHeight: 21 }}
                          >
                            {item.name}
                          </T>
                          <T
                            variant="small"
                            color={palettes[state.hue].body}
                            style={{ marginTop: 6, fontSize: 11 }}
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
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.bg, colors.bg + '00']}
                  style={[s.fade, { top: 0 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[colors.bg + '00', colors.bg]}
                  style={[s.fade, { bottom: 0 }]}
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
              {preview ? 'sample collection · close preview' : 'tap an item to revisit'}
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
            {preview ? (
              <T variant="small" style={{ textAlign: 'center', marginTop: 24 }}>
                a sample item for the archive preview.
              </T>
            ) : (
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
  lens: { flex: 1, overflow: 'hidden', marginTop: 20 },
  row: { height: step, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: tile,
    height: tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    position: 'absolute',
    right: '50%',
    marginRight: 84,
    width: 78,
    alignItems: 'flex-end',
  },
  label: { position: 'absolute', left: '50%', marginLeft: 84, width: 88 },
  fade: { position: 'absolute', left: 0, right: 0, height: 55 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', padding: 8 },
  detailAction: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
});

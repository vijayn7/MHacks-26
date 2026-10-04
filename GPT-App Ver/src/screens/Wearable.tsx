import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/Store';
import { recentReading } from '../state/wearable';
import { colors } from '../design/tokens';
import { Icon, QuietButton, Sheet, T } from '../components/ui';
import { WatchConnection } from '../components/WatchConnection';
import { FeelingOrb, HeartScale } from '../components/WearableVisuals';

export default function Wearable() {
  const { state, dispatch } = useStore();
  const w = state.wearable;
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(false);
  const [remove, setRemove] = useState(false);
  const measured = w.moments.filter((m) => m.bpm);
  const average = measured.length
    ? Math.round(measured.reduce((n, m) => n + m.bpm![1], 0) / measured.length)
    : null;
  const reported = w.moments.flatMap((m) => m.before);
  const common = [...new Set(reported)]
    .sort((a, b) => reported.filter((f) => f === b).length - reported.filter((f) => f === a).length)
    .slice(0, 3);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 28, paddingBottom: 40 + insets.bottom }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="back"
            onPress={() => router.back()}
            style={{ padding: 10 }}
          >
            <Icon name="arrow-left" />
          </Pressable>
          <T variant="small">your moments</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="wearable settings"
            onPress={() => setSettings(true)}
            style={{ padding: 10 }}
          >
            <Icon name="settings" />
          </Pressable>
        </View>
        {w.status !== 'connected' ? (
          <WatchConnection />
        ) : (
          <>
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <FeelingOrb selected={common} size={230} />
            </View>
            <HeartScale bpm={recentReading(w)} baseline={w.baseline} />
            <T variant="small" style={{ textAlign: 'center', marginBottom: 16 }}>
              {!w.enabled
                ? 'insights paused'
                : !recentReading(w)
                  ? 'reading expired · sync in settings'
                  : 'demo watch connected'}
            </T>
          </>
        )}
        <QuietButton
          onPress={() => {
            const id = `watch-demo-${Date.now()}`;
            dispatch({ type: 'DEMO_PURCHASE', id });
            router.push({ pathname: '/moment', params: { nudge: id } });
          }}
        >
          try a spending moment
        </QuietButton>
        {!!measured.length && (
          <T variant="small" style={{ textAlign: 'center', marginTop: 18 }}>
            {average} bpm average during {measured.length} demo moments
          </T>
        )}
        {!!common.length && (
          <T variant="small" style={{ textAlign: 'center', marginTop: 8 }}>
            you reported {common.join(' + ')}
          </T>
        )}
        {!w.moments.length ? (
          <T variant="small" style={{ textAlign: 'center', marginTop: 24 }}>
            your check-ins will live here.
          </T>
        ) : (
          <View style={{ marginTop: 28 }}>
            {w.moments.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`view moment ${m.name}`}
                onPress={() => router.push({ pathname: '/moment', params: { event: m.id } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <FeelingOrb selected={m.before} intensity={m.intensity} size={58} />
                <View style={{ flex: 1 }}>
                  <T>{m.name}</T>
                  <T variant="small">
                    {new Date(m.at).toLocaleDateString()} · {m.outcome}
                  </T>
                </View>
                <Icon name="chevron-right" size={16} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <Sheet
        visible={settings}
        title="watch & feelings"
        onClose={() => setSettings(false)}
        expanded
      >
        <T>{w.status} · demo</T>
        <T variant="small">{w.baseline ? `baseline ${w.baseline} bpm` : 'no baseline yet'}</T>
        <QuietButton
          secondary
          onPress={() => dispatch({ type: 'WEARABLE', settings: { enabled: !w.enabled } })}
        >
          {w.enabled ? 'pause insights' : 'enable insights'}
        </QuietButton>
        <QuietButton
          secondary
          onPress={() => {
            dispatch({
              type: 'WEARABLE',
              settings: { status: 'disconnected', enabled: false, reading: null },
            });
            setSettings(false);
          }}
        >
          disconnect / reconnect
        </QuietButton>
        <QuietButton
          secondary
          onPress={() => {
            dispatch({
              type: 'WEARABLE',
              settings: {
                status: 'connected',
                enabled: true,
                baseline: 68,
                reading: { bpm: 82, at: Date.now() },
              },
            });
            setSettings(false);
          }}
        >
          sync demo readings
        </QuietButton>
        <T variant="small" style={{ marginTop: 18 }}>
          permission scenarios · simulated
        </T>
        {(['denied', 'unavailable', 'stale', 'partial'] as const).map((s) => (
          <QuietButton
            key={s}
            secondary
            onPress={() => {
              dispatch({
                type: 'WEARABLE',
                settings: {
                  status:
                    s === 'denied' ? 'denied' : s === 'unavailable' ? 'unavailable' : 'connected',
                  reading: s === 'stale' ? { bpm: 82, at: Date.now() - 600000 } : null,
                },
              });
              setSettings(false);
            }}
          >
            {s === 'partial'
              ? 'heart rate not shared'
              : s === 'unavailable'
                ? 'watch unavailable'
                : s === 'stale'
                  ? 'delayed reading'
                  : 'deny health access'}
          </QuietButton>
        ))}
        <T variant="small">
          health permissions are simulated here. no system permission has been requested.
        </T>
        <QuietButton secondary onPress={() => setRemove(true)}>
          delete watch & feeling data
        </QuietButton>
        {remove && (
          <>
            <T variant="small">delete all local readings, baseline, and check-ins?</T>
            <QuietButton
              onPress={() => {
                dispatch({ type: 'DELETE_WEARABLE_DATA' });
                setRemove(false);
                setSettings(false);
              }}
            >
              delete data
            </QuietButton>
            <QuietButton secondary onPress={() => setRemove(false)}>
              cancel
            </QuietButton>
          </>
        )}
      </Sheet>
    </View>
  );
}

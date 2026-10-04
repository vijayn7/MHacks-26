import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Nudge } from '../state/model';
import type { NudgeResponse } from './notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
async function configure() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('quiet', {
      name: 'quiet nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  await Notifications.setNotificationCategoryAsync('snuff', [
    { identifier: 'SAVE', buttonTitle: 'save for later', options: { opensAppToForeground: true } },
    { identifier: 'SNUFF', buttonTitle: 'snuff it', options: { opensAppToForeground: true } },
    {
      identifier: 'LATER',
      buttonTitle: 'tomorrow, maybe',
      options: { opensAppToForeground: true },
    },
  ]);
}
export async function enableNudges() {
  await configure();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: false },
      });
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export async function disableNudges() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
export async function cancelNudge(id: string) {
  await Notifications.cancelScheduledNotificationAsync('snuff_' + id);
  await Notifications.dismissNotificationAsync('snuff_' + id);
}
export async function scheduleNudge(nudge: Nudge, seconds: number) {
  await configure();
  await Notifications.scheduleNotificationAsync({
    identifier: 'snuff_' + nudge.id,
    content: {
      title: 'snuff',
      body: nudge.name.toLowerCase() + ' can wait. a little space is all you need.',
      categoryIdentifier: 'snuff',
      data: { nudgeId: nudge.id },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: 'quiet',
    },
  });
}
export function subscribeToNudges(listener: (response: NudgeResponse) => void) {
  const receive = (r: Notifications.NotificationResponse) => {
    const id = r.notification.request.content.data?.nudgeId;
    if (typeof id !== 'string') return;
    listener({
      id,
      action:
        r.actionIdentifier === 'SAVE'
          ? 'save'
          : r.actionIdentifier === 'SNUFF'
            ? 'snuff'
            : r.actionIdentifier === 'LATER'
              ? 'later'
              : 'open',
    });
    Notifications.clearLastNotificationResponse();
  };
  const sub = Notifications.addNotificationResponseReceivedListener(receive);
  const last = Notifications.getLastNotificationResponse();
  if (last) receive(last);
  return () => sub.remove();
}

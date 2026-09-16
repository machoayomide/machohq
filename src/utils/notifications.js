import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('focus', {
        name: 'Focus Blocks',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#00d4aa', sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250], lightColor: '#7c5cfc',
      });
    }
    return status === 'granted';
  } catch { return false; }
}

// SDK 52 requires an explicit trigger type. Without it the notification
// fires immediately, which is why everything arrived at once on first open.
export async function scheduleBlockEnd(blockName, secondsFromNow) {
  try {
    if (!secondsFromNow || secondsFromNow < 5) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${blockName} Block complete`,
        body: 'Time to check in. Did you work the full block?',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false,
        channelId: 'focus',
      },
    });
  } catch { return null; }
}

export async function scheduleMidBlockCheck(blockName, secondsFromNow) {
  try {
    if (!secondsFromNow || secondsFromNow < 60) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: `Halfway through ${blockName}`, body: 'Still on task? Finish strong.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false,
        channelId: 'focus',
      },
    });
  } catch { return null; }
}

export async function scheduleReminder(title, body, secondsFromNow) {
  try {
    if (!secondsFromNow || secondsFromNow < 5) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false,
        channelId: 'reminders',
      },
    });
  } catch { return null; }
}

export async function scheduleDaily(title, body, hour, minute) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour, minute,
        channelId: 'reminders',
      },
    });
  } catch { return null; }
}

export async function cancelNotification(id) {
  try { if (id) await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}
export async function cancelAll() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

// Random accountability pings — fired at unpredictable times so you cannot
// game them. Schedules 3 for the rest of today within the active window.
export async function scheduleAccountabilityPings(startHour = 9, endHour = 21, count = 3) {
  const now = new Date();
  const ids = [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const from = Math.max(nowMin + 30, startMin);
  if (from >= endMin) return ids;

  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(from + Math.random() * (endMin - from));
  }
  slots.sort((a, b) => a - b);

  const messages = [
    { title: 'Where are you right now?', body: 'And what are you actually doing?' },
    { title: 'Quick check', body: 'Is this moving you toward Director, or away?' },
    { title: 'Accountability ping', body: 'How many people have you contacted today?' },
    { title: 'Honest question', body: 'Phone or work? Answer truthfully.' },
  ];

  for (const slot of slots) {
    const seconds = Math.round((slot - nowMin) * 60);
    if (seconds < 60) continue;
    const msg = messages[Math.floor(Math.random() * messages.length)];
    const id = await scheduleReminder(msg.title, msg.body, seconds);
    if (id) ids.push(id);
  }
  return ids;
}

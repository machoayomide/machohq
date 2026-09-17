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
        lightColor: '#7C5CFF', sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250], lightColor: '#7C5CFF',
      });
      await Notifications.setNotificationChannelAsync('alarms', {
        name: 'Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FF5D73', sound: 'default',
      });
    }
    return status === 'granted';
  } catch { return false; }
}

// All notifications now carry a data.screen field for deep-linking.
// When tapped, App.js reads data.screen and navigates there.

export async function scheduleBlockEnd(blockName, secondsFromNow) {
  try {
    if (!secondsFromNow || secondsFromNow < 5) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${blockName} — Block complete`,
        body: 'Time to check in. Did you work the full block?',
        sound: 'default',
        data: { screen: 'focus' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false, channelId: 'focus',
      },
    });
  } catch { return null; }
}

export async function scheduleMidBlockCheck(blockName, secondsFromNow) {
  try {
    if (!secondsFromNow || secondsFromNow < 60) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Halfway through ${blockName}`,
        body: 'Still on task? Finish strong.',
        data: { screen: 'focus' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false, channelId: 'focus',
      },
    });
  } catch { return null; }
}

export async function scheduleReminder(title, body, secondsFromNow, screen = null) {
  try {
    if (!secondsFromNow || secondsFromNow < 5) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data: screen ? { screen } : {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false, channelId: 'reminders',
      },
    });
  } catch { return null; }
}

export async function scheduleDaily(title, body, hour, minute, screen = null) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data: screen ? { screen } : {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour, minute, channelId: 'reminders',
      },
    });
  } catch { return null; }
}

// Schedule all daily nudges with deep-link targets
export async function scheduleDailyNudges() {
  await cancelAll();
  await scheduleDaily('Morning Attack Plan', 'Who needs you today? Messages are ready.', 7, 0, 'attack');
  await scheduleDaily('Midday PV Check', 'How is the QPV looking? Log any new orders.', 13, 0, 'neolife');
  await scheduleDaily('Outreach Reminder', 'Have you hit your prospect target today?', 15, 0, 'outreach');
  await scheduleDaily('Reading Time', '15 pages. No excuses.', 20, 30, 'reading');
  await scheduleDaily('Journal', 'Write your no-excuses reflection.', 22, 0, 'journal');
  await scheduleAccountabilityPings();
}

// Alarm — shows persistent notification with countdown info
export async function scheduleAlarm(title, secondsFromNow) {
  try {
    if (!secondsFromNow || secondsFromNow < 5) return null;
    const mins = Math.round(secondsFromNow / 60);
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Alarm: ${title}`,
        body: `${mins} minutes have passed. Time's up!`,
        sound: 'default',
        data: { screen: 'focus' },
        priority: 'max',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        repeats: false, channelId: 'alarms',
      },
    });
  } catch { return null; }
}

// Live timer in notification — update every minute
export async function updateTimerNotification(blockName, remainingSeconds) {
  try {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${blockName} — ${timeStr} remaining`,
        body: 'Stay focused. You got this.',
        data: { screen: 'focus' },
        sticky: true,
      },
      trigger: null, // fire immediately as ongoing notification
    });
  } catch {}
}

export async function cancelNotification(id) {
  try { if (id) await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}
export async function cancelAll() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

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
    { title: 'Prospecting check', body: 'Have you reached out to anyone new today?' },
  ];

  for (const slot of slots) {
    const seconds = Math.round((slot - nowMin) * 60);
    if (seconds < 60) continue;
    const msg = messages[Math.floor(Math.random() * messages.length)];
    const id = await scheduleReminder(msg.title, msg.body, seconds, 'score');
    if (id) ids.push(id);
  }
  return ids;
}

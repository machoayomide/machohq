import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
        lightColor: '#00d4aa',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#7c5cfc',
      });
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

// Schedule notification for when a focus block ends
export async function scheduleBlockEnd(blockName, secondsFromNow) {
  try {
    if (secondsFromNow < 1) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${blockName} Block complete`,
        body: 'Time to check in. Did you work the full block?',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        seconds: Math.round(secondsFromNow),
        channelId: 'focus',
      },
    });
    return id;
  } catch {
    return null;
  }
}

// Halfway-point nudge to keep you honest
export async function scheduleMidBlockCheck(blockName, secondsFromNow) {
  try {
    if (secondsFromNow < 1) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Halfway through ${blockName}`,
        body: 'Still on task? Put the phone down and finish strong.',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { seconds: Math.round(secondsFromNow), channelId: 'focus' },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(id) {
  try { if (id) await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}

export async function cancelAll() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

// Generic reminder — used for prospect follow-ups, PV deadlines, reading
export async function scheduleReminder(title, body, secondsFromNow) {
  try {
    if (secondsFromNow < 1) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, priority: Notifications.AndroidNotificationPriority.HIGH },
      trigger: { seconds: Math.round(secondsFromNow), channelId: 'reminders' },
    });
  } catch {
    return null;
  }
}

// Daily repeating reminder at a set hour/minute
export async function scheduleDaily(title, body, hour, minute) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, priority: Notifications.AndroidNotificationPriority.HIGH },
      trigger: { hour, minute, repeats: true, channelId: 'reminders' },
    });
  } catch {
    return null;
  }
}
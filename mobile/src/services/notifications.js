import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show banners even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask the user for notification permission.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Android channel setup (no-op on iOS)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deadlines', {
      name: 'Deadline reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return finalStatus === 'granted';
}

/**
 * Schedule 3 reminders for a stake:
 *   - 24 hours before deadline
 *   - 1 hour before deadline
 *   - at the deadline itself
 *
 * Only schedules notifications that are in the future.
 * Returns an array of notification IDs so they can be cancelled later.
 */
export async function scheduleStakeReminders(stake) {
  const granted = await requestNotificationPermission();
  if (!granted) return [];

  const deadline = new Date(stake.deadline);
  const now = new Date();
  const ids = [];

  const reminders = [
    {
      offsetMs: 24 * 60 * 60 * 1000, // 24 hours before
      title: '⏰ 24 hours left',
      body: `Don't forget — $${stake.stake_amount} is on the line for "${stake.title}".`,
    },
    {
      offsetMs: 60 * 60 * 1000, // 1 hour before
      title: '🔥 1 hour left',
      body: `Crunch time. Finish "${stake.title}" or lose $${stake.stake_amount}.`,
    },
    {
      offsetMs: 0, // at deadline
      title: '⚡ Deadline hit',
      body: `Time's up on "${stake.title}". Upload proof now if you did it!`,
    },
  ];

  for (const r of reminders) {
    const fireAt = new Date(deadline.getTime() - r.offsetMs);
    const secondsUntil = Math.floor((fireAt.getTime() - now.getTime()) / 1000);

    // Skip any reminder that would fire in the past
    if (secondsUntil <= 0) continue;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.body,
          data: { stakeId: stake.id, type: 'deadline_reminder' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
        },
      });
      ids.push(id);
    } catch (err) {
      console.warn('Failed to schedule notification:', err);
    }
  }

  return ids;
}

/**
 * Cancel all notifications tied to a given stake ID.
 * Called when a stake is cancelled, completed, or fails.
 */
export async function cancelStakeReminders(stakeId) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (n) => n.content?.data?.stakeId === stakeId
    );
    await Promise.all(
      toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch (err) {
    console.warn('Failed to cancel notifications:', err);
  }
}

/**
 * Cancel all app notifications (e.g., on sign-out).
 */
export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Failed to cancel all notifications:', err);
  }
}

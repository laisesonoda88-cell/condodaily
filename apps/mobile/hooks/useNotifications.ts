import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { notificationService } from '../services/notifications';
import { useAuthStore } from '../stores/authStore';

// Configure how notifications are presented when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications don't work in simulators
  if (!Device.isDevice) {
    console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });

    console.log('[Notifications] Push token:', tokenData.data);

    // Android: configure notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'CondoDaily',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B7A6E',
        sound: 'default',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

export function useNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Cleanup when user logs out
      registeredRef.current = false;
      return;
    }

    // Prevent duplicate registration
    if (registeredRef.current) return;
    registeredRef.current = true;

    // Register push token with backend
    registerForPushNotifications().then(async (token) => {
      if (token) {
        try {
          await notificationService.registerPushToken(token);
          console.log('[Notifications] Token registered with backend');
        } catch (error) {
          console.error('[Notifications] Failed to register token:', error);
          registeredRef.current = false; // Allow retry
        }
      }
    });

    // Listener: notification received while app is in foreground
    notificationListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Received in foreground:', notification.request.content.title);
      }
    );

    // Listener: user tapped on a notification
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('[Notifications] User tapped notification:', data);

        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
        notificationListenerRef.current = null;
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // Check if app was opened via a notification (cold start)
  useEffect(() => {
    if (!isAuthenticated) return;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        console.log('[Notifications] App opened from notification:', data);
        handleNotificationNavigation(data);
      }
    });
  }, [isAuthenticated]);

  const handleNotificationNavigation = (data: Record<string, unknown>) => {
    if (!data) return;

    const screen = data.screen as string | undefined;
    const bookingId = data.bookingId as string | undefined;

    if (screen === 'booking-details' && bookingId) {
      // Navigate to the booking details screen
      // The router will figure out the correct group based on user role
      const { user } = useAuthStore.getState();
      if (user?.role === 'CONTRATANTE') {
        router.push({
          pathname: '/(contratante)/booking-details',
          params: { id: bookingId },
        } as any);
      } else {
        router.push({
          pathname: '/(profissional)/booking-details',
          params: { id: bookingId },
        } as any);
      }
    }
  };
}

import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../stores/authStore';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useProtectedRoute(isAuthenticated: boolean, isLoading: boolean, userRole: string | undefined) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      if (userRole === 'CONTRATANTE') {
        router.replace('/(contratante)/home');
      } else {
        router.replace('/(profissional)/home');
      }
    }
  }, [isAuthenticated, isLoading, segments]);
}

export default function RootLayout() {
  const { isAuthenticated, isLoading, user, loadUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    loadUser().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading && (fontsLoaded || ready)) {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, fontsLoaded]);

  // Force ready after 3s
  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  useProtectedRoute(isAuthenticated, isLoading || !ready, user?.role);

  // ─── Deep Link Handler (MP OAuth callback) ─────────
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (url.startsWith('condodaily://mp-oauth-success')) {
        router.replace('/(profissional)/payment-setup?mp_connected=true');
      } else if (url.startsWith('condodaily://mp-oauth-error')) {
        const params = new URL(url.replace('condodaily://', 'https://x.com/')).searchParams;
        const reason = params.get('reason') || 'unknown';
        router.replace(`/(profissional)/payment-setup?mp_error=${reason}`);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // Check cold start deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, []);

  if (!ready && !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B7A6E' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}

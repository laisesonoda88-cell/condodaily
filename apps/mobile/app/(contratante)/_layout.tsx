import { useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../constants/theme';
import { useCondoStore } from '../../stores/condoStore';
import { useAuthStore } from '../../stores/authStore';

export default function ContratanteLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { activeCondo, restoreActiveCondo } = useCondoStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    restoreActiveCondo();
  }, []);

  useEffect(() => {
    // Redirecionar para seleção de condomínio se não tem condo ativo
    // Mas só se já está autenticado e não está na tela de select-condo ou condo-setup
    const currentScreen = segments[segments.length - 1];
    if (
      isAuthenticated &&
      !activeCondo &&
      currentScreen !== 'select-condo' &&
      currentScreen !== 'condo-setup'
    ) {
      router.replace('/(contratante)/select-condo');
    }
  }, [activeCondo, isAuthenticated, segments]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: FONTS.sizes.xs,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Carteira',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="select-condo" options={{ href: null }} />
      <Tabs.Screen name="condo-setup" options={{ href: null }} />
      <Tabs.Screen name="professional-profile" options={{ href: null }} />
      <Tabs.Screen name="new-booking" options={{ href: null }} />
      <Tabs.Screen name="booking-details" options={{ href: null }} />
      <Tabs.Screen name="rate-service" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="delete-account" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="condo-recommendations" options={{ href: null }} />
    </Tabs>
  );
}

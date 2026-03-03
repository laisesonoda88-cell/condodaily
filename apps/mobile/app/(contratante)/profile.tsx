import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <View style={styles.header}>
        <Text style={styles.title}>Meu Perfil</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name?.[0] || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Contratante</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        {([
          { iconFamily: 'MaterialCommunityIcons', iconName: 'office-building-outline', iconColor: COLORS.primary, label: 'Meu Condominio', action: () => {} },
          { iconFamily: 'MaterialCommunityIcons', iconName: 'chart-timeline-variant', iconColor: COLORS.accent, label: 'Historico de Servicos', action: () => {} },
          { iconFamily: 'Ionicons', iconName: 'notifications-outline', iconColor: COLORS.secondary, label: 'Notificacoes', action: () => {} },
          { iconFamily: 'Feather', iconName: 'help-circle', iconColor: COLORS.info, label: 'Ajuda e Suporte', action: () => {} },
          { iconFamily: 'Feather', iconName: 'file-text', iconColor: COLORS.textSecondary, label: 'Termos de Uso', action: () => {} },
        ] as const).map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.action}>
            <View style={styles.menuIcon}>
              {item.iconFamily === 'MaterialCommunityIcons' && (
                <MaterialCommunityIcons name={item.iconName} size={22} color={item.iconColor} />
              )}
              {item.iconFamily === 'Ionicons' && (
                <Ionicons name={item.iconName} size={22} color={item.iconColor} />
              )}
              {item.iconFamily === 'Feather' && (
                <Feather name={item.iconName} size={22} color={item.iconColor} />
              )}
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.logoutSection}>
        <Button
          title="Sair da Conta"
          onPress={handleLogout}
          variant="outline"
          size="md"
          style={styles.logoutButton}
          textStyle={{ color: COLORS.error }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  name: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  email: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  badge: {
    marginTop: SPACING.sm,
    backgroundColor: '#E8F4FD',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  badgeText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold },
  menu: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: { width: 28, alignItems: 'center' as const, marginRight: SPACING.sm },
  menuLabel: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontFamily: FONTS.regular },
  logoutSection: { marginTop: 'auto', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  logoutButton: { width: '100%', borderColor: COLORS.error },
});

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/user';
import { Button } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';
import { SERVER_URL } from '../../services/api';

export default function ProfissionalProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const getAvatarUrl = () => {
    if (avatarUri) return avatarUri;
    if (user?.avatar_url) return `${SERVER_URL}${user.avatar_url}`;
    return null;
  };

  const handleAvatarPress = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Tirar Foto', onPress: () => handlePickImage('camera') },
      { text: 'Escolher da Galeria', onPress: () => handlePickImage('gallery') },
    ];

    if (user?.avatar_url || avatarUri) {
      options.push({ text: 'Remover Foto', onPress: handleRemoveAvatar, style: 'destructive' });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Foto de Perfil', 'Escolha uma opção', options);
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    try {
      const uri = source === 'camera'
        ? await userService.takePhoto()
        : await userService.pickImage();

      if (!uri) return;

      setAvatarUri(uri);
      setUploading(true);

      const result = await userService.uploadAvatar(uri);
      if (result.success) {
        const profile = await userService.getProfile();
        if (profile.success) {
          useAuthStore.setState({ user: profile.data });
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
      setAvatarUri(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      await userService.deleteAvatar();
      setAvatarUri(null);
      const profile = await userService.getProfile();
      if (profile.success) {
        useAuthStore.setState({ user: profile.data });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível remover a foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const avatarUrl = getAvatarUrl();

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="sunset" opacity={0.12} heightFraction={0.3} position="bottom" />
      <View style={styles.header}>
        <Text style={styles.title}>Meu Perfil</Text>
      </View>

      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer} activeOpacity={0.7}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.full_name?.[0] || 'P'}</Text>
            </View>
          )}
          {uploading ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={COLORS.white} size="small" />
            </View>
          ) : (
            <View style={styles.cameraIcon}>
              <Feather name="camera" size={14} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.badge, { backgroundColor: '#FFF4E0' }]}>
          <Text style={[styles.badgeText, { color: COLORS.secondary }]}>Profissional</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {([
          { iconFamily: 'MaterialCommunityIcons', iconName: 'school-outline', iconColor: COLORS.secondary, label: 'Academy (Quiz)', action: () => router.push('/(profissional)/quiz') },
          { iconFamily: 'MaterialCommunityIcons', iconName: 'tools', iconColor: COLORS.primary, label: 'Meus Serviços', action: () => router.push('/(profissional)/my-services') },
          { iconFamily: 'MaterialCommunityIcons', iconName: 'shield-check-outline', iconColor: COLORS.info, label: 'Verificação de Documentos', action: () => router.push('/(profissional)/documents') },
          { iconFamily: 'MaterialCommunityIcons', iconName: 'cash', iconColor: COLORS.success, label: 'Precificação', action: () => router.push('/(profissional)/pricing') },
          { iconFamily: 'Ionicons', iconName: 'notifications-outline', iconColor: COLORS.secondary, label: 'Notificações', action: () => router.push('/(profissional)/notifications') },
          { iconFamily: 'Feather', iconName: 'help-circle', iconColor: COLORS.info, label: 'Ajuda e Suporte', action: () => router.push('/(profissional)/help') },
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
        <TouchableOpacity
          style={styles.deleteLink}
          onPress={() => router.push('/(profissional)/delete-account')}
        >
          <Text style={styles.deleteLinkText}>Excluir minha conta</Text>
        </TouchableOpacity>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  email: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  badge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold },
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
  deleteLink: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  deleteLinkText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});

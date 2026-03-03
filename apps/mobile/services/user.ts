import { api } from './api';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export const userService = {
  getProfile: async () => {
    const { data } = await api.get('/users/me');
    return data;
  },

  updateProfile: async (payload: { full_name?: string; phone?: string }) => {
    const { data } = await api.put('/users/me', payload);
    return data;
  },

  uploadAvatar: async (imageUri: string) => {
    const formData = new FormData();

    // Preparar o arquivo para upload
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      name: filename,
      type,
    } as any);

    const { data } = await api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000, // 30s para upload
    });

    return data;
  },

  deleteAvatar: async () => {
    const { data } = await api.delete('/users/avatar');
    return data;
  },

  pickImage: async (): Promise<string | null> => {
    // Pedir permissão
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    return result.assets[0].uri;
  },

  takePhoto: async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    return result.assets[0].uri;
  },
};

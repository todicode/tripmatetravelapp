import { Platform } from 'react-native';
export const authApiBaseUrl =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1');
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

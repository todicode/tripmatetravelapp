import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { googleWebClientId } from './authConfig';
import { ApiRequestError } from './session';
const installationIdKey = 'installationId';
let installationIdPromise: Promise<string> | undefined;
export function getInstallationId(): Promise<string> {
  installationIdPromise ??= (async () => {
    const savedId = await SecureStore.getItemAsync(installationIdKey);
    if (savedId) return savedId;

    const newId = Crypto.randomUUID();
    await SecureStore.setItemAsync(installationIdKey, newId);
    return newId;
  })().catch((error) => {
    installationIdPromise = undefined;
    throw error;
  });
  return installationIdPromise;
}
function configureGoogleSignIn() {
  if (!googleWebClientId) {
    throw new ApiRequestError(
      'GOOGLE_CONFIG_MISSING',
      'Chưa có EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong frontend/.env.local.',
      0,
    );
  }

  GoogleSignin.configure({ webClientId: googleWebClientId });
}
export async function getGoogleIdToken(): Promise<string> {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Clear the previous Google selection so users can choose an account on each attempt.
  await GoogleSignin.signOut();
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success' || !result.data.idToken) {
    throw new ApiRequestError('GOOGLE_SIGN_IN_CANCELLED', 'Đăng nhập Google đã bị hủy.', 0);
  }

  return result.data.idToken;
}

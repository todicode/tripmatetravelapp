import { apiRequest } from './api';
import { authApiBaseUrl } from './authConfig';
import { getGoogleIdToken, getInstallationId } from './nativeAuth';
import { ApiRequestError, SessionResponse } from './session';
export { getInstallationId } from './nativeAuth';
export async function authRequest<T>(path: string, body: Record<string, unknown>) {
  return apiRequest<T>(authApiBaseUrl, 'Backend API', path, body);
}
export async function googleAuthRequest(): Promise<SessionResponse> {
  const installationId = await getInstallationId();
  const idToken = await getGoogleIdToken();
  return authRequest<SessionResponse>('/auth/google', { idToken, installationId });
}
export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Đã xảy ra lỗi không xác định.';
}

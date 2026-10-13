import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiRequestError, HttpMethod, RequestOptions, SessionManager, SessionResponse, RealtimeCredentials } from './session';
import { apiRequest } from './api';

export function useSessionViewModel(baseUrl: string) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const loggingOut = useRef(false);
  const [manager] = useState(() => new SessionManager(
    <T,>(path: string, body?: Record<string, unknown>, token?: string, method?: HttpMethod, options?: RequestOptions) =>
      apiRequest<T>(baseUrl, 'Backend API', path, body, token, method, options),
    {
      read: () => SecureStore.getItemAsync('authRefreshSession'),
      write: value => SecureStore.setItemAsync('authRefreshSession', value),
      remove: () => SecureStore.deleteItemAsync('authRefreshSession'),
    },
    setSession,
  ));

  const restoreSession = async () => {
    setRestoring(true);
    setRestoreError(null);
    try { await manager.restore(); }
    catch { setRestoreError('Chưa thể khôi phục phiên đăng nhập. Kiểm tra kết nối rồi thử lại.'); }
    finally { setRestoring(false); }
  };

  useEffect(() => { void restoreSession(); }, [manager]);

  useEffect(() => {
    if (!session) return;
    const refresh = () => {
      if (AppState.currentState !== 'active') return;
      void manager.ensureFresh().then(() => setSessionError(null)).catch(error => {
        setSessionError(error instanceof ApiRequestError && error.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Chưa thể cập nhật phiên đăng nhập. Vui lòng kiểm tra kết nối.');
      });
    };
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [manager, session]);

  const authenticate: (next: SessionResponse, remember?: boolean) => Promise<void> = async (next, remember = true) => {
    await manager.accept(next, remember);
    setSessionError(null);
  };

  const completePhone = async (phone: string) => {
    const profile = await manager.request<{ id: string; phone: string | null }>('/users/me', { phone }, 'PATCH');
    if (!profile || profile.id !== session?.user.id || profile.phone !== phone) {
      throw new ApiRequestError('INVALID_RESPONSE', 'Không xác nhận được số điện thoại đã lưu. Vui lòng thử lại.', 0);
    }
    manager.updatePhone(profile.id, profile.phone);
  };

  const logout = async () => {
    if (!session || loggingOut.current) return;
    loggingOut.current = true;
    try {
      await manager.logout();
      setSessionError(null);
    } catch {
      setSessionError('Đã đóng phiên trên ứng dụng. Chưa xác nhận được việc thu hồi phiên trên máy chủ hoặc xóa thông tin đã lưu; hãy kết nối mạng và thử đăng nhập lại.');
    } finally {
      loggingOut.current = false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await manager.request<void>('/auth/change-password', { currentPassword, newPassword });
    await manager.clear();
  };

  const discardSavedSession = async () => {
    setRestoring(true);
    try { await manager.clear(); setRestoreError(null); }
    catch { setRestoreError('Chưa thể xóa phiên đã lưu. Vui lòng thử lại.'); }
    finally { setRestoring(false); }
  };

  const request = useCallback(<T,>(path: string, body?: Record<string, unknown>, method?: HttpMethod, options?: RequestOptions) =>
    manager.request<T>(path, body, method, options), [manager]);

  const realtimeCredentials = useCallback<RealtimeCredentials>(async (refresh = false) => {
    const url = new URL('/ws', baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return { url: url.toString(), accessToken: await manager.accessToken(refresh) };
  }, [manager, baseUrl]);

  return { session, request, realtimeCredentials, restoring, restoreError, sessionError, restoreSession,
    authenticate, completePhone, logout, changePassword, discardSavedSession };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiRequestError, HttpMethod, SessionManager, SessionResponse } from './session';
import { apiRequest } from './api';

export function useSessionViewModel(baseUrl: string) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const loggingOut = useRef(false);
  const [manager] = useState(() => new SessionManager(
    <T,>(path: string, body?: Record<string, unknown>, token?: string, method?: HttpMethod) =>
      apiRequest<T>(baseUrl, 'Backend API', path, body, token, method),
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

  const request = useCallback(<T,>(path: string, body?: Record<string, unknown>, method?: HttpMethod) =>
    manager.request<T>(path, body, method), [manager]);

  return { session, request, restoring, restoreError, sessionError, restoreSession,
    authenticate, logout, changePassword, discardSavedSession };
}

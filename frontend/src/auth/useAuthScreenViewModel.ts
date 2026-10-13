import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { authApiBaseUrl } from './authConfig';
import type { AuthTab } from './authTypes';
import { ApiRequestError } from './session';
import { useSessionViewModel } from './useSessionViewModel';
export function useAuthScreenViewModel(notify: typeof Alert.alert) {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const {
    session,
    request,
    restoring,
    restoreError,
    sessionError,
    restoreSession,
    authenticate,
    completePhone,
    logout,
    changePassword: updatePassword,
    discardSavedSession,
    realtimeCredentials,
  } = useSessionViewModel(authApiBaseUrl);
  useEffect(() => {
    if (!session) setActiveTab('login');
  }, [session]);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) throw new Error('Cần đăng nhập lại.');
    try {
      await updatePassword(currentPassword, newPassword);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        notify('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại để đổi mật khẩu.');
      }
      throw error;
    }
    notify(
      'Đổi mật khẩu thành công',
      'Các phiên đăng nhập đã được đăng xuất. Hãy đăng nhập bằng mật khẩu mới.',
    );
  };

  return {
    activeTab,
    setActiveTab,
    session,
    request,
    restoring,
    restoreError,
    sessionError,
    restoreSession,
    authenticate,
    completePhone,
    logout,
    changePassword,
    discardSavedSession,
    realtimeCredentials,
  };
}

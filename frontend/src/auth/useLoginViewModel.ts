import { useState } from 'react';
import { Alert } from 'react-native';
import {
  authRequest,
  getApiErrorMessage,
  getInstallationId,
  googleAuthRequest,
} from './authClient';
import type { OnAuthenticated } from './authTypes';
import { SessionResponse } from './session';
import { useSubmissionState } from './useSubmissionState';
export function useLoginViewModel(onAuthenticated: OnAuthenticated, notify: typeof Alert.alert) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [isSubmitting, setIsSubmitting, isBusy, isActive] = useSubmissionState();
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = async () => {
    if (isBusy()) return;
    if (!email.trim() || !password.trim()) {
      notify('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setApiError(null);
    setIsSubmitting(true);
    try {
      const installationId = await getInstallationId();
      const session = await authRequest<SessionResponse>('/auth/login', {
        email: email.trim(),
        installationId,
        password,
      });
      if (!isActive()) return;
      await onAuthenticated(session, rememberMe);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitGoogle = async () => {
    if (isBusy()) return;
    setApiError(null);
    setIsSubmitting(true);
    try {
      const session = await googleAuthRequest();
      if (!isActive()) return;
      await onAuthenticated(session, rememberMe);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    forgotVisible,
    setForgotVisible,
    isSubmitting,
    apiError,
    submit,
    submitGoogle,
  };
}

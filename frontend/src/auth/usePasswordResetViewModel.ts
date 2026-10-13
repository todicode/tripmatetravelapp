import { useState } from 'react';
import { Alert } from 'react-native';
import { authRequest, getApiErrorMessage } from './authClient';
import type { PasswordResetChallenge } from './authTypes';
import { passwordError } from './password';
import { ApiRequestError } from './session';
import { useResendCooldown } from './useResendCooldown';
import { useSubmissionState } from './useSubmissionState';
export function usePasswordResetViewModel(onClose: () => void, notify: typeof Alert.alert) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [challenge, setChallenge] = useState<PasswordResetChallenge | null>(null);
  const cooldown = useResendCooldown(challenge?.resendAvailableAt);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting, isBusy, isActive] = useSubmissionState();
  const [apiError, setApiError] = useState<string | null>(null);

  const requestCode = async () => {
    if (isBusy() || cooldown.seconds > 0) return;
    if (!email.trim()) {
      setApiError('Vui lòng nhập email đăng ký.');
      return;
    }
    setApiError(null);
    setIsSubmitting(true);
    try {
      const nextChallenge = await authRequest<PasswordResetChallenge>(
        '/auth/password-reset/request',
        {
          email: email.trim(),
        },
      );
      if (!isActive()) return;
      setChallenge(nextChallenge);
      setOtp('');
      setStep('otp');
    } catch (error) {
      cooldown.onError(error);
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueToPassword = () => {
    if (isBusy()) return;
    if (!/^\d{6}$/.test(otp)) {
      setApiError('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }
    setApiError(null);
    setStep('password');
  };

  const back = () => {
    if (isBusy()) return;
    setApiError(null);
    if (step === 'password') setStep('otp');
    else if (step === 'otp') setStep('email');
    else onClose();
  };
  const resetPassword = async () => {
    if (isBusy()) return;
    if (!challenge) return;
    const validationError = passwordError(newPassword);
    if (validationError) {
      setApiError(validationError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setApiError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setApiError(null);
    setIsSubmitting(true);
    try {
      await authRequest<void>('/auth/password-reset/confirm', {
        resetId: challenge.resetId,
        otp,
        newPassword,
      });
      if (!isActive()) return;
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setChallenge(null);
      setStep('email');
      onClose();
      notify('Đổi mật khẩu thành công', 'Hãy đăng nhập lại bằng mật khẩu mới.');
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code.startsWith('OTP_') || error.code.startsWith('RESET_'))
      ) {
        setStep('otp');
      }
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    setEmail,
    step,
    setStep,
    challenge,
    cooldown,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    isSubmitting,
    apiError,
    setApiError,
    requestCode,
    continueToPassword,
    resetPassword,
    back,
  };
}

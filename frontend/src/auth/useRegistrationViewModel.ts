import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import {
  authRequest,
  getApiErrorMessage,
  getInstallationId,
  googleAuthRequest,
} from './authClient';
import type { OnAuthenticated, RegistrationChallenge } from './authTypes';
import { passwordError } from './password';
import { SessionResponse } from './session';
import { useResendCooldown } from './useResendCooldown';
import { useSubmissionState } from './useSubmissionState';
export function useRegistrationViewModel(
  onAuthenticated: OnAuthenticated,
  notify: typeof Alert.alert,
) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);
  const cooldown = useResendCooldown(challenge?.resendAvailableAt);
  const [isSubmitting, setIsSubmitting, isBusy, isActive] = useSubmissionState();
  const [apiError, setApiError] = useState<string | null>(null);
  const [verificationUsed, setVerificationUsed] = useState(false);

  const pendingVerificationRef = useRef<string | null>(null);

  const cancelPendingRegistration = () => {
    if (isBusy()) return;
    const pendingId = pendingVerificationRef.current;
    pendingVerificationRef.current = null;
    setVerificationId('');
    setChallenge(null);
    setOtp('');
    setApiError(null);
    setRegisterStep('form');
    setVerificationUsed(false);
    if (pendingId) {
      void authRequest<void>('/auth/register/cancel', { verificationId: pendingId }).catch(
        () => {},
      );
    }
  };

  useEffect(
    () => () => {
      const pendingId = pendingVerificationRef.current;
      if (pendingId) {
        void authRequest<void>('/auth/register/cancel', { verificationId: pendingId }).catch(
          () => {},
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (registerStep !== 'otp') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isSubmitting) cancelPendingRegistration();
      return true;
    });
    return () => subscription.remove();
  }, [registerStep, isSubmitting]);

  const submit = async () => {
    if (isBusy()) return;
    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      notify('Lỗi', 'Vui lòng điền đầy đủ thông tin đăng ký.');
      return;
    }
    if (password !== confirmPassword) {
      notify('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    const validationError = passwordError(password);
    if (validationError) {
      setApiError(validationError);
      return;
    }
    if (!agreeTerms) {
      notify('Thông báo', 'Vui lòng đồng ý với điều khoản sử dụng.');
      return;
    }

    setApiError(null);
    setIsSubmitting(true);
    try {
      const installationId = await getInstallationId();
      const nextChallenge = await authRequest<RegistrationChallenge>('/auth/register', {
        displayName: name.trim(),
        email: email.trim(),
        installationId,
        password,
        phone: phone.trim(),
      });
      if (!isActive()) {
        void authRequest<void>('/auth/register/cancel', {
          verificationId: nextChallenge.verificationId,
        }).catch(() => {});
        return;
      }
      setChallenge(nextChallenge);
      setVerificationId(nextChallenge.verificationId);
      pendingVerificationRef.current = nextChallenge.verificationId;
      setOtp('');
      setRegisterStep('otp');
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (isBusy()) return;
    if (!/^\d{6}$/.test(otp)) {
      setApiError('OTP_INVALID: Vui lòng nhập đủ 6 chữ số.');
      return;
    }

    setApiError(null);
    setIsSubmitting(true);
    try {
      const session = await authRequest<SessionResponse>('/auth/register/verify', {
        otp,
        verificationId,
      });
      pendingVerificationRef.current = null;
      if (!isActive()) return;
      await onAuthenticated(session);
    } catch (error) {
      const used =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'VERIFICATION_ALREADY_USED';
      setVerificationUsed(!!used);
      setApiError(
        used
          ? 'Mã xác minh đã được sử dụng. Nếu bạn vừa xác thực, hãy đăng nhập bằng email và mật khẩu đã đăng ký.'
          : getApiErrorMessage(error),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (isBusy() || cooldown.seconds > 0) return;
    setApiError(null);
    setIsSubmitting(true);
    try {
      const nextChallenge = await authRequest<RegistrationChallenge>('/auth/register/resend', {
        verificationId,
      });
      if (!isActive()) return;
      setChallenge(nextChallenge);
      setOtp('');
      notify('Đã gửi lại mã', 'Vui lòng kiểm tra hộp thư email của bạn.');
    } catch (error) {
      cooldown.onError(error);
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
      await onAuthenticated(session);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    agreeTerms,
    setAgreeTerms,
    registerStep,
    verificationId,
    otp,
    setOtp,
    challenge,
    cooldown,
    isSubmitting,
    apiError,
    verificationUsed,
    cancelPendingRegistration,
    submit,
    verifyOtp,
    resendOtp,
    submitGoogle,
  };
}

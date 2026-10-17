import type { SessionResponse } from './session';
export type AuthTab = 'login' | 'register';
export type OnAuthenticated = (session: SessionResponse, remember?: boolean) => Promise<void>;
export type RegistrationChallenge = {
  verificationId: string;
  expiresAt: string;
  resendAvailableAt: string;
};
export type PasswordResetChallenge = {
  resetId: string;
  expiresAt: string;
  resendAvailableAt: string;
};

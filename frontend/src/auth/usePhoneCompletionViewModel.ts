import { useState } from 'react';
import { getApiErrorMessage } from './authClient';
import { useSubmissionState } from './useSubmissionState';
export function usePhoneCompletionViewModel(onComplete: (phone: string) => Promise<void>) {
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting, isBusy, isActive] = useSubmissionState();
  const [error, setError] = useState<string | null>(null);
  const normalized = phone.trim();
  const invalid = touched && !/^\+?[0-9 ()-]{7,32}$/.test(normalized);

  const submit = async () => {
    if (isBusy()) return;
    setTouched(true);
    if (!/^\+?[0-9 ()-]{7,32}$/.test(normalized)) return;
    setError(null);
    setSubmitting(true);
    try {
      await onComplete(normalized);
    } catch (cause) {
      if (isActive()) setError(getApiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return { phone, setPhone, setTouched, submitting, error, invalid, submit };
}

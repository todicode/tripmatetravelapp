import { useEffect, useState } from 'react';
import { ApiRequestError } from './session';

export function useResendCooldown(availableAt?: string) {
  const [now, setNow] = useState(Date.now());
  const [retryUntil, setRetryUntil] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((Math.max(Date.parse(availableAt ?? '') || 0, retryUntil) - now) / 1000));
  return { seconds, onError: (error: unknown) => {
    if (error instanceof ApiRequestError && error.retryAfterSeconds > 0) {
      setNow(Date.now());
      setRetryUntil(Date.now() + error.retryAfterSeconds * 1000);
    }
  } };
}

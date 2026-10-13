import { useEffect, useState } from 'react';
import { ApiRequestError } from './session';

export function useResendCooldown(availableAt?: string) {
  const [now, setNow] = useState(Date.now());
  const [retryUntil, setRetryUntil] = useState(0);
  const until = Math.max(Date.parse(availableAt ?? '') || 0, retryUntil);
  useEffect(() => {
    setNow(Date.now());
    if (until <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return {
    seconds,
    onError: (error: unknown) => {
      if (error instanceof ApiRequestError && error.retryAfterSeconds > 0) {
        setNow(Date.now());
        setRetryUntil(Date.now() + error.retryAfterSeconds * 1000);
      }
    },
  };
}

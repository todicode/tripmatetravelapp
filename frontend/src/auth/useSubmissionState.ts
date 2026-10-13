import { useEffect, useRef, useState } from 'react';
/** State renders feedback; the ref also blocks taps before React commits the next render. */
export function useSubmissionState() {
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return [
    submitting,
    (value: boolean) => {
      busy.current = value;
      if (active.current) setSubmitting(value);
    },
    () => busy.current,
    () => active.current,
  ] as const;
}

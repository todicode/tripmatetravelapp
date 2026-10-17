import { useEffect, useRef, useState } from 'react';

export function useChatImage(
  key: string | null | undefined,
  load?: (id: string) => Promise<string>,
) {
  const [image, setImage] = useState<{ key: string; uri: string }>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let active = true;
    setImage(undefined);
    setError('');
    if (key && loader.current)
      void loader
        .current(key)
        .then((uri) => {
          if (active) setImage({ key, uri });
        })
        .catch(() => {
          if (active) setError('Chưa tải được ảnh.');
        });
    return () => {
      active = false;
    };
  }, [key, attempt, !!load]);
  return {
    uri: image?.key === key ? image?.uri : undefined,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}

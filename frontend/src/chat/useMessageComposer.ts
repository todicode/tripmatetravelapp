import { useEffect, useRef, useState } from 'react';
import { pickChatImage, releaseChatImage } from './chatImagePicker';
import type { ChatImageDraft } from './chatImageApi';

export function useMessageComposer(
  canSend: boolean,
  sending: boolean,
  onSend: (text: string, image?: ChatImageDraft) => Promise<void>,
  onScroll: () => void,
) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<ChatImageDraft | null>(null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  const draft = useRef(image);
  draft.current = image;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void releaseChatImage(draft.current);
    };
  }, []);
  const choose = async () => {
    if (!canSend || sending || lock.current) return;
    lock.current = true;
    setPicking(true);
    try {
      const next = await pickChatImage();
      if (!alive.current) {
        await releaseChatImage(next);
        return;
      }
      if (next) {
        await releaseChatImage(draft.current);
        setImage(next);
      }
      setError('');
    } catch {
      if (alive.current) setError('Không chọn được ảnh. Vui lòng thử lại.');
    } finally {
      lock.current = false;
      if (alive.current) setPicking(false);
    }
  };
  const submit = async () => {
    if (!canSend || sending || lock.current || (!input.trim() && !image)) return;
    if ([...input].length > 4000) {
      setError('Tin nhắn tối đa 4.000 ký tự.');
      return;
    }
    lock.current = true;
    const text = input,
      file = image;
    setInput('');
    setImage(null);
    draft.current = null;
    setError('');
    onScroll();
    try {
      await onSend(text, file ?? undefined);
    } catch (failure) {
      if (alive.current) {
        setInput((current) => current || text);
        setImage((current) => current ?? file);
        setError(failure instanceof Error ? failure.message : 'Chưa thể gửi. Vui lòng thử lại.');
      }
    } finally {
      lock.current = false;
    }
  };
  return {
    input,
    image,
    error,
    picking,
    choose,
    submit,
    setInput: (value: string) => {
      setInput(value);
      setError('');
    },
    removeImage: () => {
      void releaseChatImage(draft.current);
      setImage(null);
    },
  };
}

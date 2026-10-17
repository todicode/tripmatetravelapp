import { useRef, useState } from 'react';

export function useCreateGroup(
  onCreate: (name: string, members: string[], tripId: string | null) => Promise<void>,
) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const create = async () => {
    if (inFlight.current) return;
    if (!name.trim() || [...name.trim()].length > 100)
      return setError('Tên nhóm cần từ 1 đến 100 ký tự.');
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await onCreate(name.trim(), selected, tripId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không tạo được nhóm. Vui lòng thử lại.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const toggle = (id: string) => {
    if (inFlight.current) return;
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 99
          ? [...current, id]
          : current,
    );
  };
  return { name, setName, selected, toggle, error, busy, create, tripId, setTripId };
}

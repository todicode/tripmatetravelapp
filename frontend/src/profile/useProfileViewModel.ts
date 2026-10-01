import { useEffect } from 'react';
import { useProfileState } from './ProfileProvider';

export function useProfileViewModel() {
  const state = useProfileState();
  useEffect(() => { void state.store.load(); }, [state.store]);
  return { ...state, retry: state.store.load };
}

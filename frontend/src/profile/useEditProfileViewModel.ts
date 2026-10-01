import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useProfileState } from './ProfileProvider';
import { EditProfileModel } from './editProfileModel';

export function useEditProfileViewModel(onBack: () => void, onSaved: () => void) {
  const { store, user } = useProfileState();
  const callbacks = useRef({ onBack, onSaved });
  callbacks.current = { onBack, onSaved };
  const [model] = useState(() => new EditProfileModel(user.displayName, store.save,
    () => callbacks.current.onSaved(), () => callbacks.current.onBack()));
  useEffect(() => { model.setActive(true); return () => model.setActive(false); }, [model]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  return { ...state, email: user.email, fieldError: model.fieldError, canSave: model.canSave,
    setName: model.setName, save: model.save, requestBack: model.requestBack, discard: model.discard };
}

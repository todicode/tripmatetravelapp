import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useProfileState } from './ProfileProvider';
import { EditProfileModel } from './editProfileModel';
import { pickAvatar, releaseAvatar } from './avatarPicker';

export function useEditProfileViewModel(onBack: () => void, onSaved: () => void) {
  const { store, user, profile, avatarUri } = useProfileState();
  const callbacks = useRef({ onBack, onSaved });
  callbacks.current = { onBack, onSaved };
  const [model] = useState(() => new EditProfileModel(user.displayName, store.save,
    () => callbacks.current.onSaved(), () => callbacks.current.onBack(),
    { pick: pickAvatar, release: releaseAvatar, upload: store.uploadAvatar, hasAvatar: !!profile?.avatarMediaId }, store.loadInterestOptions));
  useEffect(() => { model.setActive(true); void model.loadInterestOptions(); return () => model.setActive(false); }, [model]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  return { ...state, avatarUri: state.removeAvatar ? null : state.draftAvatar?.uri ?? avatarUri,
    canRemoveAvatar: model.canRemoveAvatar, chooseAvatar: model.chooseAvatar, removeAvatar: model.removeAvatar,
    toggleInterest: model.toggleInterest, retryInterests: model.loadInterestOptions,
    email: user.email, fieldError: model.fieldError, canSave: model.canSave,
    setName: model.setName, save: model.save, requestBack: model.requestBack, discard: model.discard };
}

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { AuthorizedRequest } from '../auth/session';
import { createProfileApi } from './profileApi';
import { ProfileUser } from './profileModel';
import { ProfileStore } from './profileStore';

const ProfileContext = createContext<ProfileStore | null>(null);

/** Parent keys this provider by user ID and unmounts it on logout. */
export function ProfileProvider({ user, request, children }: {
  user: ProfileUser; request: AuthorizedRequest; children: React.ReactNode;
}) {
  const [store] = useState(() => new ProfileStore(createProfileApi(request, user.id), user));
  useEffect(() => { void store.load(); }, [store]);
  return <ProfileContext.Provider value={store}>{children}</ProfileContext.Provider>;
}

export function useProfileState() {
  const store = useContext(ProfileContext);
  if (!store) throw new Error('ProfileProvider is required.');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, store };
}

import { ProfileApi } from './profileApi';
import { displayNameError, Profile, ProfileUser } from './profileModel';

export type ProfileState = {
  user: ProfileUser;
  profile: Profile | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
};

/** One store per authenticated account tree; token refresh never replaces profile state. */
export class ProfileStore {
  private state: ProfileState;
  private sequence = 0;
  private listeners = new Set<() => void>();
  constructor(private api: ProfileApi, user: ProfileUser) {
    this.state = { user, profile: null, isLoading: false, isSaving: false, errorMessage: null };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(update: Partial<ProfileState>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach(listener => listener());
  }
  load = async () => {
    if (this.state.isSaving) return;
    const sequence = ++this.sequence;
    this.publish({ isLoading: true, errorMessage: null });
    try {
      const profile = await this.api.get();
      if (sequence === this.sequence) this.publish({ profile, user: profile });
    } catch {
      if (sequence === this.sequence) this.publish({ errorMessage: 'Chưa thể tải hồ sơ. Vui lòng thử lại.' });
    } finally {
      if (sequence === this.sequence) this.publish({ isLoading: false });
    }
  };
  save = async (value: string): Promise<boolean> => {
    const name = value.trim();
    const error = displayNameError(name);
    if (error) throw new Error(error);
    if (this.state.isSaving || name === this.state.user.displayName) return false;
    ++this.sequence; // Invalidate every GET begun before this write, even if the write fails.
    this.publish({ isSaving: true, isLoading: false, errorMessage: null });
    try {
      const profile = await this.api.update(name);
      this.publish({ profile, user: profile });
      return true;
    } finally { this.publish({ isSaving: false }); }
  };
}

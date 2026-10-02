import { ProfileApi } from './profileApi';
import { AvatarDraft, displayNameError, Profile, ProfileUser } from './profileModel';

export type ProfileState = {
  user: ProfileUser;
  profile: Profile | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  avatarUri: string | null;
};

/** One store per authenticated account tree; token refresh never replaces profile state. */
export class ProfileStore {
  private state: ProfileState;
  private sequence = 0;
  private listeners = new Set<() => void>();
  constructor(private api: ProfileApi, user: ProfileUser) {
    this.state = { user, profile: null, isLoading: false, isSaving: false, errorMessage: null, avatarUri: null };
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
  private async showAvatar(profile: Profile, sequence: number) {
    this.publish({ avatarUri: null });
    if (!profile.avatarMediaId) return;
    try {
      const uri = await this.api.image(profile.avatarMediaId);
      if (sequence === this.sequence) this.publish({ avatarUri: uri });
    } catch { /* Avatar fallback remains visible; re-entering the profile retries the read. */ }
  }
  load = async () => {
    if (this.state.isSaving) return;
    const sequence = ++this.sequence;
    this.publish({ isLoading: true, errorMessage: null });
    try {
      const profile = await this.api.get();
      if (sequence === this.sequence) {
        this.publish({ profile, user: profile });
        void this.showAvatar(profile, sequence);
      }
    } catch {
      if (sequence === this.sequence) this.publish({ errorMessage: 'Chưa thể tải hồ sơ. Vui lòng thử lại.' });
    } finally {
      if (sequence === this.sequence) this.publish({ isLoading: false });
    }
  };
  uploadAvatar = (file: AvatarDraft) => this.api.upload(file);
  loadInterestOptions = async () => {
    const [items, profile] = await Promise.all([this.api.interests(), this.api.get()]);
    return { items, codes: profile.interestCodes };
  };
  save = async (value: string, avatarMediaId?: string | null, interestCodes?: string[]): Promise<boolean> => {
    const name = value.trim();
    const error = displayNameError(name);
    if (error) throw new Error(error);
    if (this.state.isSaving || (name === this.state.user.displayName && avatarMediaId === undefined && interestCodes === undefined)) return false;
    ++this.sequence; // Invalidate every GET begun before this write, even if the write fails.
    this.publish({ isSaving: true, isLoading: false, errorMessage: null });
    try {
      const profile = await this.api.update(name, avatarMediaId, interestCodes);
      this.publish({ profile, user: profile });
      void this.showAvatar(profile, this.sequence);
      return true;
    } finally { this.publish({ isSaving: false }); }
  };
}

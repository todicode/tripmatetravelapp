import { ApiRequestError } from '../auth/session';
import { AvatarDraft, displayNameError } from './profileModel';

export type EditProfileState = { name: string; isSaving: boolean; errorMessage: string | null;
  isPicking: boolean; draftAvatar: AvatarDraft | null; removeAvatar: boolean };

/** Form workflow stays independent of React Native dialogs and navigation. */
export class EditProfileModel {
  private state: EditProfileState;
  private listeners = new Set<() => void>();
  private active = true;
  private uploadedId: string | undefined;
  constructor(private initialName: string, private saveName: (name: string, avatarId?: string | null) => Promise<boolean>,
    private onSaved: () => void, private onBack: () => void,
    private avatar?: { pick(): Promise<AvatarDraft | null>; upload(file: AvatarDraft): Promise<string>; release(file: AvatarDraft | null): Promise<void>; hasAvatar: boolean }) {
    this.state = { name: initialName, isSaving: false, errorMessage: null, isPicking: false, draftAvatar: null, removeAvatar: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  setActive = (active: boolean) => {
    this.active = active;
    if (!active) void this.avatar?.release(this.state.draftAvatar).catch(() => console.warn('Unable to release temporary avatar.'));
  };
  private publish(update: Partial<EditProfileState>) {
    this.state = { ...this.state, ...update };
    if (this.active) this.listeners.forEach(listener => listener());
  }
  get isDirty() { return this.state.name.trim() !== this.initialName.trim() || !!this.state.draftAvatar || this.state.removeAvatar; }
  get fieldError() { return displayNameError(this.state.name); }
  get canSave() { return this.isDirty && !this.fieldError && !this.state.isSaving && !this.state.isPicking; }
  get canRemoveAvatar() { return !this.state.removeAvatar && (!!this.state.draftAvatar || !!this.avatar?.hasAvatar); }
  chooseAvatar = async () => {
    if (!this.active || !this.avatar || this.state.isSaving || this.state.isPicking) return;
    this.publish({ isPicking: true, errorMessage: null });
    try {
      const file = await this.avatar.pick();
      if (!this.active) { await this.avatar.release(file); return; }
      if (file) {
        await this.avatar.release(this.state.draftAvatar);
        this.uploadedId = undefined;
        this.publish({ draftAvatar: file, removeAvatar: false });
      }
    } catch {
      if (this.active) this.publish({ errorMessage: 'Không chọn được ảnh. Kiểm tra quyền truy cập ảnh và thử lại.' });
    } finally { this.publish({ isPicking: false }); }
  };
  removeAvatar = async () => {
    if (!this.active || this.state.isSaving || this.state.isPicking) return;
    this.publish({ isPicking: true });
    try {
      await this.avatar?.release(this.state.draftAvatar);
      this.uploadedId = undefined;
      this.publish({ draftAvatar: null, removeAvatar: !!this.avatar?.hasAvatar, errorMessage: null });
    } catch { this.publish({ errorMessage: 'Chưa thể xóa ảnh tạm. Vui lòng thử lại.' }); }
    finally { this.publish({ isPicking: false }); }
  };
  setName = (name: string) => {
    if (!this.state.isSaving) this.publish({ name, errorMessage: null });
  };
  requestBack = (): 'blocked' | 'confirm' | 'leave' => {
    if (!this.active || this.state.isSaving || this.state.isPicking) return 'blocked';
    if (this.isDirty) return 'confirm';
    this.onBack();
    return 'leave';
  };
  discard = () => { if (this.active && !this.state.isSaving && !this.state.isPicking) this.onBack(); };
  save = async () => {
    if (!this.active || !this.canSave) return;
    this.publish({ isSaving: true, errorMessage: null });
    try {
      if (this.state.draftAvatar && this.avatar && !this.uploadedId) this.uploadedId = await this.avatar.upload(this.state.draftAvatar);
      if (!this.active) return;
      const saved = await this.saveName(this.state.name, this.state.removeAvatar ? null : this.uploadedId);
      if (saved && this.active) { this.onSaved(); this.onBack(); }
    } catch (error) {
      const message = error instanceof ApiRequestError && [413, 415, 422, 503].includes(error.status) ? error.message
        : error instanceof ApiRequestError && error.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Chưa xác nhận được việc lưu hồ sơ. Nội dung đã nhập vẫn được giữ; hãy kiểm tra kết nối rồi thử lại.';
      if (error instanceof ApiRequestError && error.code === 'MEDIA_NOT_READY') this.uploadedId = undefined;
      if (this.active) this.publish({ errorMessage: message });
    } finally { this.publish({ isSaving: false }); }
  };
}

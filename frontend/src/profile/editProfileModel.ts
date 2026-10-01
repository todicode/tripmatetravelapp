import { ApiRequestError } from '../auth/session';
import { displayNameError } from './profileModel';

export type EditProfileState = { name: string; isSaving: boolean; errorMessage: string | null };

/** Form workflow stays independent of React Native dialogs and navigation. */
export class EditProfileModel {
  private state: EditProfileState;
  private listeners = new Set<() => void>();
  private active = true;
  constructor(private initialName: string, private saveName: (name: string) => Promise<boolean>,
    private onSaved: () => void, private onBack: () => void) {
    this.state = { name: initialName, isSaving: false, errorMessage: null };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  setActive = (active: boolean) => { this.active = active; };
  private publish(update: Partial<EditProfileState>) {
    this.state = { ...this.state, ...update };
    if (this.active) this.listeners.forEach(listener => listener());
  }
  get isDirty() { return this.state.name.trim() !== this.initialName.trim(); }
  get fieldError() { return displayNameError(this.state.name); }
  get canSave() { return this.isDirty && !this.fieldError && !this.state.isSaving; }
  setName = (name: string) => {
    if (!this.state.isSaving) this.publish({ name, errorMessage: null });
  };
  requestBack = (): 'blocked' | 'confirm' | 'leave' => {
    if (!this.active || this.state.isSaving) return 'blocked';
    if (this.isDirty) return 'confirm';
    this.onBack();
    return 'leave';
  };
  discard = () => { if (this.active && !this.state.isSaving) this.onBack(); };
  save = async () => {
    if (!this.active || !this.canSave) return;
    this.publish({ isSaving: true, errorMessage: null });
    try {
      const saved = await this.saveName(this.state.name);
      if (saved && this.active) { this.onSaved(); this.onBack(); }
    } catch (error) {
      const message = error instanceof ApiRequestError && error.status === 422 ? error.message
        : error instanceof ApiRequestError && error.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Chưa xác nhận được việc lưu tên. Nội dung đã nhập vẫn được giữ; hãy kiểm tra kết nối rồi thử lại.';
      if (this.active) this.publish({ errorMessage: message });
    } finally { this.publish({ isSaving: false }); }
  };
}

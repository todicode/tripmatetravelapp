export type ProfileUser = { id: string; displayName: string; email: string };
export type AvatarDraft = { uri: string; name: string; type: string };
export type Interest = { code: string; label: string };
export type Profile = ProfileUser & {
  avatarMediaId: string | null;
  phone?: string | null;
  interestCodes: string[];
  createdAt: string;
  updatedAt: string;
};

export function displayNameError(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Vui lòng nhập tên hiển thị.';
  if (Array.from(name).length > 100) return 'Tên hiển thị không được quá 100 ký tự.';
  return null;
}

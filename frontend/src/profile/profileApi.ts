import { ApiRequestError, AuthorizedRequest } from '../auth/session';
import { AvatarDraft, Profile } from './profileModel';

function parseProfile(value: unknown, userId: string): Profile {
  if (!value || typeof value !== 'object') throw invalidProfile();
  const profile = value as Partial<Profile>;
  if (profile.id !== userId || typeof profile.displayName !== 'string' || typeof profile.email !== 'string'
    || !(profile.avatarMediaId === null || typeof profile.avatarMediaId === 'string')
    || !(profile.phone === undefined || profile.phone === null || typeof profile.phone === 'string')
    || !Array.isArray(profile.interestCodes) || !profile.interestCodes.every(code => typeof code === 'string')
    || typeof profile.createdAt !== 'string' || !Number.isFinite(Date.parse(profile.createdAt))
    || typeof profile.updatedAt !== 'string' || !Number.isFinite(Date.parse(profile.updatedAt))) throw invalidProfile();
  return profile as Profile;
}
const invalidProfile = () => new ApiRequestError('INVALID_RESPONSE', 'Phản hồi hồ sơ không hợp lệ. Vui lòng thử lại.', 0);

export function createProfileApi(request: AuthorizedRequest, userId: string) {
  return {
    get: async () => parseProfile(await request<unknown>('/users/me'), userId),
    update: async (displayName: string, avatarMediaId?: string | null) => parseProfile(
      await request<unknown>('/users/me', { displayName, ...(avatarMediaId !== undefined ? { avatarMediaId } : {}) }, 'PATCH'), userId),
    upload: async (file: AvatarDraft): Promise<string> => {
      const media = await request<{ id?: unknown; uploaderId?: unknown; status?: unknown; purpose?: unknown }>('/media', { purpose: 'AVATAR' }, 'POST', { file });
      if (typeof media?.id !== 'string' || media.uploaderId !== userId || media.status !== 'READY' || media.purpose !== 'AVATAR') throw invalidProfile();
      return media.id;
    },
    image: async (id: string): Promise<string> => {
      const blob = await request<Blob>(`/media/${encodeURIComponent(id)}/thumbnail`, undefined, 'GET', { responseType: 'blob' });
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(invalidProfile());
        reader.onerror = () => reject(invalidProfile());
        reader.readAsDataURL(blob);
      });
    },
  };
}
export type ProfileApi = ReturnType<typeof createProfileApi>;

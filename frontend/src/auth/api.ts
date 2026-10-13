import { ApiRequestError, HttpMethod, RequestOptions } from './session';
import { File } from 'expo-file-system';

export async function apiRequest<T>(
  baseUrl: string,
  serviceName: string,
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string,
  method?: HttpMethod,
  options?: RequestOptions,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.file ? 90_000 : 20_000);

  try {
    let requestBody: string | FormData | undefined = JSON.stringify(body);
    if (options?.file) {
      const form = new FormData();
      Object.entries(body ?? {}).forEach(([key, value]) => form.append(key, String(value)));
      // Expo 57 fetch encodes Blob/File bytes; RN's { uri, name, type } descriptor is unsupported.
      form.append('file', new File(options.file.uri));
      requestBody = form;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      body: requestBody,
      signal: controller.signal,
      headers: { ...(options?.file ? {} : { 'Content-Type': 'application/json' }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      method: method ?? (body === undefined ? 'GET' : 'POST'),
    });
    if (response.status === 204) return undefined as T;
    if (response.ok && options?.responseType === 'arrayBuffer') {
      if (!response.headers.get('Content-Type')?.startsWith('image/')) throw new ApiRequestError('INVALID_RESPONSE', 'Phản hồi ảnh không hợp lệ.', 0);
      return await response.arrayBuffer() as T;
    }
    const payload = await response.json().catch(() => null) as {
      data?: T;
      error?: { code?: string; message?: string; context?: { retryAfterSeconds?: number } };
    } | null;

    if (!response.ok || payload?.error) {
      throw new ApiRequestError(
        payload?.error?.code ?? 'REQUEST_FAILED',
        payload?.error?.message ?? `${serviceName} trả về HTTP ${response.status}.`,
        response.status,
        payload?.error?.context?.retryAfterSeconds ?? Number(response.headers.get('Retry-After') ?? 0),
      );
    }

    if (controller.signal.aborted) throw new ApiRequestError('REQUEST_TIMEOUT', 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.', 0);
    if (!payload || typeof payload !== 'object' || !('data' in payload)) throw new ApiRequestError('INVALID_RESPONSE', 'Phản hồi máy chủ không hợp lệ. Vui lòng thử lại.', response.status);
    return payload.data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      controller.signal.aborted ? 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.' : `Không thể kết nối ${serviceName}. Vui lòng kiểm tra kết nối.`, 0);
  } finally {
    clearTimeout(timeout);
  }
}

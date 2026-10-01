import { ApiRequestError } from './session';

export async function apiRequest<T>(
  baseUrl: string,
  serviceName: string,
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string,
  method?: 'GET' | 'POST' | 'PATCH',
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      body: JSON.stringify(body),
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      method: method ?? (body === undefined ? 'GET' : 'POST'),
    });
    if (response.status === 204) return undefined as T;
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

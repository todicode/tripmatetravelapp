export type SessionResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
  deviceId: string;
  user: { id: string; displayName: string; email: string; phone: string | null };
};

export class ApiRequestError extends Error {
  constructor(public code: string, message: string, public status: number,
    public retryAfterSeconds = 0) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type RequestOptions = { file?: { uri: string; name: string; type: string }; responseType?: 'arrayBuffer' };
export type AuthTransport = <T>(path: string, body?: Record<string, unknown>, token?: string, method?: HttpMethod, options?: RequestOptions) => Promise<T>;
export type AuthorizedRequest = <T>(path: string, body?: Record<string, unknown>, method?: HttpMethod, options?: RequestOptions) => Promise<T>;
type Storage = { read(): Promise<string | null>; write(value: string): Promise<void>; remove(): Promise<void> };
const expired = () => new ApiRequestError('SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);

/** One refresh in flight, ordered secure storage writes, and no revival after logout. */
export class SessionManager {
  private current: SessionResponse | null = null;
  private expiresAt = 0;
  private remember = false;
  private generation = 0;
  private refreshing: Promise<SessionResponse> | null = null;
  private restoring: Promise<void> | null = null;
  private retryRefreshAt = 0;
  private refreshError: ApiRequestError | null = null;
  private storageQueue: Promise<void> = Promise.resolve();

  constructor(private transport: AuthTransport, private storage: Storage,
    private changed: (session: SessionResponse | null) => void,
    private now = () => Date.now()) {}

  private store(action: () => Promise<void>) {
    const work = this.storageQueue.then(action);
    this.storageQueue = work.catch(() => {});
    return work;
  }

  async accept(session: SessionResponse, remember = true) {
    const generation = ++this.generation;
    this.refreshing = null;
    this.retryRefreshAt = 0;
    await this.store(() => remember
      ? this.storage.write(JSON.stringify({ refreshToken: session.refreshToken, refreshExpiresAt: session.refreshExpiresAt }))
      : this.storage.remove());
    if (generation !== this.generation) throw expired();
    this.remember = remember;
    this.current = session;
    this.expiresAt = this.now() + session.expiresIn * 1000;
    this.changed(session);
  }

  async clear() {
    ++this.generation;
    this.current = null;
    this.refreshing = null;
    this.remember = false;
    this.changed(null);
    await this.store(() => this.storage.remove());
  }

  updatePhone(userId: string, phone: string) {
    if (!this.current || this.current.user.id !== userId) throw expired();
    this.current = { ...this.current, user: { ...this.current.user, phone } };
    this.changed(this.current);
  }

  restore(): Promise<void> {
    if (this.restoring) return this.restoring;
    const work = this.restoreSaved();
    this.restoring = work;
    void work.finally(() => { if (this.restoring === work) this.restoring = null; }).catch(() => {});
    return work;
  }

  private async restoreSaved() {
    const generation = this.generation;
    const raw = await this.storeRead();
    if (generation !== this.generation || !raw) return;
    let saved: { refreshToken: string; refreshExpiresAt: string };
    try {
      saved = JSON.parse(raw);
      if (typeof saved?.refreshToken !== 'string' || !saved.refreshToken ||
        !Number.isFinite(Date.parse(saved.refreshExpiresAt)) || Date.parse(saved.refreshExpiresAt) <= this.now()) {
        await this.clear();
        return;
      }
    } catch {
      await this.clear();
      return;
    }
    let session: SessionResponse;
    try {
      session = await this.transport<SessionResponse>('/auth/refresh', { refreshToken: saved.refreshToken });
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiRequestError && error.status === 401) await this.clear();
      else throw error; // Keep saved credentials on an offline/server failure so the user can retry.
      return;
    }
    if (generation === this.generation) await this.accept(session, true);
  }

  private async storeRead() {
    await this.storageQueue;
    return this.storage.read();
  }

  private refresh(): Promise<SessionResponse> {
    if (this.refreshing) return this.refreshing;
    if (this.retryRefreshAt > this.now() && this.refreshError) return Promise.reject(this.refreshError);
    const session = this.current;
    const generation = this.generation;
    if (!session) return Promise.reject(expired());
    const work = (async () => {
      try {
        if (Date.parse(session.refreshExpiresAt) <= this.now()) throw expired();
        const next = await this.transport<SessionResponse>('/auth/refresh', { refreshToken: session.refreshToken });
        if (generation !== this.generation) throw expired();
        // Keep the rotated credential in memory even if secure storage temporarily fails.
        this.current = next;
        this.retryRefreshAt = 0;
        this.expiresAt = this.now() + next.expiresIn * 1000;
        if (this.remember) await this.store(() => this.storage.write(JSON.stringify({
          refreshToken: next.refreshToken, refreshExpiresAt: next.refreshExpiresAt,
        })));
        if (generation !== this.generation) throw expired();
        this.changed(next);
        return next;
      } catch (error) {
        if (generation === this.generation && error instanceof ApiRequestError && error.status === 429) {
          this.retryRefreshAt = this.now() + Math.max(1, error.retryAfterSeconds || 60) * 1000;
          this.refreshError = error;
        }
        if (generation === this.generation && error instanceof ApiRequestError && error.status === 401) {
          await this.clear();
        }
        throw error;
      }
    })();
    this.refreshing = work;
    void work.finally(() => { if (this.refreshing === work) this.refreshing = null; }).catch(() => {});
    return work;
  }

  async ensureFresh() {
    if (!this.current) throw expired();
    return this.expiresAt <= this.now() + 30_000 ? this.refresh() : this.current;
  }

  async request<T>(path: string, body?: Record<string, unknown>, method?: HttpMethod, options?: RequestOptions): Promise<T> {
    const generation = this.generation;
    let session = await this.ensureFresh();
    try {
      if (generation !== this.generation) throw expired();
      const result = await this.transport<T>(path, body, session.accessToken, method, options);
      if (generation !== this.generation) throw expired();
      return result;
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 401 || generation !== this.generation) throw error;
      // A concurrent request may already have rotated the token.
      session = this.current && this.current.accessToken !== session.accessToken ? this.current : await this.refresh();
      try {
        if (generation !== this.generation) throw expired();
        const result = await this.transport<T>(path, body, session.accessToken, method, options);
        if (generation !== this.generation) throw expired();
        return result;
      } catch (retryError) {
        if (generation === this.generation && retryError instanceof ApiRequestError && retryError.status === 401) await this.clear();
        throw retryError;
      }
    }
  }

  async logout() {
    const generation = this.generation;
    try {
      await this.request<void>('/auth/logout', {});
    } finally {
      if (generation === this.generation) await this.clear();
    }
  }
}

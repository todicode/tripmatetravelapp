import { Client, type StompConfig } from '@stomp/stompjs';
import type { RealtimeCredentials } from '../auth/session';
import type { DirectMessage } from './directMessageApi';

export type DirectRealtimeEvent = { eventId: string; schemaVersion: 1; occurredAt: string } & (
  { type: 'direct.message.created'; data: DirectMessage } |
  { type: 'direct.read.updated'; data: { conversationId: string; userId: string; lastReadSeq: string } } |
  { type: 'direct.presence.updated'; data: { userId: string; online: boolean } });

export function parseDirectEvent(body: string): DirectRealtimeEvent | null {
  try {
    const event = JSON.parse(body);
    if (event?.schemaVersion !== 1 || typeof event.eventId !== 'string' || typeof event.occurredAt !== 'string') return null;
    const data = event.data;
    if (event.type === 'direct.presence.updated') {
      return data && typeof data.userId === 'string' && typeof data.online === 'boolean' ? event : null;
    }
    if (!data || typeof data.conversationId !== 'string') return null;
    const seq = event.type === 'direct.message.created' ? data.seq : data.lastReadSeq;
    if (typeof seq !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(seq) || BigInt(seq) > 9223372036854775807n) return null;
    if (event.type === 'direct.message.created' && typeof data.id === 'string' && typeof data.body === 'string'
      && typeof data.clientMessageId === 'string' && typeof data.createdAt === 'string'
      && typeof data.sender?.id === 'string' && typeof data.sender?.displayName === 'string') return event;
    if (event.type === 'direct.read.updated' && typeof data.userId === 'string') return event;
  } catch { }
  return null;
}

/** One foreground connection per account. No credentials in URLs or logs. */
export class DirectRealtimeConnection {
  private active = false;
  private generation = 0;
  private client?: Client;
  private retry?: ReturnType<typeof setTimeout>;
  private attempt = 0;
  private refreshToken = false;
  private refreshedAfterError = false;
  constructor(private credentials: RealtimeCredentials,
    private onEvent: (event: DirectRealtimeEvent) => void,
    private onReady: () => Promise<void>, private onStatus: (connected: boolean) => void,
    private createClient: (config: StompConfig) => Client = config => new Client(config)) {}
  start() { if (this.active) return; this.active = true; this.attempt = 0; void this.connect(); }
  stop() {
    this.active = false; this.generation++;
    if (this.retry) clearTimeout(this.retry);
    this.retry = undefined;
    const client = this.client; this.client = undefined;
    if (client) void client.deactivate({ force: true });
    this.onStatus(false);
  }
  private async connect() {
    const generation = ++this.generation;
    const current = () => this.active && this.generation === generation;
    try {
      const { url, accessToken } = await this.credentials(this.refreshToken);
      this.refreshToken = false;
      if (!current()) return;
      const buffered: DirectRealtimeEvent[] = [];
      let catchingUp = true;
      const client = this.createClient({
        brokerURL: url, connectHeaders: { Authorization: `Bearer ${accessToken}` },
        reconnectDelay: 0, connectionTimeout: 10000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
        appendMissingNULLonIncoming: true, forceBinaryWSFrames: true, debug: () => {},
        onConnect: () => {
          if (!current()) return;
          this.attempt = 0; this.refreshedAfterError = false;
          client.subscribe('/user/queue/events', frame => {
            if (!current()) return;
            const event = parseDirectEvent(frame.body);
            if (event) { if (catchingUp) buffered.push(event); else this.onEvent(event); }
          });
          // Subscribe first, then catch up from REST before applying live events.
          void this.onReady().finally(() => {
            if (!current()) return;
            catchingUp = false;
            buffered.forEach(event => this.onEvent(event));
            this.onStatus(true);
          }).catch(() => {});
        },
        onStompError: frame => {
          if (!current()) return;
          try {
            if (JSON.parse(frame.body)?.code === 'AUTH_REQUIRED' && !this.refreshedAfterError) {
              this.refreshToken = true; this.refreshedAfterError = true;
            }
          } catch { }
          void client.deactivate({ force: true });
          this.schedule(generation);
        },
        onWebSocketClose: () => { if (current()) this.schedule(generation); },
      });
      this.client = client;
      client.activate();
    } catch { if (current()) this.schedule(generation); }
  }
  private schedule(generation: number) {
    if (!this.active || this.generation !== generation || this.retry) return;
    this.generation++; // Ignore late frames/catch-up completion from the disconnected socket.
    this.onStatus(false);
    const delayMs = Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5) * (0.8 + Math.random() * 0.4));
    this.retry = setTimeout(() => { this.retry = undefined; if (this.active) void this.connect(); }, delayMs);
  }
}

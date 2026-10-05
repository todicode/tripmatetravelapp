import type { Conversation, Message } from './chatModel';
import type { DirectConversation, DirectMessage, DirectMessageApi } from './directMessageApi';
import type { DirectRealtimeEvent } from './directRealtime';

export type DeliveryMessage = Message & {
  clientMessageId: string; seq?: string; createdAt: string;
  status: 'sent' | 'sending' | 'failed'; error?: string;
};
export type DirectThread = {
  messages: DeliveryMessage[]; initialized: boolean; loading: boolean; olderLoading: boolean;
  olderSeq: string | null; afterSeq: string; error: string; olderError: string; readError: string;
};
export type DirectState = {
  conversations: DirectConversation[]; threads: Record<string, DirectThread>;
  loading: boolean; error: string; openingId: string | null; openingError: string;
};
const emptyThread = (): DirectThread => ({ messages: [], initialized: false, loading: false,
  olderLoading: false, olderSeq: null, afterSeq: '0', error: '', olderError: '', readError: '' });
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể kết nối. Vui lòng thử lại.';
export function compareSeq(a: string, b: string) { return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0; }
export function unreadLabel(count: string) { return compareSeq(count, '99') > 0 ? '99+' : count; }
export function toDeliveryMessage(message: DirectMessage, userId: string): DeliveryMessage {
  return { id: message.id, clientMessageId: message.clientMessageId, seq: message.seq, text: message.body,
    isMe: message.sender.id === userId, senderName: message.sender.displayName, createdAt: message.createdAt,
    time: new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), status: 'sent' };
}
export function mergeMessages(current: DeliveryMessage[], incoming: DeliveryMessage[]): DeliveryMessage[] {
  const confirmed = [...current, ...incoming].filter(item => item.status === 'sent');
  const byId = new Map<string, DeliveryMessage>();
  confirmed.forEach(item => byId.set(item.id, item));
  const result = [...byId.values()];
  for (const item of [...current, ...incoming].filter(item => item.status !== 'sent')) {
    if (confirmed.some(sent => sent.isMe === item.isMe && sent.clientMessageId === item.clientMessageId)) continue;
    const index = result.findIndex(value => value.id === item.id);
    if (index < 0) result.push(item); else result[index] = item;
  }
  return result.sort((a, b) => a.seq && b.seq ? compareSeq(a.seq, b.seq)
    : a.seq ? -1 : b.seq ? 1 : a.createdAt.localeCompare(b.createdAt));
}
export function toListConversation(item: DirectConversation, userId: string): Conversation {
  return { id: item.id, type: 'friend', name: item.user.displayName,
    avatar: item.user.displayName.trim().charAt(0).toUpperCase() || '?', members: [item.user.id],
    unread: compareSeq(item.unreadCount, '99') > 0 ? 99 : Number(item.unreadCount), unreadLabel: unreadLabel(item.unreadCount),
    messages: [], lastMessage: item.lastMessage ? toDeliveryMessage(item.lastMessage, userId) : undefined };
}

/** Session-scoped state; owns retries, sequence cursors and stale-response guards. */
export class DirectMessagingSession {
  private state: DirectState = { conversations: [], threads: {}, loading: true, error: '', openingId: null, openingError: '' };
  private listeners = new Set<() => void>();
  private generation = 0;
  private active = true;
  private listing = false;
  private refreshAgain = false;
  private eventIds = new Set<string>();
  private syncing = new Set<string>();
  private syncAgain = new Set<string>();
  private sending = new Set<string>();
  private reading = new Set<string>();
  private readTargets = new Map<string, string>();
  constructor(private api: DirectMessageApi, private userId: string, private uuid: () => string) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  activate() {
    this.active = true;
    this.publish({ ...this.state, threads: Object.fromEntries(Object.entries(this.state.threads)
      .map(([id, thread]) => [id, { ...thread, loading: false, olderLoading: false }])) });
  }
  deactivate() {
    this.active = false; this.generation++;
    this.listing = false; this.refreshAgain = false; this.syncing.clear(); this.syncAgain.clear(); this.sending.clear(); this.reading.clear(); this.readTargets.clear();
  }
  private current(generation: number) { return this.active && generation === this.generation; }
  private publish(next: DirectState) { this.state = next; this.listeners.forEach(listener => listener()); }
  private thread(id: string) { return this.state.threads[id] ?? emptyThread(); }
  private updateThread(id: string, change: Partial<DirectThread>) {
    this.publish({ ...this.state, threads: { ...this.state.threads, [id]: { ...this.thread(id), ...change } } });
  }
  private upsert(incoming: DirectConversation) {
    const previous = this.state.conversations.find(item => item.id === incoming.id);
    let next = incoming;
    if (previous) {
      if (compareSeq(previous.lastSeq, incoming.lastSeq) > 0)
        next = { ...next, lastSeq: previous.lastSeq, lastMessage: previous.lastMessage, updatedAt: previous.updatedAt };
      if (compareSeq(previous.lastReadSeq, incoming.lastReadSeq) > 0)
        next = { ...next, lastReadSeq: previous.lastReadSeq, unreadCount: previous.unreadCount };
    }
    this.publish({ ...this.state, conversations: [...this.state.conversations.filter(item => item.id !== next.id), next]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id)) });
  }
  private merge(id: string, messages: DirectMessage[]) {
    if (!messages.length) return;
    this.updateThread(id, { messages: mergeMessages(this.thread(id).messages, messages.map(item => toDeliveryMessage(item, this.userId))) });
    const last = messages.at(-1);
    const conversation = this.state.conversations.find(item => item.id === id);
    if (last && conversation && compareSeq(last.seq, conversation.lastSeq) > 0)
      this.upsert({ ...conversation, lastMessage: last, lastSeq: last.seq, updatedAt: last.createdAt });
  }
  private blockIfDenied(id: string, error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (!['NOT_FRIENDS', 'USER_NOT_FOUND', 'CONVERSATION_NOT_FOUND'].includes(String(code))) return;
    const conversation = this.state.conversations.find(item => item.id === id);
    if (conversation) this.upsert({ ...conversation, canSend: false });
  }
  async refresh(showLoading = true) {
    if (!this.active) return;
    if (this.listing) { this.refreshAgain = true; return; }
    const generation = this.generation;
    this.listing = true;
    if (showLoading) this.publish({ ...this.state, loading: true, error: '' });
    try {
      const conversations = await this.api.conversations();
      if (!this.current(generation)) return;
      conversations.forEach(item => this.upsert(item));
      this.publish({ ...this.state, error: '' });
    } catch (error) { if (this.current(generation)) this.publish({ ...this.state, error: errorText(error) }); }
    finally {
      if (this.current(generation)) {
        this.listing = false; this.publish({ ...this.state, loading: false });
        if (this.refreshAgain) { this.refreshAgain = false; void this.refresh(false); }
      }
    }
  }
  receive(event: DirectRealtimeEvent) {
    if (event.type === 'direct.presence.updated') return;
    if (!this.active || this.eventIds.has(event.eventId)) return;
    this.eventIds.add(event.eventId);
    if (this.eventIds.size > 500) this.eventIds.delete(this.eventIds.values().next().value!);
    if (event.type === 'direct.message.created') {
      // Live delivery improves latency; only REST history advances the durable catch-up cursor.
      if (this.thread(event.data.conversationId).initialized) this.merge(event.data.conversationId, [event.data]);
      void this.refresh(false);
    } else if (event.data.userId === this.userId) void this.refresh(false);
  }
  async open(recipientId: string): Promise<string | null> {
    if (!this.active || this.state.openingId) return null;
    const generation = this.generation;
    this.publish({ ...this.state, openingId: recipientId, openingError: '' });
    try {
      const conversation = await this.api.open(recipientId);
      if (!this.current(generation)) return null;
      this.upsert(conversation);
      return conversation.id;
    } catch (error) {
      if (this.current(generation)) this.publish({ ...this.state, openingError: errorText(error) });
      return null;
    } finally { if (this.current(generation)) this.publish({ ...this.state, openingId: null }); }
  }
  async load(id: string) {
    if (!this.active || this.thread(id).loading || this.thread(id).initialized) return;
    const generation = this.generation;
    this.updateThread(id, { loading: true, error: '' });
    try {
      const page = await this.api.history(id);
      if (!this.current(generation)) return;
      this.merge(id, page.items);
      this.updateThread(id, { initialized: true, olderSeq: page.pageInfo.nextBeforeSeq, afterSeq: page.pageInfo.nextAfterSeq });
    } catch (error) {
      if (this.current(generation)) { this.blockIfDenied(id, error); this.updateThread(id, { error: errorText(error) }); }
    } finally { if (this.current(generation)) this.updateThread(id, { loading: false }); }
  }
  async sync(id: string) {
    if (!this.active || !this.thread(id).initialized) return;
    if (this.syncing.has(id)) { this.syncAgain.add(id); return; }
    const generation = this.generation;
    this.syncing.add(id);
    try {
      let after = this.thread(id).afterSeq;
      while (this.current(generation)) {
        const page = await this.api.history(id, { afterSeq: after });
        if (!this.current(generation)) return;
        if (page.pageInfo.hasMore && compareSeq(page.pageInfo.nextAfterSeq, after) <= 0) throw new Error('Không tải được tin mới. Vui lòng thử lại.');
        this.merge(id, page.items);
        after = page.pageInfo.nextAfterSeq;
        this.updateThread(id, { afterSeq: after, error: '' });
        if (!page.pageInfo.hasMore) break;
      }
    } catch (error) { if (this.current(generation)) { this.blockIfDenied(id, error); this.updateThread(id, { error: errorText(error) }); } }
    finally {
      if (this.current(generation)) {
        this.syncing.delete(id);
        if (this.syncAgain.delete(id)) void this.sync(id);
      }
    }
  }
  async older(id: string) {
    const thread = this.thread(id);
    if (!this.active || !thread.olderSeq || thread.olderLoading) return;
    const generation = this.generation;
    this.updateThread(id, { olderLoading: true, olderError: '' });
    try {
      const page = await this.api.history(id, { beforeSeq: thread.olderSeq });
      if (!this.current(generation)) return;
      this.merge(id, page.items);
      this.updateThread(id, { olderSeq: page.pageInfo.nextBeforeSeq });
    } catch (error) { if (this.current(generation)) this.updateThread(id, { olderError: errorText(error) }); }
    finally { if (this.current(generation)) this.updateThread(id, { olderLoading: false }); }
  }
  async send(id: string, text: string) {
    const conversation = this.state.conversations.find(item => item.id === id);
    if (!conversation?.canSend || !this.thread(id).initialized) throw new Error('Chưa thể gửi tin nhắn trong cuộc trò chuyện này.');
    if (!text.trim() || [...text].length > 4000) throw new Error('Tin nhắn cần nội dung không trắng, tối đa 4.000 ký tự.');
    const clientMessageId = this.uuid();
    const createdAt = new Date().toISOString();
    const pending: DeliveryMessage = { id: `pending:${clientMessageId}`, clientMessageId, text, isMe: true,
      senderName: 'Tôi', createdAt, time: new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), status: 'sending' };
    this.updateThread(id, { messages: mergeMessages(this.thread(id).messages, [pending]) });
    await this.deliver(id, pending);
  }
  async retry(id: string, clientMessageId: string) {
    const pending = this.thread(id).messages.find(item => item.clientMessageId === clientMessageId && item.isMe && item.status === 'failed');
    if (pending && this.state.conversations.find(item => item.id === id)?.canSend) await this.deliver(id, pending);
  }
  private async deliver(id: string, pending: DeliveryMessage) {
    const key = `${id}:${pending.clientMessageId}`;
    if (!this.active || this.sending.has(key)) return;
    const generation = this.generation;
    this.sending.add(key);
    this.updateThread(id, { messages: mergeMessages(this.thread(id).messages, [{ ...pending, status: 'sending', error: undefined }]) });
    try {
      const message = await this.api.send(id, pending.clientMessageId, pending.text);
      if (!this.current(generation)) return;
      this.merge(id, [message]);
      // A send response may skip incoming sequences. Only history advances the catch-up cursor.
    } catch (error) {
      if (!this.current(generation)) return;
      this.blockIfDenied(id, error);
      const unresolved = this.thread(id).messages.find(item => item.id === pending.id && item.status !== 'sent');
      if (unresolved) this.updateThread(id, { messages: mergeMessages(this.thread(id).messages,
        [{ ...unresolved, status: 'failed', error: errorText(error) }]) });
    } finally { if (this.current(generation)) this.sending.delete(key); }
  }
  async read(id: string, seq: string) {
    const conversation = this.state.conversations.find(item => item.id === id);
    // An outgoing response can arrive before intervening incoming history is loaded.
    // Do not mark that unseen gap read; the screen retries when catch-up advances.
    const loaded = this.thread(id).afterSeq;
    if (compareSeq(seq, loaded) > 0) seq = loaded;
    if (!this.active || !conversation || compareSeq(seq, conversation.lastReadSeq) <= 0) return;
    const target = this.readTargets.get(id) ?? '0';
    this.readTargets.set(id, compareSeq(seq, target) > 0 ? seq : target);
    if (this.reading.has(id)) return;
    const generation = this.generation;
    this.reading.add(id);
    try {
      while (this.current(generation)) {
        const requested = this.readTargets.get(id)!;
        const result = await this.api.read(id, requested);
        if (!this.current(generation)) return;
        const current = this.state.conversations.find(item => item.id === id)!;
        if (compareSeq(result.lastReadSeq, current.lastReadSeq) >= 0)
          this.upsert({ ...current, lastReadSeq: result.lastReadSeq, unreadCount: result.unreadCount });
        this.updateThread(id, { readError: '' });
        if (compareSeq(this.readTargets.get(id)!, result.lastReadSeq) <= 0) break;
      }
    } catch { if (this.current(generation)) this.updateThread(id, { readError: 'Chưa cập nhật được trạng thái đã đọc. Vui lòng thử lại.' }); }
    finally { if (this.current(generation)) this.reading.delete(id); }
  }
}

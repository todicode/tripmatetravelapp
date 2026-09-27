import { makeId, normalizeName } from '../trips/tripModel';

export type Friend = { id: string; name: string; phone: string; avatar: string };
export type Message = { id: string; text: string; isMe: boolean; senderName: string; time: string };
export type Conversation = { id: string; type: 'friend' | 'group'; name: string; avatar: string; members: string[]; tripId?: string; tripLabel?: string; unread: number; messages: Message[] };
export type FriendRequest = { id: string; friend: Friend; message: string; direction: 'received' | 'sent' };
const msg = (text: string, isMe: boolean, senderName: string, time: string): Message => ({ id: makeId(), text, isMe, senderName, time });
export function initialConversations(): Conversation[] { return []; }
export function matchesFriend(friend: Friend, query: string) {
  return normalizeName(friend.name).includes(normalizeName(query)) || friend.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''));
}
export function appendMessage(conversation: Conversation, text: string): Conversation {
  if (!text.trim()) return conversation;
  return { ...conversation, messages: [...conversation.messages, msg(text.trim(), true, 'Tôi', new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))] };
}
export function createGroup(name: string, members: string[], tripId?: string): Conversation {
  if (!name.trim()) throw new Error('Vui lòng nhập tên nhóm.');
  return { id: makeId(), type: 'group', name: name.trim(), avatar: 'N', members: [...new Set(members)], tripId, unread: 0, messages: [] };
}

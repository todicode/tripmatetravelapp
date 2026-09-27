import { useState } from 'react';
import { Conversation, Friend, FriendRequest, initialConversations } from './chatModel';

type Route = { kind: 'add' | 'requests' | 'create' } | { kind: 'conversation'; id: string };
export function useChatSession() {
  const [conversations, setConversations] = useState(initialConversations);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const push = (route: Route) => setRoutes(current => [...current, route]);
  const back = () => setRoutes(current => current.slice(0, -1));
  const update = (id: string, fn: (conversation: Conversation) => Conversation) => setConversations(current => current.map(item => item.id === id ? fn(item) : item));
  const open = (id: string) => { update(id, item => ({ ...item, unread: 0 })); push({ kind: 'conversation', id }); };
  const openFriend = (friend: Friend) => {
    setConversations(current => current.some(item => item.id === friend.id) ? current : [...current, { id: friend.id, type: 'friend', name: friend.name, avatar: friend.avatar, members: [friend.id], unread: 0, messages: [] }]);
    open(friend.id);
  };
  return { conversations, setConversations, friends, setFriends, requests, setRequests, routes, setRoutes, push, back, update, open, openFriend };
}

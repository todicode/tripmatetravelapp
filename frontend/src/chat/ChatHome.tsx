import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { Trip } from '../trips/tripModel';
import AddFriendScreen from './AddFriendScreen';
import ChatListScreen from './ChatListScreen';
import ConversationScreen from './ConversationScreen';
import CreateGroupScreen from './CreateGroupScreen';
import FriendRequestsScreen from './FriendRequestsScreen';
import { appendMessage, Conversation, createGroup, Friend, FriendRequest, initialConversations } from './chatModel';

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
export default function ChatHome({ session, user, trips, onExit, onTrip }: { session: ReturnType<typeof useChatSession>; user: { displayName: string; email: string }; trips: Trip[]; onExit: () => void; onTrip: (id: string) => void }) {
  const { conversations, friends, requests, routes, push, back, update, open } = session;
  const route = routes.at(-1);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (routes.length) back(); else onExit(); return true; }); return () => subscription.remove(); }, [routes.length, onExit]);
  if (route?.kind === 'add') return <AddFriendScreen user={user} onBack={back} onRequests={() => push({ kind: 'requests' })} />;
  if (route?.kind === 'requests') return <FriendRequestsScreen requests={requests} onBack={back} onRemove={id => session.setRequests(current => current.filter(req => req.id !== id))} onAccept={id => {
    const req = requests.find(item => item.id === id && item.direction === 'received'); if (!req) return;
    session.setFriends(current => current.some(friend => friend.id === req.friend.id) ? current : [...current, req.friend]);
    session.setRequests(current => current.filter(item => item.friend.id !== req.friend.id));
  }} />;
  if (route?.kind === 'create') return <CreateGroupScreen friends={friends} trips={trips} onBack={back} onCreate={(name, members, tripId) => { const group = createGroup(name, members, tripId); group.tripLabel = trips.find(trip => trip.id === tripId)?.city; session.setConversations(current => [group, ...current]); session.setRoutes([{ kind: 'conversation', id: group.id }]); }} />;
  if (route?.kind === 'conversation') {
    const conversation = conversations.find(item => item.id === route.id);
    if (conversation) return <ConversationScreen key={conversation.id} conversation={conversation} friends={friends} trip={trips.find(trip => trip.id === conversation.tripId)} onBack={back} onTrip={onTrip} onSend={text => update(conversation.id, item => appendMessage(item, text))} onInvite={id => update(conversation.id, item => ({ ...item, members: [...new Set([...item.members, id])] }))} />;
  }
  return <ChatListScreen conversations={conversations} onOpen={open} onAddFriend={() => push({ kind: 'add' })} onCreateGroup={() => push({ kind: 'create' })} />;
}

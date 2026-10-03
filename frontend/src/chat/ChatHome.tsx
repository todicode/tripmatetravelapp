import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { Trip } from '../trips/tripModel';
import AddFriendScreen from './AddFriendScreen';
import ChatListScreen from './ChatListScreen';
import ConversationScreen from './ConversationScreen';
import CreateGroupScreen from './CreateGroupScreen';
import FriendRequestsScreen from './FriendRequestsScreen';
import { appendMessage, createGroup } from './chatModel';
import DirectConversationScreen from './DirectConversationScreen';

import { useChatSession } from './useChatSession';
export { useChatSession } from './useChatSession';
export default function ChatHome({ session, user, trips, onExit, onTrip }: { session: ReturnType<typeof useChatSession>; user: { displayName: string; email: string }; trips: Trip[]; onExit: () => void; onTrip: (id: string) => void }) {
  const { conversations, friends, requests, routes, push, back, update, open } = session;
  const route = routes.at(-1);
  useEffect(() => { if (route?.kind === 'requests') void session.refreshSocial(); }, [route?.kind, session.refreshSocial]);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (routes.length) back(); else onExit(); return true; }); return () => subscription.remove(); }, [routes.length, onExit]);
  if (route?.kind === 'add') return <AddFriendScreen user={user} session={session} onBack={back} onRequests={() => push({ kind: 'requests' })} />;
  if (route?.kind === 'requests') return <FriendRequestsScreen requests={requests} loading={session.socialLoading} error={session.socialError} onRefresh={session.refreshSocial} onBack={back} onResolve={session.resolveRequest} />;
  if (route?.kind === 'create') return <CreateGroupScreen friends={friends} trips={trips} onBack={back} onCreate={(name, members, tripId) => { const group = createGroup(name, members, tripId); group.tripLabel = trips.find(trip => trip.id === tripId)?.city; session.setConversations(current => [group, ...current]); session.setRoutes([{ kind: 'conversation', id: group.id }]); }} />;
  if (route?.kind === 'conversation') {
    const directConversation = session.direct.conversations.find(item => item.id === route.id);
    if (directConversation) return <DirectConversationScreen key={directConversation.id} conversation={directConversation}
      thread={session.direct.threads[directConversation.id]} onBack={back} loadAvatar={session.loadAvatar}
      onSend={text => session.direct.store.send(directConversation.id, text)}
      onRetry={clientId => { void session.direct.store.retry(directConversation.id, clientId); }}
      onOlder={() => { void session.direct.store.older(directConversation.id); }}
      onReload={() => { void session.direct.store.load(directConversation.id).then(() => session.direct.store.sync(directConversation.id)); }}
      onRead={seq => session.direct.readVisible(directConversation.id, seq)} />;
    const conversation = conversations.find(item => item.id === route.id);
    if (conversation) return <ConversationScreen key={conversation.id} conversation={conversation} friends={friends} user={user} trips={trips} onPin={id => update(conversation.id, item => ({ ...item, tripId: id, tripLabel: trips.find(trip => trip.id === id)?.city }))} trip={trips.find(trip => trip.id === conversation.tripId)} onBack={back} onTrip={onTrip} onSend={text => update(conversation.id, item => appendMessage(item, text))} onInvite={id => update(conversation.id, item => ({ ...item, members: [...new Set([...item.members, id])] }))} />;
  }
  return <ChatListScreen conversations={conversations} friends={friends} socialLoading={session.socialLoading} socialError={session.socialError}
    chatLoading={session.direct.loading} chatError={session.direct.error} openingId={session.direct.openingId} openingError={session.direct.openingError}
    onRefresh={session.refreshChat} onOpenFriend={session.openFriend} onRemoveFriend={session.removeFriend} onOpen={open}
    onAddFriend={() => push({ kind: 'add' })} onCreateGroup={() => push({ kind: 'create' })} />;
}

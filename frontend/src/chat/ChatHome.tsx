import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { Trip } from '../trips/tripModel';
import AddFriendScreen from './AddFriendScreen';
import ChatListScreen from './ChatListScreen';
import GroupConversationScreen from './GroupConversationScreen';
import CreateGroupScreen from './CreateGroupScreen';
import FriendRequestsScreen from './FriendRequestsScreen';
import DirectConversationScreen from './DirectConversationScreen';

import { useChatSession } from './useChatSession';
export { useChatSession } from './useChatSession';
export default function ChatHome({ session, user, trips, onExit, onTrip }: { session: ReturnType<typeof useChatSession>; user: { displayName: string; email: string }; trips: Trip[]; onExit: () => void; onTrip: (id: string) => void }) {
  const { conversations, friends, requests, routes, push, back, open } = session;
  const route = routes.at(-1);
  useEffect(() => { if (route?.kind === 'requests') void session.refreshSocial(); }, [route?.kind, session.refreshSocial]);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (routes.length) back(); else onExit(); return true; }); return () => subscription.remove(); }, [routes.length, onExit]);
  if (route?.kind === 'add') return <AddFriendScreen user={user} session={session} onBack={back} onRequests={() => push({ kind: 'requests' })} />;
  if (route?.kind === 'requests') return <FriendRequestsScreen requests={requests} loading={session.socialLoading} error={session.socialError} onRefresh={session.refreshSocial} onBack={back} onResolve={session.resolveRequest} />;
  if (route?.kind === 'create') return <CreateGroupScreen friends={friends} onBack={back} onCreate={async (name, members) => { const id = await session.group.create(name, members); session.setRoutes([{ kind: 'conversation', id }]); }} />;
  if (route?.kind === 'conversation') {
    const directConversation = session.direct.conversations.find(item => item.id === route.id);
    if (directConversation) return <DirectConversationScreen key={directConversation.id} conversation={directConversation}
      thread={session.direct.threads[directConversation.id]} onBack={back} loadAvatar={session.loadAvatar}
      online={session.direct.onlineUsers[directConversation.user.id] === true}
      onSend={text => session.direct.store.send(directConversation.id, text)}
      onRetry={clientId => { void session.direct.store.retry(directConversation.id, clientId); }}
      onOlder={() => { void session.direct.store.older(directConversation.id); }}
      onReload={() => { void session.direct.store.load(directConversation.id).then(() => session.direct.store.sync(directConversation.id)); }}
      onRead={seq => session.direct.readVisible(directConversation.id, seq)} />;
    const group = session.group.groups.find(item => item.id === route.id);
    if (group) return <GroupConversationScreen key={group.id} group={group} session={session.group} friends={friends} onBack={back} />;
  }
  return <ChatListScreen conversations={conversations} friends={friends} socialLoading={session.socialLoading} socialError={session.socialError}
    onlineUsers={session.direct.onlineUsers}
    chatLoading={session.direct.loading || session.group.loading} chatError={[session.direct.error, session.group.error].filter(Boolean).join('\n')} openingId={session.direct.openingId} openingError={session.direct.openingError}
    onRefresh={session.refreshChat} onOpenFriend={session.openFriend} onRemoveFriend={session.removeFriend} onOpen={open}
    onAddFriend={() => push({ kind: 'add' })} onCreateGroup={() => push({ kind: 'create' })} />;
}

# Direct messaging API

Implemented backend and frontend slice: REST, persisted 1-to-1 text messages. All paths below use `/api/v1`, require `Authorization: Bearer <access-token>`, and return HTTP 200 with `{data, requestId}`, `X-Request-Id` and `Cache-Control: private, no-store`.

## Rules

- Only current friends may open a conversation or send. Each user pair has one conversation, reused when friendship is restored.
- Unfriend retains history and read-marker access for the two participants, but blocks new sends and send retries. Conversation summaries expose `canSend=false`.
- Outsiders get `404 CONVERSATION_NOT_FOUND` for message/history/read operations. Summary users contain only `id`, `displayName`, `avatarMediaId`.
- Group chat, WebSocket, push, attachments, message edits/deletion, typing and online state are outside this slice.

## Frontend integration

In **Tin nhắn → Bạn bè**, tap a friend's name or message button to open/reuse the server conversation. **Tất cả** shows persisted conversation summaries and unread counts. Individual conversations use `DirectConversationScreen`; group conversations retain the existing screen and local implementation.

`directMessageApi.ts` uses the existing authorized request/refresh transport. `DirectMessagingSession` owns paging, pending sends, UUID-preserving retries, sequence catch-up and monotonic read results; `useDirectMessaging` adapts this state to React and the app lifecycle. New messages are checked every 3 seconds in the open direct conversation, lists every 10 seconds while chat is visible. Poll timers do not issue requests while the app is in the background. No chat contents are persisted to local storage.

Read markers advance only from confirmed messages actually visible on screen, capped by the loaded catch-up sequence to avoid marking an unseen incoming gap read when a send response arrives first. Failed sends remain visible with retry actions; confirmed messages from polling reconcile with pending messages by sender and `clientMessageId`.

Frontend checks: `npm run test:messages`, `npm run typecheck`, existing auth/profile/friend tests, `node scripts/check-chat.cjs`, and `npx expo export --platform android`. Device acceptance: open from friends and from an existing conversation; send from two accounts; load more than 50 historical messages; go offline/send/retry; verify unread badges; unfriend and check retained history with disabled sending; switch tabs/background/foreground; test keyboard and dark mode.

## Open or reuse

`POST /direct-conversations`

```json
{"recipientId":"00000000-0000-4000-8000-000000000002"}
```

Returns a conversation summary: `id`, `user` (the other participant), `lastMessage` (nullable), `lastSeq`, `lastReadSeq`, `unreadCount`, `canSend`, `createdAt`, `updatedAt`. Counts and sequences are canonical nonnegative decimal strings, never JS Numbers. An empty conversation has all three sequence/count values `"0"`.

## List conversations

`GET /direct-conversations?limit=20&cursor=...`

Returns `{items, pageInfo:{nextCursor, hasMore}}`, ordered by `updatedAt DESC, id DESC`. Default 20, max 100. Send the returned opaque cursor unchanged with the same limit. It is signed and bound to the authenticated user. A changed conversation can move between requests; dedupe by ID. An empty/last page has `hasMore=false` and `nextCursor=null`.

## Send text

`POST /direct-conversations/{id}/messages`

```json
{"clientMessageId":"00000000-0000-4000-8000-000000000082","body":"  Hello!\n"}
```

Returns `{id, conversationId, seq, sender, clientMessageId, body, createdAt}`. Body requires non-whitespace text and at most 4,000 Unicode code points; leading/trailing spaces and newlines are preserved. The authenticated session determines the sender. Generate a new UUID for each new message; on network retry reuse the same UUID and exact body. Same ID/body returns the original message, changed body returns `409 IDEMPOTENCY_CONFLICT`. IDs are scoped to conversation and sender. Sending does not automatically mark messages read.

## History and polling

`GET /direct-conversations/{id}/messages?limit=50`

- Omit bounds to get the newest N messages.
- `beforeSeq=...` gets the nearest N older messages (exclusive).
- `afterSeq=...` gets the next N messages (exclusive), useful for REST polling.
- Do not combine bounds. Default 50, max 100. Items always have ascending `seq`.

Returns `{items, pageInfo:{hasMore, nextBeforeSeq, nextAfterSeq}}`. `hasMore` follows the query direction. `nextBeforeSeq` is the smallest returned sequence when older messages exist, otherwise null. `nextAfterSeq` is the largest returned sequence, or the supplied `afterSeq`/`"0"` on an empty page. For polling, merge by message ID/sequence and request `afterSeq=nextAfterSeq` until `hasMore=false`. Reading history does not change unread counts.

## Mark read

`PUT /direct-conversations/{id}/read`

```json
{"lastReadSeq":"12"}
```

Returns `{conversationId, lastReadSeq, unreadCount}` for the caller. Send the highest sequence actually displayed. The marker only increases, so late requests from another device do not move it backwards. Zero is valid; sequences above the conversation's `lastSeq` are rejected. Unread counts include only incoming messages with `seq > lastReadSeq`.

## Errors

| Status/code | Trigger |
| --- | --- |
| 400 `INVALID_REQUEST` | Malformed UUID/query, invalid/tampered cursor, limits outside 1..100, invalid history bounds |
| 401 `UNAUTHORIZED` | Missing/invalid authenticated session (existing JWT/device checks apply) |
| 403 `NOT_FRIENDS` | Opening/sending without current friendship |
| 404 `CONVERSATION_NOT_FOUND` | Conversation absent or caller is not a participant |
| 404 `USER_NOT_FOUND` | Participant absent/disabled when opening/sending |
| 409 `IDEMPOTENCY_CONFLICT` | Retry UUID reused with different body |
| 409 `MESSAGE_LIMIT_REACHED` | Per-conversation bigint sequence exhausted |
| 422 `VALIDATION_ERROR` | Missing/wrong body values, self conversation, blank/oversized text, invalid read sequence |

## Persistence and verification

Flyway `V7__direct_messages.sql` creates the tables, unique pair/retry/sequence constraints and paging/unread indexes. Opening and sending lock users in the same canonical order as the friend service, then lock the conversation for sequence allocation. Read-marker changes lock the conversation and apply `max(old,new)`. No application database is modified just by running unit tests.

Run backend tests with JDK 26:

```powershell
cd backend
.\mvnw.cmd test
```

PostgreSQL integration tests are opt-in. Prepare a dedicated disposable database named **tripmate_messaging_test** owned by `tripmate`; never point these tests at application/production data. Tests apply all Flyway migrations, create test users/messages and leave fixture data in this disposable database.

```powershell
$env:MESSAGING_TEST_DATABASE_URL = 'jdbc:postgresql://localhost:5433/tripmate_messaging_test'
$env:MESSAGING_TEST_DATABASE_PASSWORD = '<local database password>'
.\mvnw.cmd '-Dtest=DirectMessagingPersistenceTest' '-DargLine=-Duser.timezone=UTC' test
```

The test JVM uses UTC to avoid the Windows `Asia/Saigon` timezone alias being rejected by PostgreSQL. The integration suite checks persisted history, unread state, unfriend/refriend, outsider permissions, keyset paging, concurrent opposite opens, concurrent send retries and opposite sends allocating unique contiguous sequences. Without the dedicated URL these database tests are skipped. Unit and controller tests cover validation, privacy, authentication, retries, signed cursor scope and monotonic read markers without PostgreSQL.

Rollback: deploy previous application code and keep the new tables/data. Do not drop history as part of a code rollback.

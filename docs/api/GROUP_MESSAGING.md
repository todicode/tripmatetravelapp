# Independent group messaging API

Implemented REST endpoints below use `/api/v1`, Bearer authentication and `{data, requestId}` responses with `Cache-Control: private, no-store`. Full request/response examples are in [openapi.json](openapi.json), contract 1.5.0.

Groups exist independently of trips. The creator is OWNER; membership is separate from friendship and trip membership. This change implements backend APIs only. The group UI is still local; group WebSocket, avatars, attachments, invitations and push are not implemented.

## Endpoints

| Method | Path after `/api/v1` | Access |
| --- | --- | --- |
| POST | `/group-conversations` | Authenticated creator |
| GET | `/group-conversations` | Own active memberships |
| GET | `/group-conversations/{id}` | Active member |
| PATCH | `/group-conversations/{id}` | Owner, expectedVersion |
| DELETE | `/group-conversations/{id}?expectedVersion=...` | Owner; archive, retains history |
| GET | `/group-conversations/{id}/members` | Active member |
| POST | `/group-conversations/{id}/members` | Owner adds current friend |
| DELETE | `/group-conversations/{id}/members/{userId}?expectedVersion=...` | Owner removes member |
| DELETE | `/group-conversations/{id}/members/me` | Member leaves; transfer ownership first |
| PUT | `/group-conversations/{id}/owner` | Owner transfers to active enabled member |
| GET | `/group-conversations/{id}/trip` | Active member, read-only owned trip |
| GET | `/group-conversations/{id}/messages` | Active member; paginated history |
| POST | `/group-conversations/{id}/messages` | Active member; text only |
| PUT | `/group-conversations/{id}/read` | Own monotonic read marker |

Deletion of a membership returns 204 without a body. Creating a group returns 201; other non-204 successful operations return 200. Create is a new group per POST; names are not unique and creation is not deduplicated.

## Typical flow

```json
POST /api/v1/group-conversations
{"name":"Travel friends","memberIds":["<friend UUID>"],"tripId":null}
```

The creator is implicit and must not appear in memberIds. IDs must be unique; empty memberIds is allowed. Max 99 invited friends plus the creator. Names are trimmed and 1–100 Unicode code points.

```json
POST /api/v1/group-conversations/<id>/messages
{"clientMessageId":"<new UUID per send>","body":"Hello group!"}

PUT /api/v1/group-conversations/<id>/read
{"lastReadSeq":"1"}

PATCH /api/v1/group-conversations/<id>
{"expectedVersion":"0","tripId":"<owned server trip UUID>"}

PATCH /api/v1/group-conversations/<id>
{"expectedVersion":"1","tripId":null}
```

Sequences, versions, unread counts and VND are decimal strings. Preserve a failed send's clientMessageId and exact body when retrying. Same sender/ID/body returns the existing message; changing the body yields IDEMPOTENCY_CONFLICT. Each group has contiguous sequences and sender-scoped retries. This does not advance group management version.

Lists use signed actor/limit/group-scoped cursors (default 20, max 100). History uses exclusive `beforeSeq` or `afterSeq`, never both (default 50, max 100); items return ascending. An empty catch-up preserves afterSeq. Fetch pages until hasMore=false. New/rejoining members can read retained history, but unread starts at the tail when they join. Own messages are excluded from unread.

PATCH requires expectedVersion plus name and/or tripId. Missing tripId keeps the link; null unlinks. Membership changes, transfer, archive and metadata changes advance version; sending/reading does not. Stale changes return VERSION_CONFLICT. Fetch current details before retrying a management action. Already active add, already ended removal/leave and already archived close are no-ops.

Only ACTIVE members have group, history, read or linked-trip access. Departed/removed/outsider access returns GROUP_NOT_FOUND without disclosing the group's existence. Only owner manages group; member management attempts return OWNER_REQUIRED. Owner cannot leave/remove self until ownership transfer. Ownership transfer unlinks the previous owner's trip atomically. Archive preserves data and blocks new sends/edit/add/transfer, while read, leave and owner removal remain available. Sender retry of a committed message still works after archive while membership remains ACTIVE.

## Trip sharing boundary

V8 adds cities/trips/members and itinerary tables from the planned schema. Trip creation/edit/provider APIs are a separate feature and do not run yet. Frontend-local trips cannot be linked by trusting a caller-supplied owner ID or snapshot. Until server trips exist, groups work normally with tripId=null and attempts to link a nonexistent trip return TRIP_NOT_FOUND.

GET `/group-conversations/{id}/trip` checks the group membership and the trip's current owner/deleted state. It returns metadata, budget and current itinerary days/items, never contacts, GPS or media. It creates no trip membership and gives no edit permission. Unlinking, group removal or leaving revokes subsequent access. Deleted/foreign-owner trips stop being viewable. Trip and itinerary shared row locks protect this read; future itinerary writes must acquire their itinerary row lock before changing days/items.

## Persistence and verification

V9 adds group_conversations, group_members and group_messages without changing direct chat tables. Group row locks serialize membership, sends, read markers and management versions. Membership records and messages are retained after leaving/removal/archive. Group owner membership has a deferred FK, checked at commit; service guards ensure owner is ACTIVE and capacity is not exceeded.

Run service/controller/regression tests with JDK 26:

```powershell
cd backend
.\mvnw.cmd test
```

PostgreSQL acceptance requires a dedicated database named **tripmate_group_test**, owned by tripmate. Never point these tests at the application/production database. Tests apply V1–V9 and leave random isolated fixtures in this disposable test database.

```powershell
$env:GROUP_TEST_DATABASE_URL = 'jdbc:postgresql://localhost:55432/tripmate_group_test'
$env:GROUP_TEST_DATABASE_PASSWORD = '<test database password>'
.\mvnw.cmd '-Dtest=GroupMessagingPersistenceTest' '-DargLine=-Duser.timezone=UTC' test
```

The tests cover membership/owner/outsider permissions, friend removal, message retry conflicts and exact payload preservation, concurrent duplicate/different-sender sends, the last member slot, monotonic reads, paging/cursor scope, trip ownership, read-only followers, unlink/transfer, rejoin and archived history.

Rollback: deploy previous application code and retain V8/V9 tables/data. Do not drop group or direct-message history. No production database is changed by creating this commit; Flyway applies the additive migrations on the next backend startup.

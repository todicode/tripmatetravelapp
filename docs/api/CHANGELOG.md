# Contract changelog

## 1.4.2 - 2026-10-05

- Added `GET /direct-conversations/presence` and `direct.presence.updated` on the existing private queue. Only existing conversation peers are exposed; no arbitrary user status lookup.
- Presence combines authenticated foreground connections across devices. The last disconnect has a 10-second grace period after transport loss is detected. State is ephemeral and limited to one backend; reconnect and 30-second REST snapshots reconcile missed updates.
- Personal chat shows an accessible green dot beside avatars and an active label in the header. Group chat and durable last-seen history are outside this change.

## 1.4.1 - 2026-10-03

- Implemented authenticated STOMP 1.2 over native WebSocket at `/ws`. Only `/user/queue/events` is currently subscribable; business SEND and other destinations are rejected. Token expiry, account status and device binding are rechecked before delivery.
- Added `direct.message.created` and `direct.read.updated` payload schemas. Events reach both participants after transaction commit; retries/no-op reads do not produce extra events. REST remains authoritative for writes and recovery.
- Frontend subscribes before catch-up, buffers live events, deduplicates messages and reconnects with backoff. Polling remains a fallback and periodic reconciliation. Broker delivery currently requires a single backend instance; group/push/Redis bridging are outside this slice.

## 1.4.0 - 2026-10-03

- Added five authenticated REST operations for direct text messaging: open/list conversations, send/list messages, and update the caller's read sequence. Frontend integration, WebSocket, push and attachments are outside this implementation slice.
- Only current friends may open a conversation or send; unfriend retains participant access to history and read markers. One canonical conversation per pair, contiguous per-conversation sequences and sender-scoped `clientMessageId` retries are transaction protected.
- New `DirectConversation`, `DirectMessage`, page, read and request schemas. Bigint sequence/read/unread values are strings; text is preserved exactly and limited to 4,000 Unicode code points. Conversation lists use signed actor-bound keyset cursors; message pages use exclusive `beforeSeq`/`afterSeq` and return ascending sequences.
- Flyway V7 adds `direct_conversations` and `direct_messages` without altering identity/social data. Examples and database acceptance instructions: `DIRECT_MESSAGING.md`.

## Interests implementation - 2026-10-02

- Implemented authenticated GET `/interests` and profile `interestCodes` persistence. No wire schema change: the list is unique, has at most 50 codes, omission preserves selections, and `[]` clears them. Null, unknown codes and invalid shapes return 422 atomically with other profile changes.
- Flyway V4 creates `interests` and `user_interests`, seeded with FOOD, NATURE, CULTURE, HIGHLIGHTS, MUSEUMS, HISTORY and SHOPPING. Frontend reads labels/codes from the catalog API. Trip setup's existing local preferences remain separate until the trip implementation slice.
- Implementation and acceptance checklist: `INTEREST_IMPLEMENTATION_PLAN.md`.

## 1.3.1 - 2026-10-01

- Added the avatar implementation slice: multipart upload, protected metadata/content/thumbnail, orphan deletion and atomic profile avatar attachment/removal. CHAT and friend/trip visibility remain unimplemented; avatar access currently requires ownership.
- Avatar images accept JPEG/PNG/WebP up to 10,000,000 bytes and 40,000,000 pixels, then normalize to square JPEG up to 1024px and a thumbnail up to 256px. Response MIME and dimensions describe the normalized object.
- Media content/thumbnail operations document `503 SERVICE_UNAVAILABLE` for storage failures. Public wire schemas otherwise remain unchanged.
- Flyway V3 introduces avatar media metadata, ownership FK and global quota reservation. R2 remains private; storage configuration and manual acceptance steps are in `R2_AVATAR_SETUP.md`.

## Auth completion - 2026-09-30

- Registration, password reset and password change enforce the BCrypt limit of 72 UTF-8 bytes in addition to 8–128 characters. Oversized new passwords return `422 PASSWORD_TOO_LONG` before hashing or consuming an OTP; oversized login passwords return `401 INVALID_CREDENTIALS`.
- Mobile remembers refresh credentials in SecureStore when requested, restores sessions, shares concurrent refresh requests and retries protected requests at most once after `401`. The current backend emits `UNAUTHORIZED` for expired or invalid access tokens, so the client supports this code as well as token-expiry responses. Refresh failure with `401` clears the session; transient failures remain retryable.
- Registration/reset resend controls now respect `resendAvailableAt` and server retry windows. No new endpoint or database migration.

## Documentation corrections - 2026-09-27

- Added the missing request example for `POST /auth/change-password` so the mock contract suite can exercise its existing schema. No endpoint or wire schema changed.
- Reused the standard 400 response for password change, including its existing response envelope, request ID header and examples. Password change business errors continue to use 422 as implemented by the backend.
- Corrected the README operation count to 73 and added the implementation roadmap based on the current UI and database design.

## 1.3.0 - 2026-09-24

- Added `POST /auth/password-reset/request` for an existing active, verified account. It returns a reset ID and sends a six-digit email OTP; repeat requests respect the resend cooldown.
- Added `POST /auth/password-reset/confirm` to consume the OTP, set a new password, and invalidate existing sessions. The user logs in again afterward.
- Added `password_reset_challenges` through Flyway V2. Existing identity data remains intact; rollback requires reverting the application and explicitly dropping the new table after pending resets are no longer needed.
- Verified with backend unit tests, frontend typecheck, and contract validation.

## 1.2.0 - 2026-09-23

- Documented the existing `X-Request-Id` header on the registration cancellation response.
- Added `POST /auth/register/cancel` to discard an unfinished registration (idempotent 204).
- Starting registration again with the same email replaces an unfinished challenge; the previous OTP becomes invalid.
- Reduced email OTP expiry from 10 minutes to 3 minutes. Frontend and backend must use the returned `expiresAt` for timing; no database schema migration is needed.
- Verified with backend auth tests, the SMTP email template test, frontend typecheck, and mock contract tests.

## 1.1.0 - 2026-09-22

- Added manual registration challenge, email OTP verification, and resend operations.
- Added Google ID token authentication with backend verification and TripMate session issuance.
- Added the optional phone field to profile responses and the required phone field to manual registration.
- Added request/response examples and operation-specific authentication error codes.

## 1.0.0 — 2026-09-17

Baseline triển khai đầu tiên; không có API runtime trước đó để migration.

- 66 REST operations theo kế hoạch TripMate v1 và ERD 23 bảng.
- Quy định JSON camelCase, bigint string, envelope, errors, cursor/seq, auth và phân quyền.
- Sửa toàn bộ lịch nguyên tử với expectedVersion; trip dùng expectedTripVersion riêng.
- AI draft/apply, media/chat chống trùng, location TTL; STOMP nhận sự kiện và FCM ID payload.
- Thêm examples, HTTP mock độc lập backend, validator và CI.
- Các quyết định bổ sung/giới hạn v1 ghi tại TEAM_RULES; chưa có bằng chứng test backend/mobile.

Thay đổi contract tiếp theo phải ghi phiên bản, thay đổi wire/behavior, ảnh hưởng FE/BE, cách migration và bằng chứng kiểm tra. Không ghi tên người đã phê duyệt nếu chưa có review thực tế.

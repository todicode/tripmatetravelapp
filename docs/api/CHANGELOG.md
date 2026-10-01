# Contract changelog

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

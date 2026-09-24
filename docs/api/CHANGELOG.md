# Contract changelog

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

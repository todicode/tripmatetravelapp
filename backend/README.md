# TripMate Backend

Backend API for the Login and Register screens in `frontend/App.tsx`. The Android development build calls this backend for Google sign-in, email/password login, registration, and email OTP verification.

## Stack

- Java 26
- Spring Boot 4.1.1 and Spring Security 7.1.1
- PostgreSQL with Flyway migrations and Hibernate `ddl-auto=validate`
- JWT access tokens (15 minutes by default) and rotating, hashed refresh tokens (30 days by default)
- Google ID token verification through the Google API client
- Resend SMTP in production; a logging sender is used locally so no email provider is required

The version choices are recorded in `pom.xml`. Use the Maven Wrapper so the Maven version is consistent:

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

## Database

The default local connection matches `docs/database/DBEAVER_LOCAL.md`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5433/tripmate_erd` | PostgreSQL JDBC URL |
| `DATABASE_USERNAME` | `tripmate` | Database user |
| `DATABASE_PASSWORD` | empty | Set locally; never commit it |

Flyway applies `src/main/resources/db/migration/V1__identity.sql`. The migration owns the identity tables used here: `app_users`, `user_devices`, `refresh_tokens`, `pending_registrations`, and `auth_identities`.

## Environment

Copy values into the process environment rather than committing a secret:

| Variable | Default | Notes |
| --- | --- | --- |
| `JWT_SECRET` | development placeholder | Use a random value of at least 32 characters outside local development |
| `ACCESS_TOKEN_TTL` | `15m` | TripMate access token lifetime |
| `REFRESH_TOKEN_TTL` | `30d` | Refresh token family lifetime |
| `EMAIL_MODE` | `log` | Set `smtp` for Gmail or Resend SMTP |
| `MAIL_HOST` | `smtp.resend.com` | Resend SMTP host |
| `MAIL_PORT` | `587` | STARTTLS port |
| `MAIL_USERNAME` | `resend` | Resend SMTP username |
| `MAIL_PASSWORD` | empty | Resend API key/password, supplied through secret storage |
| `MAIL_FROM` | `no-reply@tripmate.local` | Verified sender in production |
| `GOOGLE_WEB_CLIENT_ID` | empty | OAuth web client ID used as the ID token audience |

With `EMAIL_MODE=log`, the backend logs the recipient, expiry and OTP for local development only. It must not be enabled in a shared or production environment.

For local Gmail SMTP, run `./scripts/setup-gmail-smtp.ps1` from the repository root in PowerShell. It prompts once for a Gmail App Password and saves the sender address and password in the Git-ignored `personal/gmail-smtp.env`. Later `./scripts/run-backend.ps1` calls automatically load that file and enable Gmail SMTP. Use `-Email address@gmail.com` for another sender, or `-Replace` to rotate the stored App Password. Do not commit or share the file. If the file is absent, the backend helper retains `EMAIL_MODE=log` and prints development OTP codes to its terminal.

## Authentication API

Base URL: `http://localhost:8080/api/v1`.

1. `POST /auth/register` accepts `email`, `password`, `displayName`, `phone`, and `installationId`. It returns `202` with `verificationId`, `expiresAt`, and `resendAvailableAt`; the OTP expires after three minutes. A new request for the same email replaces an unfinished challenge. It does not create a user or session yet.
2. `POST /auth/register/verify` accepts `verificationId` and the six digit `otp`. A correct, unexpired code is single-use. It returns `201` with the TripMate access token, refresh token, device ID, and profile.
3. `POST /auth/register/resend` accepts `verificationId`. Resends only after the cooldown and rotates the stored OTP hash.
4. `POST /auth/register/cancel` accepts `verificationId` and deletes an unfinished challenge. Missing or already completed challenges are safe no-ops. Expired challenges are also removed by a periodic cleanup job.
5. `POST /auth/login` accepts email/password and `installationId`. Manual accounts can log in only after email verification.
6. `POST /auth/google` accepts a Google `idToken` and `installationId`. The backend verifies the token signature, audience, issuer, expiry, subject and `email_verified`, then issues TripMate tokens. A Google identity is not automatically linked to an existing manual account with the same email; v1 returns `AUTH_METHOD_CONFLICT`.
7. `POST /auth/refresh` rotates a single-use refresh token. Reuse revokes the whole token family.
8. `POST /auth/logout` requires the bearer access token, revokes refresh tokens for the current device and increments its binding version.
9. `GET /users/me` requires the bearer access token and returns the profile, including `phone` when available.

Successful JSON responses use `{ "data": ..., "requestId": ... }`; errors use `{ "requestId": ..., "error": { "code", "message", "details", "context" } }`. The complete wire contract and examples are in [`docs/api/openapi.json`](../docs/api/openapi.json).

## Local request examples

```powershell
$base = "http://localhost:8080/api/v1"
$installationId = "00000000-0000-4000-8000-000000000002"

$register = Invoke-RestMethod "$base/auth/register" -Method Post -ContentType "application/json" -Body (@{
  email = "an@example.test"
  password = "Demo-only-password-123!"
  displayName = "Nguyen An"
  phone = "+84901234567"
  installationId = $installationId
} | ConvertTo-Json)

# Read the OTP from the backend log (EMAIL_MODE=log) or the recipient inbox (SMTP).
$otp = Read-Host 'Enter the received OTP'
$session = Invoke-RestMethod "$base/auth/register/verify" -Method Post -ContentType "application/json" -Body (@{
  verificationId = $register.data.verificationId
  otp = $otp
} | ConvertTo-Json)

Invoke-RestMethod "$base/auth/register/resend" -Method Post -ContentType "application/json" -Body (@{
  verificationId = $register.data.verificationId
} | ConvertTo-Json)

$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
  email = "an@example.test"
  password = "Demo-only-password-123!"
  installationId = $installationId
} | ConvertTo-Json)

$google = Invoke-RestMethod "$base/auth/google" -Method Post -ContentType "application/json" -Body (@{
  # For a real request, use the ID token returned by the mobile Google SDK.
  idToken = "<google-id-token-from-mobile>"
  installationId = $installationId
} | ConvertTo-Json)

$rotated = Invoke-RestMethod "$base/auth/refresh" -Method Post -ContentType "application/json" -Body (@{
  refreshToken = $session.data.refreshToken
} | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($session.data.accessToken)" }
Invoke-RestMethod "$base/users/me" -Headers $headers
Invoke-RestMethod "$base/auth/logout" -Method Post -Headers $headers
```

The registration screen can model the API states as: `202` = show the OTP form and countdown, `422 OTP_INVALID` = keep the form and show an inline error, `410 OTP_EXPIRED` = offer resend, `429 OTP_RESEND_TOO_SOON` or `OTP_ATTEMPTS_EXCEEDED` = respect the retry window, and `201` = store the returned session. Google uses `200` for both a first-time account and a returning account; `409 AUTH_METHOD_CONFLICT` asks the user to use the existing manual sign-in flow.

For Android Emulator, use `http://10.0.2.2:8080/api/v1`; for a physical device use the development computer's LAN address. Production traffic must use HTTPS.

## Google Cloud setup

Create an OAuth web client in the same Google Cloud project as the mobile credentials and set its client ID as `GOOGLE_WEB_CLIENT_ID`. Configure the Android client with package `com.tripmate.app` and every signing certificate SHA-1 used by local, internal, and release builds. The mobile client sends the resulting Google ID token to `/auth/google`; the backend never trusts a client-provided email or subject. Do not put a client secret, JWT secret, or Resend credential in the mobile app or in Git.

## Current boundaries

- Password reset, profile editing, interests, device push tokens and PostgreSQL concurrency suites are not part of this first identity slice.
- Auth endpoints have a per-instance in-memory rate limit (`10` general requests or `5` OTP requests per minute per remote address). Replace it with a shared store such as Redis before running multiple backend instances.
- Google-created users have no phone value because Google authentication does not collect the manual registration phone field. Add a profile-completion endpoint before making phone mandatory for those accounts.
- The local logging email sender is a development adapter. Configure SMTP and a verified Resend sender before integration testing real email delivery.

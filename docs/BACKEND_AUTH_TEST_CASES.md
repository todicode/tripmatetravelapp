# Test cases backend authentication

Tài liệu này kiểm thử các API đã có controller thật trong `backend/`. OpenAPI hiện có nhiều path hơn, nhưng các API trip, friend, notification, media... vẫn là contract/mock và chưa thể gọi vào backend thật.

Base URL khi chạy local:

```text
http://localhost:8081/api/v1
```

## 1. Chuẩn bị môi trường test

Dùng database PostgreSQL rỗng riêng cho backend. Không dùng `docs/database/compose.erd.yml` cho smoke test backend vì file đó là schema ERD tham chiếu và không có lịch sử Flyway.

```powershell
docker rm -f tripmate-auth-test-pg 2>$null
docker run -d --name tripmate-auth-test-pg `
  -e POSTGRES_DB=tripmate_auth `
  -e POSTGRES_USER=tripmate `
  -e POSTGRES_PASSWORD=testpass `
  -p 127.0.0.1:55432:5432 postgres:17

for ($i = 0; $i -lt 30; $i++) {
  docker exec tripmate-auth-test-pg pg_isready -U tripmate -d tripmate_auth 2>$null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}
```

Trong một PowerShell khác, chạy backend với cấu hình dễ kiểm thử:

```powershell
cd D:\travelapp\backend
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:55432/tripmate_auth"
$env:DATABASE_USERNAME = "tripmate"
$env:DATABASE_PASSWORD = "testpass"
$env:JWT_SECRET = "local-test-secret-with-at-least-32-characters"
$env:EMAIL_MODE = "log"
$env:GOOGLE_WEB_CLIENT_ID = ""
$env:EMAIL_VERIFICATION_TTL = "10m"
$env:EMAIL_RESEND_COOLDOWN = "5s"
$env:AUTH_RATE_LIMIT_PER_WINDOW = "100"
$env:OTP_RATE_LIMIT_PER_WINDOW = "100"
$env:SERVER_PORT = "8081"
.\mvnw.cmd spring-boot:run
```

`EMAIL_MODE=log` chỉ dùng local: OTP xuất hiện trong log backend. Không bật mode này ở môi trường dùng chung hoặc production.

Các response thành công có dạng `{ data, requestId }`. Các response lỗi có dạng `{ requestId, error: { code, message, details, context } }`. Mỗi request cần kiểm tra thêm header `X-Request-Id`.

## 2. Test bằng Postman

### Import OpenAPI

1. Mở Postman, chọn **Import**.
2. Chọn file `D:\travelapp\docs\api\openapi.json`.
3. Chọn import thành collection.
4. Tạo environment `TripMate local` với các biến:

```text
baseUrl          = http://localhost:8081/api/v1
email            = test@example.com
password         = Password!123
displayName      = Test User
phone            = +84901234567
installationId  = UUID mới
verificationId   =
otp              =
accessToken      =
refreshToken     =
```

Chọn environment này ở góc phải Postman. Nếu collection sinh URL từ mock server `http://localhost:4010/api/v1`, thay server variable bằng `{{baseUrl}}` để gọi backend thật.

### Khi Postman không hiện các field JSON

Postman không phải nguồn chuẩn duy nhất cho request schema. Tra field theo thứ tự sau:

1. Mở `docs/api/openapi.json`, tìm path và method, sau đó xem `requestBody.content.application/json.schema`.
2. Nếu schema có `$ref`, tìm tên đó trong `components.schemas`.
3. Với 9 API backend đã implement, xem thêm `backend/src/main/java/com/tripmate/identity/web/AuthRequests.java`.
4. Trong Postman, vào **Body → raw → JSON** và tự nhập body theo bảng dưới. Khi chọn JSON, Postman sẽ thêm `Content-Type: application/json`.

| API                            | Field JSON                                                              |
| ------------------------------ | ----------------------------------------------------------------------- |
| `POST /auth/register`        | `email`, `password`, `displayName`, `phone`, `installationId` |
| `POST /auth/register/verify` | `verificationId`, `otp`                                             |
| `POST /auth/register/resend` | `verificationId`                                                      |
| `POST /auth/login`           | `email`, `password`, `installationId`                             |
| `POST /auth/google`          | `idToken`, `installationId`                                         |
| `POST /auth/refresh`         | `refreshToken`                                                        |
| `POST /auth/logout`          | Không có JSON body; dùng Bearer token                                |
| `GET /users/me`              | Không có JSON body; dùng Bearer token                                |
| `GET /health`                | Không có JSON body                                                    |

Field trong request phân biệt hoa thường. Gửi field lạ như `role`, `userId` hoặc `googleSubject` sẽ bị từ chối với `400 INVALID_REQUEST`.

### installationId: thiết bị của người dùng

`installationId` là UUID đại diện cho một lần cài đặt ứng dụng trên một thiết bị. Đây không phải là thông tin người dùng cần tự nhập, không phải IMEI và không hiển thị trên màn hình đăng ký.

Frontend nên sinh UUID lần đầu mở app, lưu vào secure storage/AsyncStorage, rồi dùng lại cho đăng ký, login và Google login trên cùng lần cài đặt. Backend dùng giá trị này để bind session với device, phát hiện device rebind và vô hiệu hóa token cũ khi logout.

Trong Postman, tạo một UUID một lần bằng PowerShell:

```powershell
[guid]::NewGuid().ToString()
```

Lưu kết quả vào environment variable `installationId` và dùng `{{installationId}}` trong các request. Không dùng `{{$guid}}` trực tiếp trong nhiều request nếu muốn giữ cùng một device, vì mỗi lần gọi có thể sinh UUID mới.

### Body và authorization mẫu

`POST {{baseUrl}}/auth/register`:

```json
{
  "email": "{{email}}",
  "password": "{{password}}",
  "displayName": "{{displayName}}",
  "phone": "{{phone}}",
  "installationId": "{{installationId}}"
}
```

Sau khi nhận OTP từ log backend, set environment variable `otp`, sau đó gửi `POST {{baseUrl}}/auth/register/verify`:

```json
{
  "verificationId": "{{verificationId}}",
  "otp": "{{otp}}"
}
```

Với `GET {{baseUrl}}/users/me` và `POST {{baseUrl}}/auth/logout`, vào tab **Authorization**, chọn **Bearer Token**, điền `{{accessToken}}`.

### Postman Tests để tự lưu ID và token

Trong tab **Tests** của request register:

```javascript
const body = pm.response.json();
pm.test("register returns 202", () => pm.response.to.have.status(202));
pm.environment.set("verificationId", body.data.verificationId);
```

Trong tab **Tests** của request verify/login/refresh:

```javascript
const body = pm.response.json();
pm.test("session response is successful", () => {
  pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});
pm.environment.set("accessToken", body.data.accessToken);
pm.environment.set("refreshToken", body.data.refreshToken);
```

Sau đó dùng `{{verificationId}}`, `{{accessToken}}` và `{{refreshToken}}` ở các request tiếp theo.

## 3. Luồng thành công cơ bản

```powershell
$base = "http://localhost:8081/api/v1"
$email = "test-$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
$installationId = [guid]::NewGuid().ToString()

# TC-001: health
Invoke-RestMethod "$base/health"

# TC-002: bắt đầu đăng ký thủ công
$register = Invoke-RestMethod "$base/auth/register" -Method Post -ContentType "application/json" -Body (@{
  email = $email
  password = "Password!123"
  displayName = "Test User"
  phone = "+84901234567"
  installationId = $installationId
} | ConvertTo-Json)
# Kỳ vọng: HTTP 202, có verificationId/expiresAt/resendAvailableAt.
# Đọc OTP 6 số từ log backend.

# TC-003: xác minh OTP
$session = Invoke-RestMethod "$base/auth/register/verify" -Method Post -ContentType "application/json" -Body (@{
  verificationId = $register.data.verificationId
  otp = "<OTP_TRONG_LOG>"
} | ConvertTo-Json)
# Kỳ vọng: HTTP 201, có accessToken, refreshToken, deviceId và user.

$accessToken = $session.data.accessToken
$refreshToken = $session.data.refreshToken
$authHeader = @{ Authorization = "Bearer $accessToken" }

# TC-004: profile hiện tại
Invoke-RestMethod "$base/users/me" -Headers $authHeader
# Kỳ vọng: HTTP 200, profile có email/phone, không có password hoặc token.

# TC-005: đăng nhập lại bằng email/password
$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
  email = $email
  password = "Password!123"
  installationId = $installationId
} | ConvertTo-Json)
# Kỳ vọng: HTTP 200 và session mới.

# TC-006: refresh token rotation
$rotated = Invoke-RestMethod "$base/auth/refresh" -Method Post -ContentType "application/json" -Body (@{
  refreshToken = $refreshToken
} | ConvertTo-Json)
# Kỳ vọng: HTTP 200 và refreshToken mới khác token cũ.

# TC-007: logout
Invoke-WebRequest "$base/auth/logout" -Method Post -Headers @{ Authorization = "Bearer $($rotated.data.accessToken)" } -UseBasicParsing
# Kỳ vọng: HTTP 204.
```

## 4. Testcase theo API và lỗi nghiệp vụ

| ID     | API                            | Dữ liệu/thao tác                                                           | Kỳ vọng                                                                      |
| ------ | ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| TC-008 | `POST /auth/register`        | Email sai format, password dưới 8 ký tự, thiếu tên/phone/installationId | `422 VALIDATION_ERROR`                                                       |
| TC-009 | `POST /auth/register`        | Gửi thêm field không tồn tại, ví dụ`role=admin`                      | `400 INVALID_REQUEST`                                                        |
| TC-010 | `POST /auth/register`        | Gọi lại với email đã có user                                            | `409 EMAIL_ALREADY_REGISTERED`                                               |
| TC-011 | `POST /auth/register`        | Gọi lại khi email đang có challenge chưa hết hạn                       | `409 REGISTRATION_PENDING`, có `verificationId` trong context             |
| TC-012 | `POST /auth/register/verify` | OTP sai                                                                       | `422 OTP_INVALID`; attempts tăng trong database                             |
| TC-013 | `POST /auth/register/verify` | Nhập sai đủ số lần cho phép; khi test nên để rate limit OTP cao      | `429 OTP_ATTEMPTS_EXCEEDED`                                                  |
| TC-014 | `POST /auth/register/verify` | Dùng OTP sau`EMAIL_VERIFICATION_TTL`                                       | `410 OTP_EXPIRED`                                                            |
| TC-015 | `POST /auth/register/verify` | Dùng`verificationId` không tồn tại                                      | `404 VERIFICATION_NOT_FOUND`                                                 |
| TC-016 | `POST /auth/register/verify` | Dùng lại challenge đã verify thành công                                 | `410 VERIFICATION_ALREADY_USED`                                              |
| TC-017 | `POST /auth/register/resend` | Gửi lại trước`EMAIL_RESEND_COOLDOWN`                                    | `429 OTP_RESEND_TOO_SOON`, có `retryAfterSeconds`                         |
| TC-018 | `POST /auth/register/resend` | Gửi lại sau cooldown                                                        | `202`, OTP hash được thay mới                                            |
| TC-019 | `POST /auth/login`           | Sai email hoặc password                                                      | `401 INVALID_CREDENTIALS`; không phân biệt email có tồn tại hay không |
| TC-020 | `POST /auth/login`           | Thiếu/sai`installationId`                                                  | `422 VALIDATION_ERROR`                                                       |
| TC-021 | `POST /auth/google`          | Chưa cấu hình`GOOGLE_WEB_CLIENT_ID`                                      | `503 GOOGLE_NOT_CONFIGURED`                                                  |
| TC-022 | `POST /auth/google`          | ID token giả, malformed hoặc bị sửa một ký tự                          | `401 INVALID_GOOGLE_TOKEN`                                                   |
| TC-023 | `POST /auth/google`          | Token hợp lệ nhưng sai audience/issuer/expiry/email_verified               | `401 INVALID_GOOGLE_TOKEN`                                                   |
| TC-024 | `POST /auth/google`          | Google email trùng tài khoản thủ công                                    | `409 AUTH_METHOD_CONFLICT`; không tự link tài khoản                      |
| TC-025 | `POST /auth/refresh`         | Refresh token sai/không tồn tại/hết hạn                                  | `401 INVALID_REFRESH_TOKEN`                                                  |
| TC-026 | `POST /auth/refresh`         | Gửi lại refresh token cũ sau rotation                                      | `401 REFRESH_TOKEN_REUSE`; cả token family bị revoke                       |
| TC-027 | `POST /auth/logout`          | Không có Bearer token                                                       | `401 UNAUTHORIZED`                                                           |
| TC-028 | `GET /users/me`              | Không có token, token malformed, token tampered hoặc token hết hạn       | `401 UNAUTHORIZED`                                                           |
| TC-029 | `GET /users/me`              | Dùng access token sau logout                                                 | `401 UNAUTHORIZED`                                                           |
| TC-030 | Tất cả request JSON          | Không có`Content-Type: application/json`                                  | `415 UNSUPPORTED_MEDIA_TYPE` với endpoint body                              |
| TC-031 | Tất cả request JSON          | JSON malformed                                                                | `400 INVALID_REQUEST`                                                        |

## 5. Test bảo mật session và device binding

### Refresh rotation và reuse

1. Đăng nhập hoặc verify để lấy `refreshTokenA`.
2. Gọi `/auth/refresh` một lần, nhận `refreshTokenB`.
3. Gọi lại `/auth/refresh` bằng `refreshTokenA`.
4. Kỳ vọng `401 REFRESH_TOKEN_REUSE`.
5. Gọi `/auth/refresh` bằng `refreshTokenB`; token này cũng phải bị từ chối vì cả family đã bị thu hồi.

### Logout vô hiệu hóa access token

1. Lấy access token từ login.
2. Gọi `/auth/logout`.
3. Gọi `/users/me` bằng token cũ.
4. Kỳ vọng `401 UNAUTHORIZED`.

### Rebind cùng installation trên user khác

1. Đăng nhập user A với `installationId=X`, giữ access/refresh token của A.
2. Đăng nhập user B cũng với `installationId=X`.
3. Gọi `/users/me` bằng access token A.
4. Kỳ vọng `401 UNAUTHORIZED` do binding version đã thay đổi.
5. Gọi `/auth/refresh` bằng refresh token A.
6. Kỳ vọng `401 INVALID_REFRESH_TOKEN`.

### Tài khoản bị khóa

Chỉ dùng database test, không dùng production:

```powershell
docker exec tripmate-auth-test-pg psql -U tripmate -d tripmate_auth -c `
  "UPDATE app_users SET status = 'DISABLED' WHERE email = '<EMAIL_TEST>';"
```

Sau đó login phải trả `401 INVALID_CREDENTIALS`; access token hiện có phải bị từ chối bởi filter.

## 6. Rate limit

Rate limit hiện tại là in-memory theo IP trên từng instance:

- Register/login/google/refresh: 10 request/phút.
- Verify/resend OTP: 5 request/phút.

Khởi động lại backend với cấu hình mặc định, sau đó:

1. Gửi 11 request liên tiếp đến `/auth/login` từ cùng một máy.
2. Request thứ 11 phải trả `429 RATE_LIMITED`.
3. Kiểm tra header `Retry-After` và `error.context.retryAfterSeconds`.
4. Lặp lại với 6 request `/auth/register/verify` để kiểm tra nhóm OTP.

Restart backend hoặc chờ hết window trước khi chạy nhóm test tiếp theo.

## 7. Kiểm tra database không lưu dữ liệu nhạy cảm dạng thô

```powershell
docker exec tripmate-auth-test-pg psql -U tripmate -d tripmate_auth -c `
  "SELECT email, length(password_hash) AS password_hash_length FROM app_users;"

docker exec tripmate-auth-test-pg psql -U tripmate -d tripmate_auth -c `
  "SELECT email, otp_hash, attempts, used_at FROM pending_registrations;"

docker exec tripmate-auth-test-pg psql -U tripmate -d tripmate_auth -c `
  "SELECT length(token_hash) AS token_hash_length, consumed_at, revoked_at FROM refresh_tokens;"
```

Kỳ vọng:

- Password là BCrypt hash, không phải password gốc.
- `otp_hash` là chuỗi hash 64 ký tự, không phải OTP 6 số.
- Refresh token chỉ lưu hash 64 ký tự, không lưu token gốc.
- User chưa được tạo trước khi verify OTP thành công.

## 8. Google test thật

Để test case thành công, cần cấu hình `GOOGLE_WEB_CLIENT_ID` và lấy ID token thật từ Google SDK của mobile app:

1. Token hợp lệ, đúng audience, `email_verified=true` → `200`, tạo session TripMate.
2. Gọi lại cùng token/Google subject → `200`, đăng nhập tài khoản cũ.
3. Sửa payload hoặc signature → `401 INVALID_GOOGLE_TOKEN`.
4. Dùng token của client ID khác → `401 INVALID_GOOGLE_TOKEN`.
5. Dùng Google email đã tồn tại ở tài khoản thủ công → `409 AUTH_METHOD_CONFLICT`.

## 9. Dọn môi trường test

```powershell
docker rm -f tripmate-auth-test-pg
```

Các API còn lại trong `docs/api/openapi.json` chưa có backend controller thật, nên chỉ có thể kiểm tra bằng mock server hiện tại, chưa thể dùng chúng để đánh giá persistence hoặc security của backend.

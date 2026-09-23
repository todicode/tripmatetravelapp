# TripMate Auth API Notes

> Ghi chú tích hợp authentication/profile cho frontend. Cập nhật ngày 23/09/2026.

## Trạng thái hiện tại

- Backend auth đã được triển khai trong chuỗi commit từ `b01e540` đến `8bcc4fd`.
- Base URL backend thật: `http://localhost:8080/api/v1`.
- Mock API: `http://localhost:4010/api/v1`.
- Android Emulator: dùng `http://10.0.2.2:8080/api/v1` cho backend thật hoặc port `4010` cho mock.
- Frontend hiện gọi backend thật cho login, register, verify OTP, resend OTP và Google auth; Mock API chỉ còn để kiểm tra contract riêng.
- Session trả về hiện chỉ dùng để hiển thị kết quả test; access/refresh token chưa được lưu vào secure storage.
- Backend thật và database đã được tích hợp vào frontend qua URL cấu hình trong `frontend/.env.local`.

## API endpoints

| Method | Endpoint | Auth | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Không | Bắt đầu đăng ký, gửi OTP email |
| `POST` | `/auth/register/verify` | Không | Xác minh OTP, tạo tài khoản và session |
| `POST` | `/auth/register/resend` | Không | Gửi lại OTP |
| `POST` | `/auth/register/cancel` | Không | Huỷ yêu cầu đăng ký chưa xác minh |
| `POST` | `/auth/login` | Không | Đăng nhập email/mật khẩu |
| `POST` | `/auth/google` | Không | Đăng nhập/đăng ký bằng Google ID token |
| `POST` | `/auth/refresh` | Không | Đổi refresh token lấy session mới |
| `POST` | `/auth/logout` | Bearer | Đăng xuất thiết bị hiện tại |
| `GET` | `/users/me` | Bearer | Lấy profile tài khoản hiện tại |

Tất cả endpoint nằm dưới `/api/v1`. Response thành công dạng:

```json
{
  "data": {},
  "requestId": "uuid"
}
```

Response lỗi dạng `{ "requestId", "error" }`. Request/response auth nên dùng `Cache-Control: private, no-store`.

## 1. Đăng ký bằng email + OTP

### Bắt đầu đăng ký

`POST /auth/register`

```json
{
  "email": "an@example.test",
  "password": "TripMate2026!",
  "displayName": "Nguyen An",
  "phone": "+84901234567",
  "installationId": "00000000-0000-4000-8000-000000000002"
}
```

Trả `202`:

```json
{
  "data": {
    "verificationId": "uuid",
    "expiresAt": "2026-09-17T03:03:00Z",
    "resendAvailableAt": "2026-09-17T03:01:00Z"
  },
  "requestId": "uuid"
}
```

Backend chưa tạo `app_users` hoặc session ở bước này. Mật khẩu và OTP được lưu dưới dạng hash trong pending registration.

### Xác minh OTP

`POST /auth/register/verify`

```json
{
  "verificationId": "uuid",
  "otp": "123456"
}
```

OTP đúng, chưa hết hạn và chưa được dùng sẽ trả `201` cùng `SessionResponse`. OTP sai trả `422 OTP_INVALID`; hết hạn hoặc đã dùng trả `410`; vượt số lần thử trả `429 OTP_ATTEMPTS_EXCEEDED`.

Với backend thật, OTP được tạo ngẫu nhiên và gửi bằng Gmail SMTP nếu đã chạy `scripts/setup-gmail-smtp.ps1`, hoặc in trong log backend khi `EMAIL_MODE=log`. Mã `123456` chỉ áp dụng cho Mock API độc lập.

Mock sẽ giữ tạm `displayName`, `email` và `phone` từ request đăng ký để trả lại trong `SessionResponse` sau khi verify thành công. Password vẫn xuất hiện trong request log để test local, nhưng không nằm trong object `user` response theo contract API.

### Gửi lại OTP

`POST /auth/register/resend`

```json
{
  "verificationId": "uuid"
}
```

Chỉ được resend sau cooldown. Nếu gửi quá sớm, xử lý `429 OTP_RESEND_TOO_SOON` và dùng `details.retryAfterSeconds` để cập nhật countdown.

Thông số mặc định:

- OTP 6 chữ số.
- Hết hạn sau 3 phút.
- Cooldown resend 60 giây.
- Tối đa 5 lần nhập sai.
- OTP đúng chỉ dùng được một lần.

Nút Quay lại ở màn hình OTP gọi `/auth/register/cancel` để xoá yêu cầu tạm. Nếu app bị đóng đột ngột, lần đăng ký lại cùng email sẽ thay yêu cầu cũ và mã cũ hết hiệu lực; tác vụ nền xoá yêu cầu đã hết hạn. Không thể bảo đảm gọi API đúng lúc hệ điều hành cưỡng bức đóng app.

## 2. Đăng nhập email/mật khẩu

`POST /auth/login`

```json
{
  "email": "an@example.test",
  "password": "TripMate2026!",
  "installationId": "uuid"
}
```

Trả `200` cùng `SessionResponse`. Chỉ tài khoản `ACTIVE` và đã xác minh email mới đăng nhập được. Email được trim và lowercase. Sai email, sai mật khẩu, tài khoản chưa xác minh hoặc bị khóa đều dùng lỗi chung `401 INVALID_CREDENTIALS`.

## 3. Google authentication

`POST /auth/google`

```json
{
  "idToken": "google-id-token-from-mobile",
  "installationId": "uuid"
}
```

Backend tự kiểm tra chữ ký, audience, issuer, expiry, subject và `email_verified`; không tin email hoặc user ID do client tự gửi.

- Google user mới sẽ được tạo và nhận TripMate session.
- Google identity đã tồn tại sẽ đăng nhập vào user cũ.
- Không tự liên kết Google với tài khoản email thủ công cùng email; trả `409 AUTH_METHOD_CONFLICT`.
- Nếu chưa cấu hình `GOOGLE_WEB_CLIENT_ID`, API trả `503 GOOGLE_NOT_CONFIGURED`.

## 4. Session và token

`SessionResponse` gồm:

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "...",
  "refreshExpiresAt": "2026-10-17T03:00:00Z",
  "deviceId": "uuid",
  "user": {}
}
```

- Gọi API cần xác thực bằng `Authorization: Bearer <accessToken>`.
- Access token là JWT, mặc định sống 15 phút.
- Refresh token là chuỗi ngẫu nhiên, backend chỉ lưu hash, mặc định sống 30 ngày.
- Refresh token là single-use. Mỗi lần refresh phải thay token cũ bằng token mới.
- Nếu phát hiện reuse refresh token, backend thu hồi cả token family và yêu cầu đăng nhập lại.
- `installationId` đại diện cho một lần cài đặt app, không phải secret xác thực.
- Frontend phải lưu token trong secure storage, không dùng AsyncStorage thuần và không ghi token vào log/URL.

### Refresh

`POST /auth/refresh`

```json
{
  "refreshToken": "..."
}
```

Frontend chỉ nên cho phép một request refresh chạy tại một thời điểm. Các request khác cần chờ kết quả refresh; sau khi refresh thành công chỉ retry request gốc tối đa một lần.

### Logout

`POST /auth/logout`

Header:

```http
Authorization: Bearer <accessToken>
```

Trả `204 No Content`. Backend thu hồi refresh token trên thiết bị hiện tại, unbind thiết bị và làm JWT cũ mất hiệu lực. Frontend vẫn phải xóa token và cache riêng tư ngay cả khi request logout lỗi mạng.

## 5. Current profile

`GET /users/me`

Header:

```http
Authorization: Bearer <accessToken>
```

Profile gồm `id`, `displayName`, `avatarMediaId`, `email`, `phone`, `interestCodes`, `createdAt`, `updatedAt`.

Contract OpenAPI có khai báo thêm `PATCH /users/me`, nhưng backend hiện mới có `GET /users/me`; chức năng cập nhật profile cần triển khai riêng.

## 6. Việc cần làm khi tích hợp frontend

- [x] Tạo helper gọi Mock API với base URL theo Android Emulator/Desktop.
- [ ] Sinh hoặc lấy ổn định `installationId` cho mỗi lần cài đặt app.
- [x] Kết nối form đăng nhập với `/auth/login`.
- [x] Kết nối form đăng ký với `/auth/register`.
- [x] Tạo màn hình nhập OTP sau response `202`.
- [x] Xử lý lỗi API và resend OTP cơ bản cho mock.
- [ ] Lưu access/refresh token bằng secure storage.
- [ ] Thêm interceptor Bearer token.
- [ ] Implement single-flight refresh khi access token hết hạn.
- [x] Gửi demo ID token lên `/auth/google` của Mock API.
- [ ] Kết nối Google Sign-In thật và gửi ID token lên `/auth/google`.
- [ ] Gọi `/users/me` sau khi có session.
- [ ] Xử lý logout và xóa cache tài khoản.
- [ ] Không gọi `response.json()` với response `204`.

## Tài liệu nguồn

- `backend/README.md`
- `docs/api/openapi.json`
- `docs/api/TEAM_RULES.md`
- `docs/BACKEND_AUTH_TASKS.md`
- `docs/BACKEND_AUTH_TEST_CASES.md`
- `backend/src/main/java/com/tripmate/identity/web/AuthController.java`
- `backend/src/main/java/com/tripmate/identity/application/IdentityService.java`

## Chạy Mock API độc lập (tham khảo luồng cũ)

Mock API là server local, không dùng database. App hiện không còn gọi mock; các bước dưới đây chỉ để thử contract độc lập. Mở hai terminal từ thư mục gốc repo.

### Terminal 1: khởi động mock server

```powershell
node docs/api/mock-server.mjs
```

Server mặc định chạy tại:

```text
http://localhost:4010/api/v1
```

### Terminal 2: chạy React Native trên Android Emulator

Mở Android Studio Device Manager và start emulator trước, sau đó chạy:

```powershell
cd frontend
npm.cmd ci
npm.cmd run android
```

Frontend dùng `http://10.0.2.2:4010/api/v1` khi chạy trên Android Emulator. Không đổi sang `localhost` vì `localhost` trong emulator là chính emulator, không phải máy tính.

### Thông tin test

- Đăng nhập: dùng email hợp lệ bất kỳ và password `TripMate2026!`.
- Đăng nhập sai password: trả `401 INVALID_CREDENTIALS`.
- Đăng ký: nhập thông tin form, sau đó nhập OTP `123456`.
- OTP 6 số khác `123456`: trả `422 OTP_INVALID`.
- Sau khi verify thành công, `SessionResponse.user` lấy `displayName`, `email` và `phone` từ form đăng ký.

### Theo dõi request trong terminal

Mỗi request được in với nhãn phân biệt, sau đó là JSON format:

```text
[MOCK API] POST /api/v1/auth/login -> 200 | requestId=...
{
  "type": "mock-request",
  "method": "POST",
  "url": "/api/v1/auth/login"
}
```

Log local hiện thị đầy đủ request, bao gồm password/token mock để debug. Không dùng mock server này trong production. Khi sửa `mock-server.mjs`, dùng `Ctrl+C` và chạy lại server để nạp code mới.

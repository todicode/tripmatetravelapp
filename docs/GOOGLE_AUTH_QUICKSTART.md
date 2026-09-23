# Chạy và test Google Auth trên Android Emulator

Áp dụng cho Windows sau khi clone repo. Backend dùng JDK 26 và PostgreSQL riêng `tripmate_auth`; Android dùng JDK 17. Google, đăng nhập/đăng ký bằng email và OTP đều dùng backend thật ở port `8080`.

## 1. Chuẩn bị một lần

1. Cài Docker Desktop (chạy Linux containers), Node.js 22+, Android Studio/SDK và JDK 26 (backend) cùng JDK 17 (Android). Mở Docker Desktop và đợi Docker Engine chạy. Clone nhánh có tích hợp Google Auth; trước khi chủ repo commit/push thay đổi, `git pull` chưa nhận được các file trong tài liệu này. Mở PowerShell tại thư mục repo (trong các lệnh dưới đây, thay `C:\path\to\tripmatetravelapp` bằng đường dẫn thực tế).
2. Mở Android Studio, bật Android Emulator có **Google Play Services/Play Store**. Dùng tài khoản Google mà chủ project sẽ thêm vào OAuth **Test users**.
3. Đảm bảo `docs/database/.env.erd.local` tồn tại và có `TRIPMATE_DB_PASSWORD=<mật khẩu local>` khác rỗng. Nếu thiếu, sao chép file mẫu rồi nhập mật khẩu:

   ```powershell
   cd C:\path\to\tripmatetravelapp
   if (-not (Test-Path docs/database/.env.erd.local)) {
       Copy-Item docs/database/.env.erd.example docs/database/.env.erd.local
   }
   notepad docs/database/.env.erd.local
   ```

   Nếu file đã tồn tại, giữ nguyên mật khẩu hiện tại. Volume PostgreSQL giữ mật khẩu khi được tạo lần đầu; sửa file sau đó sẽ không đổi mật khẩu trong volume.

4. Tạo `frontend/.env.local` từ mẫu đã có Web Client ID công khai và URL emulator:

   ```powershell
   if (-not (Test-Path frontend/.env.local)) {
       Copy-Item frontend/.env.example frontend/.env.local
   }
   ```

   Nếu đã có `.env.local`, giữ file đó và đối chiếu hai dòng với `.env.example`. Client ID ở dòng đầu là loại **Web application**, cùng Google Cloud project với Android OAuth client có package `com.tripmate.app` và SHA-1 của debug keystore. Client ID không phải secret. Không cần client secret hoặc `google-services.json` cho Android flow này. Cả hai file `.env.local` và `.env.erd.local` được Git ignore; mỗi người tự tạo trên máy mình.

5. Cài dependency và chuẩn bị debug keystore riêng cho máy mới. Trong PowerShell ở thư mục repo:

   ```powershell
   cd frontend
   npm.cmd ci
   $env:ANDROID_JAVA_HOME = 'C:\path\to\your\jdk-17'
   $env:JAVA_HOME = $env:ANDROID_JAVA_HOME
   $env:Path = "$env:JAVA_HOME\bin;$env:Path"

   if (-not (Test-Path android/app/debug.keystore)) {
       & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') -genkeypair -v -storetype PKCS12 -keystore android/app/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname 'CN=Android Debug,O=Android,C=US'
   }

   cd android
   .\gradlew.bat :app:signingReport
   ```

   Tìm khối `> Task :app:signingReport` → `Variant: debug`. Dòng `Store` phải trỏ đến `frontend/android/app/debug.keystore` của chính máy đang build; sao chép dòng `SHA1` trong khối đó. Không lấy SHA-1 ở module Expo hay SHA-1 của máy người khác. Gửi **chỉ SHA-1 và email Google dùng test** cho chủ Google Cloud project. SHA-1 là fingerprint công khai; không gửi/commit file `debug.keystore`.

## 2. Chủ Google Cloud project cấu hình cho máy thứ hai

Sau khi nhận SHA-1 của bạn mình, người đang quản lý Google Cloud project thực hiện:

1. Mở [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients), chọn **đúng project** đã tạo Web OAuth Client ID trong `frontend/.env.example`.
2. Chọn **Create client** → Application type **Android**. Đặt tên dễ nhận ra máy này, ví dụ `TripMate debug - teammate`.
3. Nhập **Package name** `com.tripmate.app` và **SHA-1 certificate fingerprint** đúng giá trị bạn mình gửi, rồi chọn **Create**. Nếu màn hình hỏi xác minh quyền sở hữu app, bước đó là tùy chọn cho thử nghiệm này. [Google hướng dẫn tạo Android OAuth client bằng package và SHA-1](https://support.google.com/cloud/answer/15549257?hl=en).
4. **Giữ nguyên Android OAuth client của máy thứ nhất.** Đây là client mới cho cặp package/SHA-1 của máy thứ hai. Không tạo Google Cloud project hay Web OAuth Client ID mới; app và backend vẫn dùng chung Web Client ID trong `.env.example`. Android Client ID mới không cần nhập vào `App.tsx` hoặc `.env.local`.
5. Nếu OAuth app đang ở trạng thái **Testing**, vào **Google Auth Platform → Audience → Test users → Add users**, thêm email Google bạn mình sẽ chọn trong emulator, rồi Save. [Google hướng dẫn thêm test users](https://developers.google.com/workspace/guides/configure-oauth-consent).

Xác nhận lại với bạn mình rằng Android client đã tạo và email test đã được thêm trước khi bạn ấy bấm nút Google. Cấu hình OAuth có thể mất vài phút mới có hiệu lực; nếu vừa tạo xong mà thấy `DEVELOPER_ERROR`, đợi một lúc rồi thử lại. [Google ghi nhận thay đổi cấu hình client có thể cần thời gian để áp dụng](https://support.google.com/cloud/answer/15549257?hl=en).

## 3. Chạy backend (PowerShell thứ nhất)

```powershell
cd C:\path\to\tripmatetravelapp
.\scripts\run-backend.ps1 -JavaHome 'C:\path\to\your\jdk-26'
```

Thay đường dẫn `-JavaHome` bằng thư mục JDK 26 trên máy bạn mình (thư mục chứa `bin/java.exe`). Nếu bỏ tham số, helper thử `BACKEND_JAVA_HOME`, đường dẫn JDK 26 của máy tác giả, rồi `JAVA_HOME`; nó sẽ báo lỗi rõ nếu chọn sai phiên bản. Helper đọc mật khẩu database và Web Client ID từ các file local, khởi động PostgreSQL `tripmate_auth` tại `127.0.0.1:55432`, rồi chạy Spring Boot. **Giữ terminal này mở.** Chờ dòng `Started TripMateApplication` và `Tomcat started on port 8080`.

Không chạy `compose.erd.yml` cho backend. Database ERD ở port `5433` nạp sẵn schema nên Flyway báo `Found non-empty schema`. Helper đã dùng Compose riêng `docs/database/compose.auth.yml`, không xóa dữ liệu ERD.

Có thể kiểm tra API bằng token sai từ PowerShell khác:

```powershell
$body = @{ idToken = 'invalid'; installationId = '00000000-0000-4000-8000-000000000002' } | ConvertTo-Json
try {
    Invoke-RestMethod 'http://127.0.0.1:8080/api/v1/auth/google' -Method Post -ContentType 'application/json' -Body $body
} catch {
    $_.ErrorDetails.Message
}
```

Phản hồi mong đợi là `401 INVALID_GOOGLE_TOKEN`. Điều đó xác nhận backend đang nhận request và xác minh token.

## 4. Chạy Android (PowerShell thứ hai)

```powershell
cd C:\path\to\tripmatetravelapp\frontend
$env:ANDROID_JAVA_HOME = 'C:\path\to\your\jdk-17'
npm.cmd run android
```

`npm.cmd ci` đã chạy ở bước chuẩn bị; chỉ cần chạy lại khi dependency thay đổi. Đường dẫn JDK 17 của máy tác giả chỉ là fallback; máy khác nên đặt `ANDROID_JAVA_HOME` như trên. `npm.cmd run android` build/cài development APK có native Google Sign-In và mở Metro. Không dùng Expo Go hoặc chỉ bấm `a` sau `npm start` để cài native module lần đầu. Giữ terminal này mở. Sau lần build đầu, nếu chỉ đổi JavaScript/TypeScript, có thể dùng `npm.cmd start` rồi mở TripMate đã cài trong emulator.

## 5. Test trên emulator

1. Trên emulator, xác nhận đã đăng nhập đúng tài khoản Google nằm trong Test users. Trong màn hình Đăng nhập TripMate, bấm **Tiếp tục với Google** và chọn tài khoản đó. Lần đầu backend tạo tài khoản, trả TripMate session và app hiện `Đăng nhập thành công` cùng email được cấp phiên.
2. Bấm OK: hiện app vẫn ở màn hình đăng nhập vì chưa lưu session hoặc điều hướng vào màn hình chính. Đây là hành vi hiện tại, không phải dấu hiệu backend đăng nhập thất bại.
3. Bấm lại bằng cùng Google account: backend đăng nhập vào tài khoản đã tạo.
4. Chuyển sang Đăng ký, bấm **Đăng ký với Google**: nút này dùng cùng endpoint `/auth/google` và cũng đăng nhập được tài khoản Google đó.
5. Nếu email từng được đăng ký bằng mật khẩu nhưng chưa liên kết Google, backend hiện trả `409 AUTH_METHOD_CONFLICT`. Đây là chính sách hiện tại.
6. Để test email OTP, nhập một email nhận có thể kiểm tra trong màn hình Đăng ký. Mã trong email có hiệu lực 3 phút; kiểm tra cả thư rác. Nút Quay lại huỷ yêu cầu OTP; nếu đóng app đột ngột, đăng ký lại cùng email sẽ thay yêu cầu cũ. Khởi động lại backend sau khi cập nhật code để áp dụng thời hạn và mẫu email mới.

Google Auth phụ thuộc vào mạng của emulator để mở tài khoản và lấy ID token. Backend cần mạng để xác minh token với Google. Việc build thành công không tự xác nhận rằng tài khoản test và cấu hình OAuth trên Google Cloud đã đúng; chỉ thao tác chọn tài khoản trên emulator mới kiểm tra được phần đó. Terminal chạy `run-backend.ps1` hiển thị log khởi động/lỗi backend; terminal `npm.cmd run android` hiển thị log Metro. Backend hiện chưa in từng request/response Google ra terminal.

## Khi gặp lỗi

- `DEVELOPER_ERROR`: kiểm tra Android OAuth client có đúng package `com.tripmate.app`, SHA-1 debug và cùng project với Web Client ID.
- Không thấy tài khoản Google muốn chọn hoặc bị màn hình OAuth chặn: kiểm tra email đã thêm vào **Test users** và emulator có Google Play Services.
- `NETWORK_ERROR` tới `10.0.2.2:8080`: kiểm tra terminal backend còn chạy và port `8080` đang nghe.
- `401 INVALID_GOOGLE_TOKEN`: kiểm tra Web Client ID ở `frontend/.env.local` và `GOOGLE_WEB_CLIENT_ID` mà helper nạp cho backend là cùng một ID Web.
- `FATAL: password authentication failed`: mật khẩu trong `.env.erd.local` không khớp volume `tripmate_auth_local_pgdata`. Khôi phục mật khẩu cũ; nếu muốn tạo database auth mới, cần sao lưu dữ liệu trước khi xóa volume.
- `Found non-empty schema`: bạn đang chạy backend trên database ERD port `5433`; dùng `scripts/run-backend.ps1` với database auth port `55432`.
- `GOOGLE_CONFIG_MISSING`: thiếu Web Client ID trong `frontend/.env.local`, hoặc Metro chưa khởi động lại sau khi sửa file.
- `Port 8080 was already in use`: đã có backend hoặc ứng dụng khác đang chạy ở port đó; chỉ chạy một backend cùng lúc.
- `JDK 26 not found` hoặc `Backend requires JDK 26`: truyền đường dẫn thư mục JDK 26 thực tế bằng `-JavaHome`; đường dẫn phải chứa `bin/java.exe`.
- `JDK 17 not found`: đặt `ANDROID_JAVA_HOME` tới thư mục JDK 17 thực tế rồi chạy lại `npm.cmd run android`.

Không cần chạy Mock API để test màn hình auth. Nếu chưa cấu hình SMTP, backend mặc định dùng `EMAIL_MODE=log`: mã OTP ngẫu nhiên xuất hiện trong terminal backend. Để nhận OTP qua Gmail, tạo Gmail App Password rồi chạy `./scripts/setup-gmail-smtp.ps1 -Email 'your-address@gmail.com'` một lần trong PowerShell tại thư mục gốc repo. Script lưu thông tin vào `personal/gmail-smtp.env` được Git ignore; các lần chạy `./scripts/run-backend.ps1` sau sẽ tự bật Gmail SMTP. Không gửi App Password qua chat hay commit file local. Khi muốn đổi App Password, chạy lại lệnh setup với `-Replace`. Sau đó đăng ký bằng một địa chỉ email có thể nhận thư trên emulator; mã không cố định là `123456`.

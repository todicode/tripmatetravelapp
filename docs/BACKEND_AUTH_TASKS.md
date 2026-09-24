# Checklist backend xác thực TripMate

Cập nhật lần đầu: 2026-09-21  
Phạm vi: backend cho hai màn hình đăng nhập và đăng ký trong `frontend/App.tsx`.

## Cách theo dõi

- Đánh dấu `[x]` chỉ khi task đã hoàn thành và có kiểm tra phù hợp.
- Sau mỗi task, cập nhật file này trên cùng commit với thay đổi code hoặc tài liệu liên quan.
- Không sửa frontend để gọi API trong phạm vi checklist này.
- Contract trong `docs/api/openapi.json`, quy tắc tại `docs/api/TEAM_RULES.md`, kiến trúc tại `docs/CODING_STANDARDS.md` và schema tại `docs/database/tripmate_v1.sql` là nguồn chuẩn.

## 1. Những việc đã phân tích và đã chốt

- [x] A01. Đọc màn hình đăng nhập: email, mật khẩu, đăng nhập, Google, quên mật khẩu, chuyển sang đăng ký.
- [x] A02. Đọc màn hình đăng ký: tên, email, số điện thoại, mật khẩu, xác nhận mật khẩu, Google, điều khoản, chuyển sang đăng nhập.
- [x] A03. Đối chiếu API hiện có: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/users/me`.
- [x] A04. Đối chiếu schema tài khoản: `app_users`, `user_devices`, `refresh_tokens`, `user_interests`.
- [x] A05. Chốt đăng ký thủ công phải xác minh email bằng OTP trước khi cấp phiên đăng nhập.
- [x] A06. Chốt backend chỉ triển khai API, không tích hợp lời gọi API vào frontend trong đợt này.
- [x] A07. Chốt mọi phiên Google sau khi xác minh thành công vẫn dùng access token/refresh token của TripMate.

## 2. Các quyết định cần xác nhận trước khi code

- [x] D01. Xác nhận yêu cầu nghiệp vụ: đăng ký thủ công phải qua OTP email trước khi cấp phiên.
- [x] D02. Xác nhận số điện thoại: lưu trong hồ sơ và bắt buộc theo form hiện tại; contract/database v1 sẽ được cập nhật thêm trường này.
- [x] D03. Chọn Resend qua SMTP cho production; backend bọc qua `EmailSender`, local dùng fake sender hoặc Mailpit.
- [x] D04. Dùng Google Cloud OAuth client ID dành cho backend để kiểm tra audience; mobile đăng ký Android package `com.tripmate.app` và các SHA-1 tương ứng.
- [x] D05. Không tự liên kết Google với tài khoản thủ công chỉ dựa vào email; v1 trả lỗi xung đột và để luồng liên kết xác thực rõ ràng cho phase sau.
- [x] D06. Lưu đăng ký chưa xác minh trong bảng challenge riêng; chỉ tạo `app_users` sau khi OTP đúng.
- [x] D07. Backend nhận Google ID token trực tiếp từ mobile qua HTTPS và tự kiểm tra chữ ký, audience, issuer, expiry và subject.

## 3. Cập nhật API contract trước implementation

- [x] C01. Thiết kế request/response/error cho bắt đầu đăng ký và gửi OTP; dự kiến `POST /api/v1/auth/register` trả `202` cùng `verificationId`, thời hạn và thời điểm được gửi lại.
- [x] C02. Thiết kế API xác minh; dự kiến `POST /api/v1/auth/register/verify` nhận `verificationId` và mã OTP, trả `201 SessionResponse`.
- [x] C03. Thiết kế API gửi lại OTP; dự kiến `POST /api/v1/auth/register/resend` với giới hạn thời gian và số lần gửi.
- [x] C04. Thiết kế API Google; dự kiến `POST /api/v1/auth/google` nhận Google `idToken` và `installationId`, dùng chung cho đăng ký lần đầu và đăng nhập lần sau.
- [x] C05. Chốt mã lỗi: OTP sai, OTP hết hạn, vượt số lần thử, challenge đã dùng, email đã tồn tại, Google token sai/hết hạn và tài khoản bị khóa.
- [x] C06. Cập nhật `openapi.json`, examples, `TEAM_RULES.md`, `CHANGELOG.md`, mock và schema validator trong cùng thay đổi contract.

## 4. Dựng nền tảng Spring Boot

- [x] B01. Tạo project Spring Boot/Maven trong `backend/`, thêm Maven Wrapper và `.gitignore`.
- [x] B02. Chốt và khóa phiên bản JDK, Spring Boot, Maven plugin và dependency theo `TECHNOLOGY_DECISIONS.md`.
- [x] B03. Tạo cấu trúc Modular Monolith cho module `identity`: `api`, `web`, `application`, `domain`, `infrastructure`.
- [x] B04. Cấu hình profile local/test/prod, PostgreSQL, Flyway, JWT signing key, thời hạn token và biến môi trường email/Google.
- [x] B05. Thêm request ID, `X-Request-Id`, response envelope `{data, requestId}` và error envelope theo contract.
- [x] B06. Thêm validation từ chối field lạ, kiểm tra content type và chuẩn hóa lỗi validation/security qua một lớp web chung.

## 5. Migration và persistence

- [x] P01. Chuyển phần schema tài khoản cần dùng thành Flyway migration có thứ tự; không chạy trực tiếp file SQL tham chiếu lên database có dữ liệu.
- [x] P02. Tạo persistence cho OTP challenge: mã băm, mục đích, email, dữ liệu đăng ký tạm, thời hạn, số lần thử, thời điểm gửi lại và trạng thái đã dùng.
- [x] P03. Tạo persistence cho liên kết OAuth: provider, Google subject, user ID và unique constraint `(provider, subject)`.
- [x] P04. Bổ sung trường số điện thoại hoặc loại bỏ trường này theo quyết định D02; cập nhật migration và data dictionary.
- [x] P05. Bổ sung index/constraint chống trùng challenge đang hoạt động, Google identity trùng và device binding sai.
- [x] P06. Chạy migration trên PostgreSQL rỗng với `ddl-auto=validate`; kiểm tra rollback/cleanup dữ liệu test.

## 6. Thành phần xác thực dùng chung

- [x] I01. Cài password encoder phù hợp; tuyệt đối không dùng SHA-256 thuần cho mật khẩu.
- [x] I02. Tạo access token có thời hạn và refresh token ngẫu nhiên; database chỉ lưu hash refresh token.
- [x] I03. Triển khai refresh token rotation trong transaction, khóa hàng token, phát hiện reuse và thu hồi cả family.
- [x] I04. Triển khai device binding theo `installationId`; logout phải tăng `bindingVersion`, xóa FCM token và bỏ liên kết tài khoản.
- [x] I05. Tạo Spring Security filter chain cho access token, tài khoản bị khóa và phiên đã bị thu hồi.
- [ ] I06. Không log password, access token, refresh token, OTP, Google ID token hoặc dữ liệu riêng tư.

## 7. Đăng ký thủ công bằng email OTP

- [x] O01. Validate email, tên, mật khẩu, số điện thoại (nếu D02 yêu cầu) và reject request field lạ.
- [x] O02. Hash mật khẩu trước khi lưu challenge; không lưu OTP dạng rõ.
- [x] O03. Sinh OTP bằng nguồn ngẫu nhiên bảo mật, gửi email qua `EmailSender`, trả challenge metadata không chứa mã.
- [x] O04. Giới hạn tần suất gửi lại, số lần nhập sai, thời hạn OTP và số challenge đang hoạt động.
- [x] O05. Xác minh OTP trong transaction có khóa challenge; mã đúng chỉ được dùng một lần.
- [x] O06. Khi xác minh thành công, tạo user/device/refresh token nguyên tử và trả `SessionResponse`.
- [x] O07. Khi OTP sai/hết hạn/đã dùng, trả đúng status và error code; không lộ password hoặc thông tin nhạy cảm.
- [x] O08. Thêm job dọn challenge hết hạn và dữ liệu đăng ký tạm.
- [x] O09. Chặn login với tài khoản chưa xác minh nếu thiết kế D01 tạo user trước khi xác minh.

## 8. Đăng nhập và vòng đời phiên

- [x] S01. Triển khai email/password login với email lowercase và kiểm tra trạng thái tài khoản.
- [x] S02. Triển khai `POST /auth/refresh` đúng single-use rotation và không retry mù khi trạng thái commit không rõ.
- [x] S03. Triển khai `POST /auth/logout` trả `204`, thu hồi phiên trên device hiện tại và dọn binding.
- [x] S04. Triển khai `GET /users/me`, không trả password hash, token hoặc trường nội bộ.
- [x] S05. Thêm rate limit cho register/login/refresh/OTP và trả `429` cùng `Retry-After`.
- [x] S06. Kiểm tra mọi response riêng tư có `Cache-Control: private, no-store` khi contract yêu cầu.

## 9. Đăng ký/đăng nhập Google

- [x] G01. Tạo adapter xác minh Google ID token bằng thư viện chính thức; kiểm tra chữ ký, `aud`, `iss`, `exp` và `sub`.
- [x] G02. Chỉ nhận ID token gửi qua HTTPS; không nhận Google user ID hoặc email do client tự nhập làm bằng chứng.
- [x] G03. Với Google subject mới, tạo account/identity/device/session trong một transaction.
- [x] G04. Với Google subject đã có, đăng nhập và cấp session TripMate.
- [x] G05. Xử lý email trùng tài khoản thủ công theo D05; không tự liên kết ngoài quy trình an toàn.
- [x] G06. Không gửi OTP TripMate cho identity Google đã được Google xác minh hợp lệ; ghi rõ quy tắc trong contract.
- [x] G07. Xử lý token sai, hết hạn, sai audience, sai issuer, tài khoản bị khóa và Google provider tạm lỗi.
- [x] G08. Viết tài liệu cấu hình Google Cloud, client ID, secret backend và môi trường local/test; không commit secret.

## 10. Kiểm thử và kiểm tra contract

- [x] T01. Unit test validation, password policy, OTP hash/expiry/attempt limit và mã lỗi.
- [ ] T02. Unit test Google token verifier bằng token hợp lệ, sai chữ ký, sai audience, hết hạn và sai issuer.
- [ ] T03. Integration test PostgreSQL cho đăng ký OTP, login, refresh rotation, reuse và logout.
- [ ] T04. Integration test hai request đăng ký cùng email; chỉ một request được tạo dữ liệu hợp lệ.
- [ ] T05. Integration test hai request xác minh cùng OTP; chỉ một request thành công.
- [ ] T06. Test quyền và phiên: token cũ sau logout, tài khoản disabled, đổi tài khoản trên cùng installation.
- [x] T07. Chạy validator OpenAPI và mock smoke test sau khi cập nhật contract.
- [x] T08. Chạy build/test backend, ghi lệnh và kết quả thực tế; không ghi nhận test chưa chạy.

## 11. Bàn giao cho frontend

- [x] H01. Viết tài liệu luồng đăng ký OTP gồm các trạng thái loading, success, expired, invalid và resend.
- [x] H02. Viết tài liệu luồng Google gồm request `idToken`, `installationId`, response session và các lỗi có thể hiển thị.
- [x] H03. Cung cấp examples/curl hoặc file `.http` cho register, verify, resend, login, Google, refresh, logout và `/users/me`.
- [x] H04. Cung cấp hướng dẫn base URL Android Emulator/thiết bị thật và biến môi trường cần thiết.
- [ ] H05. Chạy nghiệm thu backend độc lập theo luồng `register → verify OTP → me → refresh → logout` và `Google → me → logout`.
- [x] H06. Ghi rõ task nào chưa làm, provider nào đang giả lập và giới hạn còn lại trong README backend.

## Tiêu chí hoàn thành đợt xác thực

- [ ] Contract, migration, implementation và test khớp cùng một phiên bản.
- [ ] Đăng ký thủ công chỉ cấp phiên sau khi OTP đúng và còn hạn.
- [ ] Google ID token được backend tự xác minh; client không thể giả mạo `userId`, email hoặc Google subject.
- [ ] Refresh token rotation, logout, device binding và lỗi bảo mật đã có test.
- [ ] Backend chạy được từ database rỗng và có tài liệu đủ để frontend tích hợp mà không sửa wire format.

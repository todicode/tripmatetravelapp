# Kế hoạch triển khai hồ sơ cá nhân sau đăng nhập

Cập nhật: 2026-10-01. Trạng thái: **HS-01 đến HS-06 đã triển khai và kiểm thử tự động; còn nghiệm thu UI native thủ công**.

**Cập nhật tiếp nối:** avatar đã được triển khai theo [AVATAR_IMPLEMENTATION_PLAN.md](AVATAR_IMPLEMENTATION_PLAN.md). Các mô tả avatar chưa hỗ trợ/422 bên dưới là lịch sử của slice sửa tên; hiện PATCH nhận `avatarMediaId` hợp lệ hoặc null. Interests vẫn chưa hỗ trợ. Xem kế hoạch avatar để tiếp tục cấu hình R2 và nghiệm thu thiết bị.

## 1. Đọc trước khi tiếp tục session mới

Người dùng đã chọn làm **tên hiển thị trước, avatar sau**. Luồng là **Cá nhân → Chỉnh sửa hồ sơ → Sửa tên → Lưu → Hiển thị tên mới**. Người dùng đã yêu cầu triển khai, chia task/commit và tự chuyển task sau kiểm thử. Không triển khai lại các task đã xong; xem bảng handoff và phần nghiệm thu còn lại.

Đọc tài liệu này cùng [Coding standards](../CODING_STANDARDS.md), [Roadmap tổng](IMPLEMENTATION_ROADMAP.md), [Team rules](TEAM_RULES.md) và [OpenAPI](openapi.json). Kiểm tra `git status`, `git log` và code thực tế trước khi bắt đầu; các đường dẫn dưới đây là mốc khảo sát, không thay thế việc đọc code.

Mốc auth đã hoàn tất và push trong session trước: `4167defa44f1b5822064d603443d193f91fb3045` — `feat(auth): complete session persistence and password validation`. Kết quả được ghi nhận khi đó: 17 frontend auth tests, 49 backend tests, TypeScript, OpenAPI validator và Android debug build đều pass. Đây không phải kết quả kiểm thử cho tính năng hồ sơ.

## 2. Phạm vi đã chốt

- Lưu tên hiển thị vào backend; tên mới được dùng ở các màn hình liên quan, còn sau khi mở lại app/đăng nhập lại và đọc được trên thiết bị khác khi tải lại hồ sơ.
- Email chỉ đọc. Giữ bố cục frontend của teammate; khu vực avatar thể hiện rõ chưa hỗ trợ chỉnh sửa.
- Chưa làm upload/crop/xóa avatar, interests, số điện thoại, đổi email hoặc onboarding bắt buộc.
- Không cần xin thêm bản thiết kế cho slice sửa tên. Khi làm avatar, mới cần chốt UI chọn/crop/xóa ảnh nếu template chưa đủ.
- Không mở rộng sang tạo chuyến đi trong đợt này. Sau khi nghiệm thu hồ sơ, đề xuất catalog và tạo chuyến đi thủ công thành kế hoạch riêng.

## 3. Hiện trạng cần nối

| Thành phần | Hiện trạng tại thời điểm lập kế hoạch |
| --- | --- |
| `frontend/src/ProfileScreen.tsx` | Hiển thị `user.displayName` từ session; mở màn chỉnh sửa |
| `frontend/src/EditProfileScreen.tsx` | Có layout; input tên/email chưa cho sửa; nút lưu và avatar báo chưa hỗ trợ |
| `template_gui/src/screens/EditProfileScreen.jsx` | Giao diện tham khảo; không sao chép hành vi chỉ lưu local hoặc cho sửa email |
| `frontend/App.tsx`, `frontend/src/ExploreHome.tsx` | Truyền user từ session xuống các màn hình |
| `frontend/src/auth/api.ts` | Transport hiện suy ra GET/POST theo body; cần hỗ trợ PATCH rõ ràng |
| `frontend/src/auth/session.ts` | Quản lý session, refresh single-flight, chống response cũ sau logout/đổi tài khoản |
| `frontend/src/auth/useSessionViewModel.ts` | Khôi phục session, đăng nhập/đăng xuất/đổi mật khẩu |
| `backend/src/main/java/com/tripmate/identity/web/UserController.java` | Đã có GET `/api/v1/users/me`; chưa có PATCH implementation |
| `IdentityService`, `UserEntity`, `AuthResponses.ProfileResponse` trong module identity | Có đọc hồ sơ và cột `display_name`; cần bổ sung cập nhật tên |
| OpenAPI `ProfileUpdate` | Đã mô tả `displayName`, `interestCodes`, `avatarMediaId`; contract rộng hơn slice này |

Cột tên đã có nên không dự kiến migration. Không sửa V1/V2 hoặc xóa dữ liệu identity để chạy tính năng.

## 4. Quy tắc hành vi và kỹ thuật

### API và validation

- Dùng GET/PATCH `/api/v1/users/me`; actor lấy từ JWT, không nhận userId để quyết định người bị sửa.
- PATCH slice này nhận `displayName`, trim khoảng trắng đầu/cuối, yêu cầu không rỗng và tối đa 100 ký tự sau chuẩn hóa. Giữ chữ hoa/thường và dấu tiếng Việt; frontend/backend dùng quy tắc nhất quán.
- Thành công trả 200 với hồ sơ đầy đủ theo envelope contract `{data, requestId}`. Không thu hồi token chỉ vì đổi tên.
- Bảo toàn các field khác. `interestCodes` và `avatarMediaId` chưa hỗ trợ phải bị từ chối rõ ràng bằng lỗi validation 422, không im lặng bỏ qua; kể cả khi gửi cùng tên hợp lệ, không cập nhật một phần rồi trả lỗi.
- Giữ schema dự kiến cho các field tương lai; ghi rõ mức hỗ trợ hiện tại trong tài liệu contract. Đối chiếu TEAM_RULES cho malformed JSON, unknown fields, body rỗng/null và mã lỗi; không tự phát minh error code.

### Frontend MVVM và dữ liệu dùng chung

- View chỉ render/style/accessibility, phát sự kiện; ViewModel giữ form, validation và workflow; Model/API adapter giao tiếp backend.
- Bổ sung method PATCH vào transport và SessionManager theo cách giữ tương thích các caller GET/POST hiện có.
- Có profile type đầy đủ và profile API adapter dùng transport xác thực chung.
- Dữ liệu hồ sơ dùng chung theo user ID, tách việc đổi tên khỏi tạo/nhận auth session. Không gọi `accept()` lại chỉ để đổi tên vì có thể reset generation hoặc lựa chọn ghi nhớ đăng nhập.
- GET cũ, PATCH cũ và refresh token hoàn thành muộn không được ghi đè tên mới hoặc đưa dữ liệu tài khoản trước sang tài khoản sau. Chốt cách kiểm soát thứ tự request/generation và nguồn dữ liệu hồ sơ khi đọc implementation.
- Dọn dữ liệu riêng khi logout/đổi tài khoản. Tên từ refresh response không được vô tình ghi đè hồ sơ mới hơn.
- Không tự retry PATCH khi lỗi mạng/timeout; chỉ sử dụng retry xác thực tối đa một lần sau 401 theo cơ chế hiện có.

### Trải nghiệm màn hình

- Màn Cá nhân tải GET hồ sơ khi vào, có loading, lỗi và thử lại; dùng nguồn tên chung cho các màn hình.
- Màn sửa tên điền tên hiện tại. Disable lưu nếu tên không hợp lệ, không đổi sau trim hoặc đang lưu.
- Chặn gửi lặp và chặn điều hướng back khi đang lưu. Khi có thay đổi chưa lưu, yêu cầu xác nhận bỏ thay đổi qua View; ViewModel không gọi native Alert trực tiếp.
- Lỗi server/mạng giữ draft và hiển thị thông báo phù hợp. Chỉ sau response thành công mới cập nhật profile chung, thông báo thành công và quay lại.
- Email chỉ đọc; avatar chưa khả dụng phải rõ ràng, không báo lưu ảnh thành công giả.

## 5. Các task triển khai tuần tự

Mỗi task một commit theo Conventional Commits, cập nhật tiến độ và bằng chứng kiểm thử trước khi chuyển task. Không gộp tất cả thành một commit. Không cần tự ghi hash của commit vào chính nó; điền hash ở lần cập nhật tiếp theo.

| Task | Nội dung | Điều kiện hoàn tất | Trạng thái |
| --- | --- | --- | --- |
| HS-01 | Đối chiếu `ProfileUpdate`, operation và quy tắc lỗi; tài liệu hóa slice chỉ sửa tên, liên kết kế hoạch với roadmap | Phạm vi hỗ trợ và input bị từ chối rõ ràng, contract validator pass nếu đổi contract | Hoàn tất; không đổi schema OpenAPI |
| HS-02 | DTO/controller/service cập nhật tên trong module identity; validation và transaction | PATCH lưu đúng actor, GET đọc lại được, lỗi không gây cập nhật một phần; backend tests pass | Hoàn tất; backend suite pass, HTTP/validation/service tests |
| HS-03 | Transport PATCH, profile type/API adapter, state hồ sơ dùng chung theo tài khoản | GET/POST/auth không hồi quy; chặn response cũ và refresh ghi đè tên mới | Hoàn tất; 22 frontend tests và TypeScript pass |
| HS-04 | `useProfileViewModel`, nối GET vào màn Cá nhân và nguồn tên dùng chung | Loading/error/retry hoạt động; logout/đổi account không lẫn dữ liệu | Hoàn tất code; TypeScript và 22 tests pass; UI native chờ HS-06 |
| HS-05 | `useEditProfileViewModel`, nối màn sửa tên vào PATCH, bảo toàn UI teammate | Validation, submitting, giữ draft, back confirmation, thông báo thành công đúng thực tế | Hoàn tất code; 25 tests và TypeScript pass |
| HS-06 | Kiểm thử tích hợp/hồi quy, checklist API và UI, cập nhật bàn giao | Ghi rõ các test đã chạy và phần manual/native chưa chạy; đủ bằng chứng lưu server | Hoàn tất kiểm thử tự động và tài liệu; UI native manual chưa chạy |

Gợi ý tiêu đề commit: `docs(profile): add name update contract notes`, `feat(identity): add profile name updates`, `feat(profile): add authenticated profile state`, `feat(profile): load current user profile`, `feat(profile): add display name editing`, `test(profile): verify profile update flow`.

## 6. Checklist kiểm thử

### API/backend

- [ ] Tên tiếng Việt hợp lệ, trim đầu/cuối, biên 100 ký tự.
- [ ] Tên trống/toàn khoảng trắng, quá 100 ký tự, sai kiểu/null/body không hợp lệ được xử lý theo contract.
- [ ] Unsupported fields và field lạ bị từ chối đúng quy tắc, không cập nhật một phần.
- [ ] Thiếu token/token không hợp lệ; quyền và device binding theo auth hiện có.
- [ ] Tài khoản A sửa tên không ảnh hưởng B; actor không thể bị thay bằng payload.
- [ ] GET sau PATCH trả tên mới; email/avatar/các field khác được bảo toàn.

### Frontend và concurrency

- [ ] Method PATCH, body/envelope/error được adapter xử lý đúng; GET/POST hiện có không thay hành vi.
- [ ] Nút lưu disabled đúng, double tap không tạo hai thao tác đồng thời.
- [ ] Lỗi mạng/timeout/5xx giữ draft; không thông báo thành công và không tự retry mutation.
- [ ] Access token hết hạn refresh đúng; lỗi xác thực cuối cùng không làm rò dữ liệu.
- [ ] Back khi dirty có xác nhận; khi đang lưu không thoát/submit lại.
- [ ] GET đến muộn sau PATCH và refresh đồng thời không đưa tên cũ trở lại.
- [ ] Logout/đổi tài khoản khi request đang chạy không áp kết quả cho tài khoản mới.
- [ ] Giữ nguyên lựa chọn nhớ đăng nhập sau đổi tên.

### Kiểm thử giao diện thật và lưu trữ

- [ ] Đăng nhập → Cá nhân → sửa tên → lưu → tên mới trên các màn hình liên quan.
- [ ] Đóng/mở app, đăng xuất/đăng nhập lại vẫn đọc tên đã lưu.
- [ ] Thiết bị/installation khác tải lại hồ sơ thấy tên mới; không yêu cầu realtime tự đồng bộ.
- [ ] Email chỉ đọc; avatar thể hiện chưa hỗ trợ; layout không lệch so với template.
- [ ] Chạy backend tests, frontend auth/profile tests, TypeScript và OpenAPI validator.
- [ ] Chạy Android build nếu thay đổi cần xác minh; chỉ đánh dấu UI emulator/device pass khi đã thao tác thực tế.

Các lệnh kiểm thử hiện có (đối chiếu script/dependency trước khi chạy):

```powershell
# Trong backend/
.\mvnw.cmd test -q

# Trong frontend/
npm run test:auth
node node_modules/typescript/bin/tsc --noEmit

# Trong root, với dependency từ docs/api/requirements.txt đã có
python docs/api/validate_contract.py
```

Bổ sung test profile vào cơ chế test phù hợp sau khi đọc `frontend/scripts/check-auth.cjs` và backend test setup. Không coi mock service là bằng chứng DB đã lưu; cần kiểm tra đọc lại từ server thật hoặc integration test phù hợp. Không dùng dữ liệu người dùng thật làm fixture phá hủy.

## 7. Handoff và bảo toàn workspace

Đã triển khai backend và frontend. Độ dài tính theo Unicode code point, không phải UTF-16 code unit. Field lạ trả 422 theo TEAM_RULES. Điểm tiếp tục là nghiệm thu thủ công UI ở mục 8; không bắt đầu lại HS-01. Avatar/interests và chuyến đi vẫn ngoài scope đợt này.

`git status` ngày 2026-10-01 có các thay đổi cũ không thuộc feature này:

- `frontend/android/app/src/main/AndroidManifest.xml` đang modified.
- Các file untracked: `android-signing-report.txt`, `hs_err_pid28468.log`, `replay_pid28468.log`, `outputs/`, root `package-lock.json`, `frontend/android-build-diagnostic.log`, `frontend/android-build-diagnostic.err.log`.

Không tự xóa, ghi đè hoặc stage các file trên vào commit hồ sơ. Kiểm tra lại status vì người dùng/teammate có thể đã sửa thêm. Người dùng đã yêu cầu triển khai và tự chuyển task sau khi kiểm thử, chia commit theo kế hoạch; chưa yêu cầu push đợt này.

Sau mỗi task, cập nhật bảng dưới để session sau tiếp tục từ đúng chỗ:

| Task | Commit | File/hành vi đã đổi | Test đã chạy và kết quả | Còn thiếu/blocker | Task tiếp theo |
| --- | --- | --- | --- | --- | --- |
| HS-01 | `8f160d6` | Kế hoạch và mức hỗ trợ trong roadmap | Đối chiếu contract/TEAM_RULES; không đổi schema | Không | HS-02 |
| HS-02 | `a17e92b` | PATCH, validation payload, transaction và tests | Maven suite pass; PostgreSQL được xác minh tại HS-06 | Không | HS-03 |
| HS-03 | `e7b1584` | PATCH transport, adapter kiểm tra account, store độc lập refresh | 22 auth/profile tests và TypeScript pass | Không | HS-04 |
| HS-04 | `510b503` | Provider theo account, GET/loading/error/retry, tên dùng chung | 22 frontend tests và TypeScript pass | Native UI chưa thao tác | HS-05 |
| HS-05 | `2e301df` | Form ViewModel, PATCH, giữ draft, confirmation/back, avatar chưa hỗ trợ | 25 frontend tests và TypeScript pass | Native UI chưa thao tác | HS-06 |
| HS-06 | Commit `test(profile): verify profile update flow` | Test HTTP/JWT/PostgreSQL, refresh/account races, script test:profile, bàn giao | 57 backend tests; auth/profile tests, TypeScript, OpenAPI, Android debug, Metro export pass | Nghiệm thu native UI thủ công | Mục 8 |

Câu mở đầu có thể dùng ở session mới: “Đọc `docs/api/PROFILE_IMPLEMENTATION_PLAN.md`, kiểm tra trạng thái repo và tiếp tục task chưa hoàn tất đầu tiên; giữ MVVM và chia commit theo task.”

## 8. Kết quả bàn giao và cách kiểm thử lại

Ngày 2026-10-01:

- Backend: **57 tests, 0 failures, 0 errors, 0 skipped**, gồm 2 integration tests dùng HTTP server thật, JWT và PostgreSQL 17 riêng. Xác minh PATCH → đọc DB/GET → refresh → login lại; installation thứ hai thấy tên mới; account khác giữ nguyên; validation không ghi một phần; không token/token sai bị từ chối; lưu được 100 Unicode code point.
- Frontend: **29 tests pass** (18 auth/transport và 11 profile/form), kiểm tra PATCH trên transport, retry sau refresh, remember-me, response cũ, account switch, dirty/back, duplicate submit và giữ draft khi lỗi. Chạy `node --test scripts/check-auth.cjs scripts/check-profile.cjs` hoặc `npm run test:auth` và `npm run test:profile`.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` pass.
- OpenAPI: 73 operations, 138 schemas, 1745 examples/parameters và 6 negative checks pass; không đổi schema.
- Android debug `app:assembleDebug` x86_64 pass; Metro `expo export --platform android` pass, 765 modules. Các artifact kiểm tra nằm trong build directory/thư mục tạm, không commit.
- **Chưa thao tác UI native trên emulator/device**: chưa xác nhận bàn phím, layout thực tế, dialog Android Back, đóng/mở app và chuyển tài khoản trên thiết bị. Build/bundle và unit tests không thay thế các kiểm tra này. Checklist mục 6 giữ nguyên để phục vụ nghiệm thu đầy đủ.

### Chạy integration test trên DB tạm riêng

Không trỏ integration test vào DB người dùng. Lệnh dưới tạo container tự xóa khi dừng, cổng chỉ bind localhost; cần Docker chạy và JDK 26. Chờ `pg_isready` báo accepting connections trước khi chạy Maven.

```powershell
# Tại root; không dùng lại tên container nếu đã có container khác cùng tên.
docker run --rm -d --name tripmate-profile-check -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=tripmate_profile_test -p 127.0.0.1:55439:5432 postgres:17
docker exec tripmate-profile-check pg_isready -U postgres -d tripmate_profile_test

# Trong backend/
$env:PROFILE_TEST_DATABASE_URL = 'jdbc:postgresql://127.0.0.1:55439/tripmate_profile_test'
.\mvnw.cmd test -q '-DargLine=-Duser.timezone=UTC'
Remove-Item Env:PROFILE_TEST_DATABASE_URL

# Dừng đúng container tạm vừa tạo khi xong
docker stop tripmate-profile-check
```

Không có biến `PROFILE_TEST_DATABASE_URL`, suite integration sẽ skip; unit/HTTP standalone tests vẫn chạy. Dùng UTC cho JVM test vì PostgreSQL image hiện tại không nhận alias `Asia/Saigon` của JVM Windows. Test tạo account ngẫu nhiên trong DB tạm, không gửi email và không dùng credential thật.

### Nghiệm thu trên app và API

1. Khởi động backend bằng quy trình hiện có trong `scripts/run-backend.ps1`, frontend bằng `npm run android` trong `frontend/`; kiểm tra base URL của app trỏ đúng backend.
2. Đăng nhập → Cá nhân → Chỉnh sửa hồ sơ. Nhập `  Nguyễn Bình  `, lưu; tên hiển thị là `Nguyễn Bình`. Email chỉ đọc, avatar ghi rõ chưa hỗ trợ.
3. Thử tên trống, hơn 100 ký tự, double tap, back khi có draft và khi đang lưu. Tắt kết nối hoặc dừng backend: draft còn nguyên, không báo thành công.
4. Đóng/mở app, đăng nhập lại, đổi account rồi quay lại. Kiểm tra cả lựa chọn nhớ đăng nhập bật/tắt; không lẫn tên giữa accounts. Thiết bị/installation khác vào Cá nhân để tải lại tên.
5. Trong Postman: lấy access token qua login; GET `/api/v1/users/me`, PATCH cùng URL với Bearer token và JSON `{ "displayName": "Nguyễn Bình" }`, sau đó GET lại. Mong đợi 200, envelope `{data, requestId}`; field khác giữ nguyên.
6. PATCH tên trống, quá dài, field `userId`, `interestCodes`, hoặc `avatarMediaId: null` phải trả 422 và không cập nhật tên; JSON sai cú pháp trả 400; thiếu token trả 401.

Sau khi nghiệm thu native UI, đánh dấu các checklist tương ứng. Chỉ bắt đầu kế hoạch catalog/tạo chuyến đi thủ công khi người dùng yêu cầu luồng tiếp theo.

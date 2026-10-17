# Frontend MVVM và kiểm chứng backend

Nhánh: `refactor/backend-quality`. Backend đã push ở `b2d1969` và `844dab8`. Frontend tiếp tục trên cùng nhánh; chưa merge vào dev/main.

Giữ giao diện, API contract, migrations và transport realtime. Luồng chuẩn: `View → ViewModel → Model/API adapter → Backend`. Không thêm runtime framework; không thay đổi Android manifest của người dùng.

| Task | Phạm vi | Trạng thái |
| --- | --- | --- |
| FE-01 | Khảo sát và baseline | Hoàn thành: typecheck đạt, 107/108 test baseline đạt; map syntax check cũ tham chiếu màn đã bỏ |
| FE-02 | Auth MVVM và HTTP boundary | Hoàn thành: App chỉ ghép providers; tách các View, ViewModel, API/native adapters; chặn submit lặp và response sau unmount |
| FE-03 | Trip draft, version và retry | Hoàn thành: dùng ID/version đã ACK khi GET tiếp theo lỗi; chia sẻ workflow lập lịch qua ViewModel; hydrate từ metadata trang khi version khớp |
| FE-04 | Khởi tạo form hồ sơ | Hoàn thành: lấy baseline tên/avatar hiện tại sau tải async, giữ tên người dùng đang nhập |
| FE-05 | Format, CI và Android | Hoàn thành kiểm chứng local; frontend CI được thêm và backend CI bật cho nhánh refactor. Hosted CI backend/frontend đều đạt trên code commit 32d4c45 |

## Những thay đổi có giá trị

- Auth: tách markup/style khỏi workflow login, đăng ký, reset password, hoàn thiện số điện thoại và phiên. Các callback thông báo/điều hướng được truyền từ View. Việc truy cập Google Sign-In, installation ID và HTTP nằm trong adapter. Các form có khóa submit bằng ref, không phụ thuộc lần render tiếp theo. Challenge đăng ký trả về sau unmount được hủy best effort.
- Timer OTP chỉ chạy khi đang có cooldown, tự dừng khi hết hạn và dọn khi unmount. Timer cũ cập nhật mỗi giây kể cả khi không còn đếm ngược.
- HTTP: kiểm tra kiểu code/message của payload lỗi và chuẩn hóa retry delay; HTML/malformed response giữ HTTP status và có thông báo dự phòng. Không thêm retry mutation tự động.
- Chuyến đi: ghi nhận metadata đã được server xác nhận, ánh xạ ngay UUID/version của lịch đã lưu, giữ baseline độc lập với lần GET sau mutation. Nếu GET lỗi, lần sửa tiếp theo dùng ID/version đã ACK; nếu 409, giữ nguyên draft. Metadata form và nút trạng thái dùng draft hiện tại.
- `useTripPlanViewModel` dùng chung thao tác tên, thêm/xóa điểm, chuyển ngày, sắp xếp, tiến độ và kiểm tra tọa độ cho màn thủ công/tổng quan. View chuyển sự kiện, không trực tiếp biến đổi lịch.
- Danh sách chuyến dùng metadata từ trang để chỉ tải lịch khi version khớp; nếu không khớp thì đọc lại cả hai tài nguyên. Trang 20 chuyến ổn định giảm từ 42 xuống 22 request, gồm danh sách và cities. Reset cờ retry tạo chuyến khi đổi tài khoản; lỗi request của tài khoản cũ không được xóa pending draft của tài khoản mới.
- Hồ sơ: hydrate tên/avatar từ response hiện tại; không ghi đè tên đang gõ và không tự coi dữ liệu vừa tải là bản sửa.
- Prettier 3.9.10 được pin, có format/check scripts và frontend CI. Test map syntax tìm AST template thực tế trong TripMap, giữ kiểm tra script và các assertion map đang có.
- Lockfile cập nhật duy nhất dependency bắc cầu `shell-quote` từ 1.10.0 lên 1.12.0 để xử lý [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), ngoài việc thêm Prettier devDependency. Không nâng Expo/React Native hoặc thêm state framework.

## Kết quả kiểm chứng

Ngày: 2026-10-13. Frontend chạy trên development build đã cài ở emulator-5554; Metro 8081 nối QA backend 8083 và PostgreSQL 17 riêng qua Docker. Hai tài khoản tổng hợp, không dùng dữ liệu hoặc mật khẩu người dùng. R2 dùng ảnh fixture tổng hợp với object UUID riêng, đã gỡ và kiểm tra cleanup về 0 byte reserved.

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript strict | Đạt |
| Prettier check | Đạt |
| `npm test` | 125/125 đạt; 0 lỗi, 0 bỏ qua |
| Adapter frontend → Spring Boot → PostgreSQL | 13/13 đạt; 0 bỏ qua, gồm 12 subtest và test cha |
| Android Hermes export | Đạt; đã kiểm tra lại sau thay đổi cuối |
| Backend trước khi refactor frontend | 165/165 đạt; 0 bỏ qua. Backend không thay đổi trong đợt frontend |

Các regression mới kiểm tra submit lặp, login response muộn, cancel challenge muộn, OTP validation, điều hướng reset password, vòng đời cooldown, profile hydrate muộn, ID/version đã ACK khi GET lỗi, retry metadata, hydrate phiên bản độc lập và workflow planner dùng chung.

Adapter integration chạy HTTP thật qua chính `apiRequest`, `tripApi` và `createProfileApi`, kiểm tra lưu sở thích, chuyến linh hoạt 1 ngày, chuyến cụ thể 30 ngày, giờ/tọa độ null, create replay, key cùng nội dung khác, version conflict, quyền tài khoản khác, thay lịch, tiến độ, hủy/khôi phục và xóa mềm. Fixture ban đầu thiếu transportMode và điểm dừng tối thiểu; đã sửa fixture theo contract trước lần chạy đạt, không sửa backend để làm test pass.

## Android đã thao tác thực tế

- Email login, nhớ phiên, force-stop rồi mở lại; logout và đổi tài khoản, không hiện chuyến/hồ sơ tài khoản trước.
- Sửa tên và hai sở thích, lưu thành công; đối chiếu GET hồ sơ độc lập.
- Chọn ảnh tổng hợp trong thư viện, crop hệ thống, preview, upload R2, xem thumbnail có auth, xóa avatar qua xác nhận rồi lưu. Không chọn ảnh cá nhân trong emulator.
- Tạo chuyến linh hoạt 1 ngày, nhập điểm thủ công không tọa độ, lưu và mở lại sau restart.
- Sửa tên, mở rộng 30 ngày và đổi sang ngày cụ thể; lịch đã nhập còn nguyên.
- Tạo xung đột từ API trong lúc đang sửa: UI báo 409 và giữ tên draft; xác nhận bỏ draft trước khi tải danh sách mới.
- Dừng riêng QA backend để mô phỏng lỗi kết nối: draft còn nguyên; khởi động lại backend và lưu lại thành công.
- Bắt đầu điểm, hoàn thành toàn bộ chuyến, đưa về chưa xong; GET độc lập xác nhận COMPLETED/UPCOMING.
- Hủy/khôi phục trên UI; chuyến hủy khóa chỉnh sửa.
- Quên mật khẩu qua OTP local và đăng nhập lại bằng mật khẩu mới trên tài khoản test thứ hai.
- Sau lần tách ViewModel cuối: thêm điểm, nhập ghi chú, đưa điểm lên trước, chuyển sang ngày 2 và lưu. GET độc lập xác nhận UUID cũ giữ nguyên và ghi chú/ngày mới đúng. Bắt đầu điểm ở ngày 2 rồi ngày 1: server giữ đúng một ACTIVE, điểm trước thành COMPLETED. Xóa chuyến qua xác nhận: danh sách rỗng và GET trả 404.

Ảnh bằng chứng và log local nằm trong `outputs/frontend-qa-evidence`/`outputs`; không commit dữ liệu riêng, token hoặc .env. Shared preferences mã hóa của emulator được sao lưu riêng trước QA để khôi phục sau kiểm tra. Android manifest, build diagnostic và file cá nhân giữ nguyên. Đã khôi phục shared preferences gốc và đối chiếu checksum; xóa riêng ảnh fixture trên emulator, dọn QA backend/container sau khi R2 quota về 0, trả Metro về API setting ban đầu.

## Giới hạn và điểm tiếp tục

- Chưa chạy OAuth Google thật, hoàn thiện phone sau OAuth, signup UI đầy đủ hoặc iOS. Chat giữa hai emulator đã được kiểm tra ngày 2026-10-14; đã sửa cách tạo URL socket và tránh bàn phím, còn vấn đề mốc đã đọc tin mới khi màn đang mở. Xem [REALTIME_EMULATOR_QA.md](REALTIME_EMULATOR_QA.md) để biết bằng chứng, giới hạn và task bàn giao cho teammate chat. Không đổi transport hay nghiệp vụ backend.
- Đây là kiểm chứng JavaScript/native integration trên development APK có sẵn và Hermes export; không thay thế build Gradle APK release/signing.
- Npm audit còn 25 cảnh báo: 7 moderate, 18 high, 0 critical. Nhiều cảnh báo đi qua Expo/React Native/Google Sign-In. Cần đợt xử lý dependency riêng có kiểm chứng native; không dùng audit fix --force hoặc tự nâng framework trong đợt refactor này.
- Địa điểm yêu thích còn là dữ liệu cục bộ theo tài khoản, không phải cloud sync. Khách sạn/chi phí/checklist/thành viên vẫn “Sắp có”; chưa refactor prototype TripUtilities thành feature hoàn chỉnh.
- Giữ HTTP adapter ở đường dẫn hiện tại để tương thích các module; thư mục trong CODING_STANDARDS là cấu trúc mục tiêu, không ép di chuyển mọi feature trong lần này.
- Khi server ACK progress nhưng lần đọc metadata tiếp theo lỗi, ID/version và các điểm đã được cập nhật; trạng thái chuyến tổng thể được đối soát ở lần tải thành công tiếp theo.
- Hosted CI đã đạt trên `32d4c45`: [Frontend quality](https://github.com/todicode/tripmatetravelapp/actions/runs/38397573974) 125 tests, 0 lỗi/bỏ qua; [Backend quality](https://github.com/todicode/tripmatetravelapp/actions/runs/38397573989) 165 tests, 0 lỗi/bỏ qua và Maven verify đạt. Commit bàn giao tiếp theo chỉ sửa báo cáo. Chỉ mở PR vào dev khi đã review báo cáo và giới hạn trên; main thực hiện sau theo yêu cầu người dùng.

Chạy lại: trong frontend dùng `npm ci`, `npm run format:check`, `npm run typecheck`, `npm test`. Integration dùng `npm run test:backend` với TRIPMATE_TEST_BASE_URL và credential của hai tài khoản tổng hợp trên database riêng; xem frontend/README.md. Không gửi secret vào chat hoặc commit.

## Bàn giao

- Backend: `b2d1969` định dạng, `844dab8` refactor và regression.
- Frontend: `cfc67d4` định dạng bằng Prettier; `32d4c45` MVVM, sửa trạng thái, regression và CI.
- Đã push các thay đổi lên `refactor/backend-quality`; dev/main không thay đổi trong đợt này.
- Workspace còn AndroidManifest và các file cá nhân/diagnostic như trước; không được đưa vào commit này. Backup mã hóa và state QA được loại khỏi Git bằng local exclude.

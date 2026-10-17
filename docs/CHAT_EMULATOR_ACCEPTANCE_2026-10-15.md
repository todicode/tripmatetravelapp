# Nghiệm thu phần sửa QA và bổ sung chat — 15/10/2026

Nhánh: `refactor/backend-quality`. Đã sửa và kiểm thử sau khi người dùng duyệt các phát hiện trong [báo cáo trước khi sửa](FULL_APP_EMULATOR_QA_2026-10-15.md). Chưa commit, push hoặc merge. Đây là hồi quy tập trung cho phần thay đổi; không tuyên bố chạy lại toàn bộ ma trận ứng dụng trước đó.

## Chức năng đã thực hiện

- Gửi một ảnh từ thư viện trong chat riêng/nhóm, có thể thêm caption, xem trước, bỏ chọn, mở ảnh lớn và thử gửi lại khi mất mạng. Retry giữ `clientMessageId` và media đã upload để tránh tạo tin trùng.
- Ảnh không còn nằm trong bong bóng xanh/trắng có padding. Ảnh bo góc riêng, caption bên dưới; trạng thái gửi/xem nằm ngoài khung. Áp dụng chung cho chat riêng và nhóm.
- File và thumbnail JPEG lưu trong bucket R2 riêng tư. PostgreSQL lưu metadata, người upload, kích thước và liên kết với tin nhắn. Ảnh được kiểm tra, giữ tỉ lệ, thu nhỏ và mã hóa lại để bỏ metadata; không lưu base64 trong database.
- Avatar của bạn bè/thành viên cùng nhóm tải qua endpoint xác thực riêng. Không mở quyền đọc toàn bộ media của người khác.
- Hiển thị “Đã gửi”, “Đã xem” và số người xem trong nhóm. Nhấn tin hoặc trạng thái bên dưới để mở danh sách người đã xem. Dữ liệu dựa trên `lastReadSeq`, không bịa giờ đọc từng tin.
- Sửa mốc đọc khi tin mới xuất hiện thụ động. Chỉ đánh dấu tin nhận đã tải và thực sự nhìn thấy; tạm dừng khi app nền hoặc hộp thoại che màn chat. Sự kiện đọc nhóm gửi đến mọi thành viên đang hoạt động.
- Dọn route khi rời/bị gỡ khỏi nhóm; bổ sung bộ chọn chuyến server khi tạo/quản lý nhóm; nhập danh sách đã lưu yêu cầu chọn thành phố hợp lệ và giữ địa điểm; bổ sung đường về đăng nhập khi OTP đăng ký đã được dùng.

Frontend giữ MVVM và transport STOMP/REST hiện có. Backend messaging sử dụng public API `media.api.ChatMedia`, không gọi repository nội bộ của module media. Không thêm dependency hoặc đổi `.env`.

## Contract và database

Contract lên `1.8.0`; xem [changelog](api/CHANGELOG.md) và [OpenAPI](api/openapi.json).

- `POST /media` thêm purpose `CHAT_IMAGE`.
- Gửi tin riêng/nhóm nhận `mediaId` tùy chọn; cho phép body rỗng khi có ảnh. Lưu tin và gắn ảnh nguyên tử; kiểm tra ownership, trạng thái, thời hạn và idempotency.
- `GET /chat/avatars/{mediaId}` chỉ trả avatar hiện tại của người active cho chủ sở hữu, bạn bè hoặc người đang cùng nhóm.
- `GET /direct-conversations/{id}/messages/{messageId}/image` và endpoint tương ứng của nhóm kiểm tra quyền trước khi mở stream R2. Query `thumbnail=false` lấy ảnh lớn.
- `GET /direct-conversations/{id}/readers` trả snapshot mốc đọc. Nhóm dùng snapshot thành viên hiện có.
- Migration mới `V11__chat_images.sql`; không sửa V1–V10. Có kiểm tra nâng database V10 có tin chữ cũ và database mới. SQL tham chiếu được cập nhật cùng contract.

## Kiểm thử tự động

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `scripts/test-trips.ps1` → Maven `clean test` | **173 chạy, 0 lỗi, 0 bỏ qua; BUILD SUCCESS** |
| Frontend `npm test` | **135 chạy, 0 lỗi, 0 bỏ qua** |
| Adapter frontend gọi Spring Boot/PostgreSQL QA thật | **13 chạy, 0 lỗi, 0 bỏ qua** |
| Mock HTTP/contract | **112 chạy, 0 lỗi, 0 bỏ qua** |
| Validator OpenAPI | **99 operations, 184 schemas, 2.539 examples/parameters, 6 negative checks: đạt** |
| TypeScript, Prettier, Java formatter, `git diff --check` | Đạt ở lượt kiểm tra cuối |

Backend integration dùng PostgreSQL Docker riêng cho các module, không bỏ qua vì thiếu biến môi trường. Các ca mới kiểm tra quyền đọc ảnh/avatar, attach nguyên tử, retry, upload của người khác/hết hạn, tranh chấp cùng một media, thu hồi membership và migration. Test HTTP media dùng ObjectStorage double; lượt emulator bên dưới mới là bằng chứng gọi R2 thật.

Query regression kiểm tra trang 2 và 8 tin có metadata ảnh: direct 6, group 5 statements, không tăng theo số tin. Đây là số truy vấn trong fixture, không phải benchmark tải production.

## Hai emulator thực tế

Pixel_8 (`emulator-5554`) và Pixel_8_2 (`emulator-5556`), Android 37.2, hai tài khoản tổng hợp độc lập. Development APK hiện có, Metro QA 8084, backend QA 8083, PostgreSQL QA riêng. Quan hệ bạn bè, avatar và hai chuyến ban đầu được seed qua API; không tính bước seed là thao tác UI.

| Ca hồi quy trên app | Kết quả |
| --- | --- |
| Hai phiên đăng nhập độc lập; avatar người kia ở header/tin nhận | Đạt, ảnh tải thật từ R2 |
| Nhận tin khi đang mở chat riêng, không bấm/cuộn | Mốc đọc tăng; máy gửi hiện “Đã xem” |
| Mở chi tiết tin riêng và ảnh nhóm | Hiện đúng người đã xem |
| Tin đến trong lúc hộp chi tiết đang mở | Không đánh dấu đọc đến khi đóng hộp |
| Chọn ảnh, xem trước, bỏ ảnh | Không upload trước khi bấm gửi |
| Gửi ảnh không caption; máy kia mở ảnh lớn | Đạt |
| Tắt mạng thật trên B, gửi ảnh + caption rồi bật mạng/thử lại | Giữ bản lỗi; gửi lại thành công, database chỉ có một tin |
| Force-stop/mở lại B | Khôi phục phiên, tải lại được hai ảnh từ server |
| Tạo nhóm bằng UI và chọn chuyến linh hoạt của owner | Lưu đúng ID server |
| Gỡ/gắn lại chuyến trong quản lý nhóm | Lưu đúng liên kết qua UI |
| Nhận tin nhóm thụ động | Máy gửi hiện “Đã xem (1)” |
| Xem chuyến linh hoạt liên kết, ngày/giờ nullable | Hiển thị đúng |
| Ảnh nhóm đến khi B đang xem chuyến | Chưa đọc khi bị che; đóng hộp mới đọc và tải ảnh |
| Rời nhóm | Tự về màn chính có thanh điều hướng, không cần Back Android |
| Bị gỡ khi đang mở chuyến nhóm | Đóng dữ liệu riêng, về màn chính; API ảnh/chuyến nhóm trả 404 |
| Nhập danh sách Hội An vào lịch thủ công | Chọn thành phố, giữ điểm Hoi An Memories Land, lưu và đối chiếu lịch PostgreSQL |
| OTP đã được dùng | Tiêu thụ OTP bằng API khi form UI còn mở; UI hiện nút về đăng nhập, đăng nhập thành công |
| Bỏ khung xanh quanh ảnh | Đã xem trực tiếp chat nhóm trên A và chat riêng trên B sau HMR |

Ca OTP dùng email log trên QA và tiêu thụ challenge có kiểm soát; không phải kiểm thử giao thư SMTP hoặc làm mất gói phản hồi trên mạng. Lỗi assertion do harness chờ nhầm màn sau khi lưu chuyến, tên trường API hoặc IME sửa chữ đã được tách khỏi lỗi sản phẩm.

Evidence PNG/XML, log và fixture nằm riêng trong `outputs/realtime-private/full-20261015`, bị loại khỏi Git. Ví dụ: `fixed-photo-no-blue-group-A.png`, `fixed-photo-no-blue-direct-B.png`, `fixed-group-removed-root-B.png`, `fixed-import-saved-B.png`, `fixed-consumed-otp-recovery-B.png`.

## Dọn môi trường và giới hạn

- Đã đăng xuất hai tài khoản QA, trả riêng developer host về mặc định Metro 8081/backend dev 8082 và khôi phục Android settings đã sao lưu. Giữ hai installationId độc lập; không restore toàn bộ SecureStore. Không dừng Metro của người dùng.
- Đã dọn đúng 2 avatar và 3 ảnh chat của lượt sửa theo ID lưu trong manifest QA. Mutation chỉ chạy trên database `tripmate_ui_qa`; scheduler hiện có đã purge cả file/thumbnail trên R2 và giải phóng quota cho đủ **5/5 assets**. Ảnh fixture sau dọn không còn xem được; evidence trước dọn vẫn được giữ riêng. Xóa đúng file gallery QA đã thêm, không xóa ảnh cá nhân.
- Database QA được giữ lại. Avatar QA cũ từ database tạm đã mất trong lượt trước vẫn chưa xác định được ID; không xóa object R2 theo phỏng đoán.
- Backend dev 8082 đang chạy tiến trình cũ; cần khởi động lại bằng script backend bình thường để áp dụng V11 và endpoint mới trước khi thử bằng tài khoản thật. Lượt QA này không áp migration hoặc tạo fixture vào database dev.
- Chưa bổ sung nhiều ảnh/tin, video, PDF, push notification, sửa/xóa tin hoặc lưu hàng đợi offline qua lần tắt app. Draft/thử lại hiện là trong phiên; không hứa khôi phục tin chưa gửi sau force-stop.
- Không có thời gian đọc chính xác từng tin; danh sách nhóm phản ánh snapshot thành viên hiện tại. Không thể thu hồi bản ảnh người dùng đã tải/lưu trước khi mất quyền; API chặn các lần tải tiếp theo.
- Photon timeout đã ghi trong báo cáo gốc vẫn cần điều tra riêng. Chưa kiểm chứng iOS/release, Google OAuth, QR decode từ camera trực tiếp, Gần bạn có kết quả dương tính, font lớn và tải dài hơn 50 tin. AI, khách sạn, chi phí, checklist/cộng tác chuyến vẫn ngoài phạm vi.

## Chạy lại

Từ root, chạy `./scripts/test-trips.ps1 -JavaHome 'C:\Program Files\Java\jdk-26.0.2.1'` khi Docker sẵn sàng. Chạy `npm --prefix frontend run typecheck`, `npm --prefix frontend test`, `npm --prefix frontend run format:check`, `python scripts/format-backend.py --check --java-home 'C:\Program Files\Java\jdk-26.0.2.1'`, `docs/api/.venv/Scripts/python docs/api/validate_contract.py`, `node --test docs/api/mock-server.test.mjs`.

Để thử UI, restart backend dev, giữ hai emulator có installationId/IP riêng, mở Metro đúng cấu hình và đăng nhập hai tài khoản. Gửi ảnh hai chiều trong chat riêng/nhóm; đối chiếu “Đã xem” khi bên kia mở chat và khi đang có hộp thoại che chat. Không đưa mật khẩu, token hoặc `.env` vào báo cáo/Git.

## Kiểm thử bổ sung ngày 17/10/2026

- Docker đã được bật lại; container PostgreSQL QA cũ còn nguyên. Backend QA đã khởi động từ code hiện tại trên 8083. Người dùng bật Metro QA 8084 với `EXPO_PUBLIC_GOOGLE_AUTH_API_URL=http://10.0.2.2:8083/api/v1`. Hai máy đăng nhập lại đúng hai tài khoản tổng hợp qua UI, không dùng tài khoản thật.
- Đã tạo riêng 2 avatar QA bằng API/R2 và gửi thêm 2 ảnh hoàn toàn qua thư viện/UI: A gửi ảnh + caption trong chat riêng, B gửi ảnh + caption trong nhóm. Avatar đối phương, thumbnail, ảnh lớn, caption không có khung xanh và hộp người đã xem đều hiển thị được.
- Chat riêng: B gửi khi A đứng yên; xác minh mốc đọc của A tăng đến seq 8. Chat nhóm: B gửi ảnh seq 3, A nhận thụ động và B hiện “Đã xem (1)”. Mở danh sách người xem cho ảnh, xem chuyến linh hoạt liên kết, rời nhóm qua UI và xác minh tải ảnh sau khi rời trả 404. Thanh điều hướng trở lại bình thường.
- Có gián đoạn môi trường: B báo “Process system isn't responding”, đã reboot riêng B, không xóa dữ liệu. Sau đó Android đóng TripMate để cập nhật `com.google.android.webview`; event log có `killDueToPackageUpdate`, không có TripMate FATAL EXCEPTION trong crash buffer đã đọc. Đã mở lại app và nối Metro tạm qua ADB reverse.
- Sau B reboot, API trên A có lúc không truy cập được trong khi socket cũ vẫn nhận tin. Mốc đọc giữ 4 vì REST tải bù chưa hoàn tất; đây là guard chống đánh dấu khoảng tin chưa tải, không phải bằng chứng callback đọc bị lỗi. Probe TCP từ A thất bại, từ B trả 401 như dự kiến cho request không token. Sau nối lại Wi-Fi A, cả hai probe thành công; A tải bù và đọc đến 7, tin mới tiếp theo được đọc đến 8 mà không cần tương tác trên A. Không bỏ guard hoặc sửa logic đọc để che lỗi môi trường.
- Log chẩn đoán tạm đã gỡ khỏi source. Kiểm tra lại Java formatter, Prettier, TypeScript và whitespace diff đạt; **frontend chạy lại 135 ca, 0 lỗi, 0 bỏ qua**. Backend 173 ca và adapter 13 ca trong bảng trên vẫn là lượt 15/10; lượt này bổ sung smoke API và native, không chạy lại toàn bộ backend suite.
- Cập nhật README và tài liệu direct/group để bỏ các mô tả cũ “text only/nhóm local”, sửa mô tả envelope của reader snapshot cho khớp contract. Giữ nguyên 6 dòng AndroidManifest có sẵn và các file cá nhân. Evidence bổ sung có tiền tố `resume17-` trong cùng thư mục QA riêng, không đưa vào Git.
- Kết thúc lượt này đã purge **4/4 assets mới** (2 avatar, 2 ảnh chat) bằng scheduler R2 sau cleanup đúng ID trên QA. Hai tài khoản đã đăng xuất, app đã đóng, developer host/autofill được khôi phục và chỉ hai mapping ADB reverse 8084 vừa thêm được gỡ. File gallery `TripMate-QA-chat-20261017.webp` được xóa riêng; database dev và thư viện ảnh cá nhân không bị chỉnh sửa. Metro của người dùng, backend QA 8083 và container QA vẫn được giữ; cần bật Metro/backend dev theo cấu hình bình thường trước khi mở lại app bằng tài khoản thật.

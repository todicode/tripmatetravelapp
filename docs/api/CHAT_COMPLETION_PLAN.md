# Hoàn thiện chat và xử lý phát hiện QA

Ngày bắt đầu: 15/10/2026. Nhánh: `refactor/backend-quality`. Người dùng đã cho phép sửa các phát hiện QA và bổ sung UI chat, gửi ảnh, avatar giữa tài khoản, chi tiết đã xem. Ngày 17/10 người dùng đã duyệt commit, push, mở PR và merge vào `dev` sau kiểm tra CI; `main` nằm ngoài yêu cầu này. Các ghi nhận “chưa commit/push/merge” bên dưới phản ánh thời điểm nghiệm thu trước khi mở PR.

## Quyết định triển khai

- Giữ MVVM, STOMP/REST, bigint dạng chuỗi, retry bằng clientMessageId và quyền hiện có.
- Ảnh chat: một ảnh JPEG/PNG/WebP mỗi tin, caption tối đa 4.000 ký tự; chọn từ thư viện, xem trước, bỏ chọn, gửi và thử lại. Chuẩn hóa ảnh, giữ tỉ lệ, bỏ metadata, giới hạn upload 10 MB/40 triệu pixel. R2 riêng tư chứa file và thumbnail; PostgreSQL chứa metadata/liên kết. Không lưu base64 trong database/tin nhắn.
- Upload chưa gửi được dọn theo TTL media hiện có. Gắn ảnh với tin trong transaction; retry cùng khóa phải trả cùng tin, payload khác trả 409.
- Đọc ảnh chat qua endpoint cuộc trò chuyện, xác thực participant hoặc membership active mỗi lần; người bị gỡ nhóm mất quyền. Không công khai bucket.
- Avatar chat: chỉ avatar hiện tại của người dùng active, cho chủ sở hữu, bạn bè hoặc thành viên đang cùng nhóm. Giữ API media gốc theo ownership; thêm API thumbnail chat để không mở quyền đọc các ảnh upload chưa gắn.
- Đã xem dựa trên lastReadSeq thực tế; hiển thị đã gửi/đã xem và nhấn tin để xem danh sách. Không suy ra giờ đọc khi backend không lưu thời điểm đọc từng tin. Không đánh dấu lastSeq chưa nhìn thấy.
- Sửa điều hướng khi nhóm bị gỡ/rời, import danh sách yêu cầu chọn thành phố hợp lệ, chọn chuyến server khi tạo/quản lý nhóm, hướng dẫn đăng nhập khi OTP đã dùng.
- Không nâng dependency, không sửa migration đã áp dụng, giữ file Android/cá nhân có sẵn.

## Các bước

| Bước | Nội dung | Trạng thái |
| --- | --- | --- |
| CT-01 | Khảo sát, contract bổ sung, migration V11 (remote dev hiện đến V10) | Contract validator đạt; V11 kiểm chứng DB mới và nâng từ V10 |
| CT-02 | Điều hướng, đọc tin nhìn thấy, import danh sách, liên kết chuyến, phục hồi đăng ký | Đạt unit và hồi quy native hai emulator |
| CT-03 | Backend ảnh chat, quyền avatar và snapshot người đọc; regression PostgreSQL | Maven clean test: 173 chạy, 0 lỗi, 0 bỏ qua |
| CT-04 | ViewModel/UI chọn/gửi/xem ảnh, avatar và chi tiết đã xem | Đạt native; bỏ nền xanh quanh ảnh theo góp ý; typecheck và 135 frontend tests đạt |
| CT-05 | Formatter, typecheck, frontend/contract/backend tests và hai emulator | Đạt; thêm 112 mock tests và 13 adapter tests trên backend/PostgreSQL QA thật |
| CT-06 | Cập nhật báo cáo QA, kết quả và giới hạn thực tế | Đã ghi báo cáo nghiệm thu, dọn 5/5 media mới và trả cấu hình emulator |

Chỉ báo đã đạt emulator khi có thao tác trên app thật. Integration dùng PostgreSQL QA riêng, không dùng database dev làm fixture. Giữ log/token/OTP trong thư mục QA bị loại khỏi Git. Photon timeout đã tái hiện cả trên host, xử lý như dependency cần điều tra, không giả lập tìm kiếm thành công.

## Điểm tiếp tục

- Đã mở rộng contract 1.8.0 và ghi changelog. Module messaging gọi media.api.ChatMedia, media không phụ thuộc ngược messaging; architecture test đạt.
- Bộ backend đầy đủ đã đạt 173 ca, 0 lỗi, 0 bỏ qua; assertion STOMP kiểm tra cả sender/recipient và không phát cho outsider. QueryEfficiencyTest xác minh cả metadata ảnh, thêm đúng một truy vấn batch/page (direct 6, group 5), không tăng theo số hàng.
- Native đã kiểm chứng passive read, UI người xem, ảnh thư viện/caption/retry/mở lại app, avatar chéo, nhóm link trip/gửi ảnh/read/rời/bị gỡ không kẹt nav, import danh sách chọn thành phố rồi giữ stops, phục hồi OTP đã dùng. Ảnh hiển thị riêng, caption bên dưới, trạng thái bên ngoài.
- Đã đăng xuất QA trên cả hai emulator, trả developer host và Android settings; giữ installationId độc lập. Đã purge đúng 2 avatar + 3 ảnh chat mới theo manifest trên QA; không dùng database dev làm fixture. Orphan avatar từ QA trước bị mất DB vẫn chưa xác định ID.
- Báo cáo và hướng dẫn chạy lại: [CHAT_EMULATOR_ACCEPTANCE_2026-10-15.md](../CHAT_EMULATOR_ACCEPTANCE_2026-10-15.md). Các giới hạn ngoài phạm vi và Photon timeout ghi rõ ở đó. Backend dev cần restart để áp V11/endpoints mới; chưa commit, push hoặc merge.
- Ngày 17/10 đã chạy thêm hồi quy native hai emulator sau khởi động lại môi trường: ảnh riêng/nhóm, avatar, ảnh lớn, người đã xem, passive read, chuyến liên kết và rời nhóm/thu hồi quyền đều đạt. Android ANR, cập nhật WebView và API mất kết nối được chẩn đoán riêng; không bỏ guard REST catch-up. Frontend chạy lại 135/135; dọn thêm 4/4 media QA, khôi phục cấu hình máy và gỡ toàn bộ log chẩn đoán tạm. Chi tiết/evidence trong phần bổ sung của báo cáo nghiệm thu.

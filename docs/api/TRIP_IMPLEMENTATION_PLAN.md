# Chuyến đi và lịch trình thủ công

Baseline: `15f1b1b`. Chat realtime do teammate phụ trách; không thay transport/socket.

## Phạm vi đã chốt

Chuyến cá nhân lưu PostgreSQL; ngày cụ thể hoặc linh hoạt 1–30 ngày; danh mục Việt Nam; Photon/OSM và điểm nhập tay; lịch theo ngày, tiến độ, hoàn thành/hủy/khôi phục/xóa mềm. Khách sạn, chi phí, checklist, thêm thành viên ghi Sắp có. AI, offline và cộng tác nằm ngoài đợt này.

## Trình tự và trạng thái

| Task | Nội dung | Trạng thái |
|---|---|---|
| CD-01 | Contract, ví dụ, mock, changelog | Đạt validator + 108 mock tests |
| CD-02 | Migration mới và danh mục điểm đến | Đạt test nâng cấp V9 → V10 và chạy SQL tham chiếu trên DB trống |
| CD-03 | API chuyến, phân quyền, version, tạo nguyên tử/chống trùng | Đã triển khai, các ca HTTP/PostgreSQL hiện có đạt |
| CD-04 | Lịch, địa điểm và tiến độ | Đạt HTTP/PostgreSQL: rollback, quyền nhóm, version, tiến độ và lỗi provider |
| CD-05 | Frontend danh sách và tạo chuyến | Đã nối server, TypeScript và adapter tests đạt |
| CD-06 | Chỉnh sửa, lưu, tiến độ và xử lý lỗi | Đạt kiểm thử ViewModel và các thao tác Android chính; xem biên bản Android |
| CD-07 | DTO chia sẻ chuyến hỗ trợ ngày/giờ null | Đạt HTTP chia sẻ chuyến linh hoạt và chuyến đã xóa |
| CD-08 | Kiểm thử PostgreSQL, Android và bàn giao | Hồi quy tự động đạt; Android đã chạy các ca chính, đã sửa lỗi bản đồ; còn các ca UI bổ sung |

## Quy tắc triển khai

- Contract trước implementation; migration mới, không sửa V8/V9. Kiểm tra số migration trước khi merge với teammate.
- Tạo chuyến nhận lịch ban đầu và clientRequestId; cùng user/khóa/nội dung trả cùng chuyến, khác nội dung trả 409. Toàn bộ tạo chuyến/owner/lịch chung transaction.
- dateMode SPECIFIC/FLEXIBLE, durationDays 1–30; ngày linh hoạt null. status UPCOMING/COMPLETED/CANCELLED tách phase theo ngày (UNSCHEDULED cho linh hoạt).
- PUT lịch nguyên tử với expectedVersion; UUID cũ thuộc chính lịch, UUID mới do server cấp. Tối đa 50 mục/ngày. Giờ đến/kết thúc nullable, chỉ kiểm tra khoảng khi đủ hai mốc.
- PATCH tiến độ kiểm tra version; tối đa một ACTIVE; bắt đầu mục mới hoàn thành mục ACTIVE cũ. Tất cả mục hoàn thành thì COMPLETED, còn mục chưa xong thì UPCOMING. CANCELLED cần khôi phục trước khi sửa.
- Giảm ngày không âm thầm xóa mục. Owner quản lý chuyến; ACTIVE member đọc/sửa lịch. Người chỉ xem qua nhóm không có quyền ghi.
- Không fake tọa độ/giờ/provider. OSM giữ provider ID; điểm thủ công không tọa độ vẫn lưu được.
- Frontend MVVM, giữ draft khi lỗi/409, cảnh báo rời màn, không để response tài khoản cũ cập nhật tài khoản mới.
- Chia sẻ chuyến cần null-safe ngày/giờ và không đọc được chuyến đã xóa. Không sửa nghiệp vụ nhắn tin.

## Nghiệm thu

1/30 ngày, từ chối 0/31; ngày linh hoạt; ngày trống; CRUD/chuyển/sắp xếp điểm; giảm ngày có dữ liệu; giờ/tọa độ thiếu; Photon lỗi; retry POST; rollback; hai version cạnh tranh; người ngoài/nhóm không có quyền ghi; hủy/khôi phục; logout; mở lại app. Chạy PostgreSQL riêng bằng Docker, ghi rõ số test chạy/bỏ qua và phần Android chưa kiểm tra.

## Nhật ký

- Đồng bộ origin/dev từ 480ac95 đến 15f1b1b; giữ nguyên file Android và file cục bộ của người dùng.
- Backend: 151 ca đạt, 0 lỗi, 0 bỏ qua trên PostgreSQL Docker riêng qua scripts/test-trips.ps1. Sửa assertion profile cũ để kiểm tra friendCode của viewer khi gọi /users/me; không đổi nghiệp vụ profile.
- Frontend: 105 ca node:test đạt (gồm kiểm tra launcher Android), script tripModel cũ và TypeScript đạt. Contract: 108 mock tests; validator đạt 95 operations, 181 schemas, 2428 examples và 6 negative checks.
- Kiểm tra Android: ADB không có thiết bị; thử AVD Pixel_8 thất bại vì thiếu kernel-ranchu. Chưa tuyên bố test UI native đạt.
- Module lịch và tìm địa điểm nằm trong feature trips ở đợt này, không tạo dependency vòng. Cursor ký được đưa vào shared; ConversationCursor giữ adapter tương thích, không thay transport/socket.

## Bàn giao và điểm tiếp tục

- Hướng dẫn chạy kiểm thử/API/UI: [TRIP_TESTING.md](TRIP_TESTING.md). Script backend tạo và dọn database Docker riêng, không dùng backend/.env.
- CD-01–CD-07 đã triển khai; CD-08 đã kiểm thử Android các luồng chính, còn các mục ghi trong biên bản nghiệm thu. Bundle Android/Hermes xuất thành công nhưng không thay thế kiểm thử trên thiết bị.
- Session sau: xem TRIP_ANDROID_ACCEPTANCE.md, tiếp tục các ca native chưa chạy (hai thiết bị, mất phản hồi POST, đổi tài khoản/quyền nhóm, 50 mục, dark mode/cỡ chữ lớn). Không cần triển khai lại API/lịch.
- Teammate chat chỉ cần lưu ý DTO SharedTrip: startDate/endDate và ngày lịch có thể null, giờ điểm dừng có thể null. ID chuyến lấy từ server; chuyến xóa mềm trả 404 cả khi xem qua nhóm. Transport/socket giữ nguyên.
- V10 là migration mới của tính năng này; kiểm tra lại origin/dev trước khi merge để tránh trùng số migration phát sinh sau baseline 15f1b1b.
- Giới hạn: không lưu draft offline qua lần khởi động app; chưa có mời thành viên, AI, khách sạn, chi phí hoặc checklist. Photon công cộng chưa được kiểm tra SLA; kiểm thử provider dùng HTTP server cục bộ/test double.

## Cập nhật Android 2026-10-12

Máy ảo đã chạy và đã kiểm thử trực tiếp tạo/lưu/mở lại/chỉnh sửa/tiến độ/hủy/khôi phục/xóa và giữ draft khi xung đột. Xem [biên bản Android](TRIP_ANDROID_ACCEPTANCE.md). CD-08 chưa đóng vì còn các ca UI chưa chạy; lỗi bản đồ CARTO đã được thay bằng nguồn OSM và kiểm tra lại. Trở ngại kernel-ranchu trong nhật ký cũ không còn là blocker hiện tại.

- Lượt Android tiếp theo: đã sửa bản đồ, UI chuyến hủy, vị trí nút tiến độ và thông báo lỗi lưu. Đạt chuyển/sắp xếp điểm, chặn giảm ngày có dữ liệu, tối đa một ACTIVE, mở lại chuyến hoàn thành, giữ draft khi backend mất kết nối và retry thành công. Chi tiết và giới hạn nằm trong biên bản Android.

# Kiểm thử Android thực tế — 2026-10-12

## Môi trường và cách kiểm tra

- Pixel_8, emulator-5554, thao tác qua ADB input, đọc UI Automator và ảnh màn hình; không dùng mock UI.
- App debug build thành công (271 Gradle tasks); backend thật cổng 8082 và PostgreSQL local. Metro cổng 8081 cần nghe IPv4/LAN; `--localhost` trên máy này chỉ nghe ::1 khiến emulator không lấy được bundle.
- Tạo riêng chuyến `QA trip 20261012`, không sửa chuyến Đà Lạt có sẵn. Đối chiếu các trường của đúng chuyến QA bằng truy vấn PostgreSQL. Cuối buổi đã xóa mềm chuyến QA qua giao diện.

## Các ca đã đạt trực tiếp trên giao diện

| Thao tác | Kết quả quan sát |
|---|---|
| Tạo chuyến Đà Nẵng linh hoạt 1 ngày | Lưu thành công, chuyển sang chi tiết chuyến |
| Điểm nhập tay không tọa độ, xóa giờ đến rồi lưu | Snapshot MANUAL; lat/lng/startTime/endTime null trong PostgreSQL, không có marker giả |
| Bắt đầu điểm dừng | Server lưu ACTIVE |
| Nhập 31 ngày | Form chặn với thông báo chọn 1–30 ngày |
| Đổi 1 → 30 ngày | Server lưu 30 ngày, giữ điểm ngày 1 |
| Force-stop rồi mở lại app | Phiên đăng nhập khôi phục; danh sách vẫn hiện chuyến 30 ngày và 1 điểm dừng |
| Hủy chuyến | Hiện thông báo đã hủy, nút Chỉnh lịch và Thông tin disabled |
| Khôi phục chuyến | Nút chỉnh sửa hoạt động trở lại; tiến độ ACTIVE còn nguyên |
| Hoàn thành điểm dừng cuối | Item và trip đều COMPLETED trong PostgreSQL |
| Đổi linh hoạt → ngày cụ thể, giảm 30 → 1 khi ngày bỏ trống | Lưu 15/10/2026–15/10/2026; điểm ngày 1 và tiến độ được giữ |
| Xung đột version | Tăng version riêng chuyến QA bằng SQL để mô phỏng phiên khác; lưu tên mới bị từ chối, form giữ nguyên `QA draft retained`, tên server không bị ghi đè |
| Rời form có bản sửa chưa lưu | Hiện xác nhận Tiếp tục sửa/Bỏ thay đổi |
| Tải lại, chỉnh ghi chú lịch và lưu | PostgreSQL lưu `QA edited after reopen`, giữ trạng thái COMPLETED |
| Xóa chuyến | Có xác nhận; biến mất khỏi danh sách; deleted_at được đặt, chuyến Đà Lạt vẫn còn |

Ảnh lỗi xung đột giữ bản sửa: `outputs/trips-ui-conflict-retained.png` (artifact cục bộ, không cần commit).

## Lỗi phát hiện trong lượt đầu (đã xử lý bên dưới)

- **Bản đồ nền lỗi:** các tile CARTO hiện chữ `API KEY REQUIRED`. Nguồn URL ở `frontend/src/trips/TripMap.tsx`. Đã thay provider và kiểm tra lại ở lượt tiếp theo bên dưới.
- Điểm cập nhật tiến độ nằm cuối sheet chi tiết khá dài, phải cuộn mới thấy. Nên đưa thao tác này lên vị trí dễ thấy hơn.
- Khi chuyến hủy, các nút sửa chính đã disabled nhưng nút Lưu/Thêm địa điểm trong màn chi tiết vẫn hiện có thể bấm. Cần thống nhất trạng thái chỉ đọc trong UI (backend đã chặn ghi).
- Danh sách kết quả Photon có thể thay đổi vị trí nút nhập tay trong lúc đang tải; khi kiểm thử cần đợi kết quả ổn định trước khi chọn. Truy vấn `QA cafe` trả cả địa điểm ngoài thành phố; cần đánh giá bộ lọc theo khu vực nếu sản phẩm yêu cầu chỉ tìm trong thành phố.

## Chưa xác minh trực tiếp trên Android trong lượt này

Hai thiết bị đồng thời (ca version ở trên mô phỏng bằng SQL), mất phản hồi sau POST, mất mạng khi sửa, logout/đổi tài khoản, nhóm chỉ đọc, chuyển/sắp xếp nhiều điểm, thu nhỏ ngày đang có điểm ở ngày bị bỏ, 50 mục/ngày, chế độ tối/cỡ chữ lớn. Các ca tự động đã có không thay thế nghiệm thu UI cho các mục này.

CD-08 vẫn còn mở cho các ca UI còn thiếu. Lỗi bản đồ đã được xử lý và kiểm tra lại bên dưới.

## Lượt tiếp theo — sửa lỗi và kiểm tra lại

Thay đổi:
- TripMap dùng tile OpenStreetMap, attribution có liên kết, User-Agent bổ sung TripMate/1.0 và cache WebView mặc định. Không tải trước bản đồ/offline. Chế độ tối điều chỉnh độ sáng lớp tile, không đổi nguồn hoặc tải lại tile chỉ vì đổi theme. Nguồn: https://operations.osmfoundation.org/policies/tiles/ .
- Thông báo lỗi tile vẫn hiện khi màn chi tiết ẩn nhãn lộ trình; khi tải được tile trở lại thì xóa lỗi.
- Chuyến đã hủy ẩn Lưu, thêm/xóa điểm, cập nhật tiến độ. Vẫn xem được chi tiết và bản đồ.
- Nút tiến độ nằm trên phần cuộn trong sheet, không phải cuộn hết thông tin địa điểm.
- Lỗi lưu ở màn chỉnh lịch hiện cố định trên nút Lưu, không bị khuất trong nội dung dài.

Kiểm thử bổ sung trên emulator:
- Bản đồ Đà Nẵng tải thành công, không còn watermark; ảnh `outputs/trips-ui-map-fixed.png`.
- Dùng fixture QA riêng `QA itinerary actions 20261012` (2 ngày, 2 điểm thủ công), tạo bằng SQL để tập trung test thao tác sửa; không tính đây là ca tạo chuyến qua UI.
- Hủy chuyến: xác nhận không có nút Lưu/Thêm địa điểm/đổi tiến độ; khôi phục mở lại chỉnh sửa.
- Đổi A/B thành B/A, lưu và đối chiếu thứ tự trong PostgreSQL: đạt.
- Chuyển B từ ngày 1 sang ngày 2, lưu: đạt.
- Giảm 2 ngày xuống 1 khi ngày 2 có B: bị chặn `Ngày bị bỏ còn điểm dừng`, dữ liệu giữ nguyên.
- Bắt đầu A rồi B: A thành COMPLETED, B ACTIVE; tối đa một ACTIVE.
- Tạm dừng riêng process backend của lượt test, sửa ghi chú rồi lưu: lỗi kết nối hiện, giữ nguyên draft. Khởi động lại backend và lưu lại thành công. Ảnh `outputs/trips-ui-network-draft.png`. Đây là mô phỏng backend mất kết nối, không phải ca mất phản hồi sau POST.
- Hoàn thành B rồi mở lại A: chuyến trở về UPCOMING, A PENDING, B COMPLETED.
- TypeScript, script tripModel/map (gồm tile error/recovery) và 105 ca node:test đạt, 0 bỏ qua sau thay đổi.

Các ca vẫn chưa chạy native: hai thiết bị đồng thời, mất phản hồi sau POST, logout/đổi tài khoản, quyền nhóm, 50 mục/ngày, dark mode/cỡ chữ lớn. Không suy ra đã đạt từ kiểm thử tự động.

Dọn dữ liệu: cả hai chuyến QA đã được xóa mềm qua UI; kiểm tra deleted_at xác nhận đúng. Không xóa/sửa chuyến Đà Lạt của người dùng.

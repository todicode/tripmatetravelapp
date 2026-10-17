# Kiểm chứng chat trên hai emulator

> Báo cáo lịch sử ngày 14/10. Các phát hiện tiếp theo và kết quả sửa/nghiệm thu ngày 15–17/10 được ghi trong [CHAT_EMULATOR_ACCEPTANCE_2026-10-15.md](CHAT_EMULATOR_ACCEPTANCE_2026-10-15.md).

Ngày kiểm tra: 2026-10-14. Nhánh: `refactor/backend-quality`.

## Môi trường và dữ liệu

- Pixel_8_2 (`emulator-5554`) và Pixel_8 (`emulator-5556`), Android API 37.2.
- Hai tài khoản riêng của người dùng, người dùng tự đăng nhập. Không lưu mật khẩu trong công cụ kiểm thử.
- Development APK có sẵn, JavaScript từ Metro 8081; backend local 8082 và PostgreSQL local 55432.
- Đây là nghiệm thu UI với tài khoản người dùng, không phải chạy integration fixtures trên database ứng dụng. Các truy vấn kiểm chứng PostgreSQL chỉ đọc.
- Kết bạn qua QR và tạo nhóm `TripMate QA realtime 2026-10-14` với hai thành viên qua giao diện. Tin kiểm tra có tiền tố `TripMate QA`. Giữ lại nhóm và tin để người dùng kiểm tra; đã xóa ảnh QR tạm được nhập vào emulator.
- Dữ liệu riêng, shared preferences mã hóa, ảnh và log nằm trong `outputs/realtime-private`, được loại khỏi Git bằng `.git/info/exclude`. Không đưa tài khoản, token hoặc nội dung riêng vào báo cáo này.

## Các lỗi đã xử lý

### Hai máy dùng chung mã cài đặt

Hai AVD có cùng Android ID và cùng bản mã của khóa SecureStore `installationId`. Backend ghi nhận hai tài khoản dùng cùng một device binding. Đăng nhập tài khoản khác trên binding đó vô hiệu hóa phiên trước theo quy tắc hiện có.

Đã sao lưu và xóa riêng khóa installationId bị sao chép trên máy đang ở màn đăng nhập; app tạo UUID mới khi người dùng đăng nhập lại. Không xóa dữ liệu AVD/app, không thay đổi chính sách xác thực. Kiểm chứng cuối: hai device binding và hai tài khoản riêng đều đang hoạt động.

### Địa chỉ WebSocket không tương thích React Native

`useSessionViewModel` dùng `new URL('/ws', baseUrl)` rồi gán `protocol`. URL trong phiên bản React Native đang cài không có protocol setter; cách xử lý relative URL cũng giữ đường dẫn API trong base URL. Lỗi bị cơ chế reconnect bắt lại, nên REST/polling hoạt động nhưng socket không mở.

Đã thêm `src/auth/realtimeUrl.ts`: đọc origin từ URL tuyệt đối và tạo `ws://<origin>/ws` hoặc `wss://<origin>/ws`. Không thay transport STOMP, headers xác thực, API hoặc backend. Regression test chạy cả URL chuẩn và implementation URL thật từ React Native đang cài, gồm host/port, HTTPS, IPv6, API path, query/fragment và cấu hình không hợp lệ.

### Bàn phím che ô nhập và nút gửi

Màn chat dùng KeyboardAvoidingView chỉ bật trên iOS. Trên hai AVD hiện tại, composer có thể nằm sau bàn phím Android.

Đã bật behavior `height` trên Android, giữ `padding` trên iOS và truyền top safe-area inset làm keyboardVerticalOffset. Áp dụng chung cho chat cá nhân và nhóm. Sau cold restart, máy B mở bàn phím thật: nút gửi nằm phía trên bàn phím và gửi tin nhóm thành công. Các tùy chọn bàn phím/chế độ máy bay thay đổi để kiểm tra đã được trả về giá trị trước đó.

## Kết quả UI và PostgreSQL

| Ca | Kết quả |
| --- | --- |
| Hai tài khoản trên hai mã cài đặt độc lập | Đạt, không còn đổi binding chéo |
| Quét ảnh QR, gửi và chấp nhận lời mời kết bạn | Đạt |
| Chat cá nhân gửi/nhận hai chiều | Đạt; sau sửa socket, quan sát tin trên máy nhận sau khoảng 2,1 giây, gồm thời gian dump UI |
| Presence trên cả hai máy | Đạt, cùng hiện Đang hoạt động khi foreground và socket đã nối |
| Badge tin chưa đọc trong tab Tất cả | Đạt |
| Mở lại cuộc trò chuyện để đọc tin chưa đọc | Đạt, badge được xóa |
| Đưa máy nhận về Home Android rồi mở lại | Đạt, nhận đủ tin gửi lúc background |
| Force-stop và mở lại app máy B | Đạt, khôi phục phiên và lịch sử |
| Máy B mất mạng, gửi lỗi, bật mạng và thử gửi lại | Đạt, có nút thử lại và tin tới máy A |
| Đối chiếu dữ liệu chống trùng sau các thao tác | Đạt, mỗi payload QA có đúng một bản trong database |
| Tạo nhóm hai thành viên | Đạt |
| Chat nhóm gửi/nhận hai chiều | Đạt |
| Gửi tin nhóm khi bàn phím Android vẫn mở | Đạt sau sửa và cold restart |
| Tự cập nhật mốc đã đọc cho tin mới khi màn chat đang mở | Chưa đạt ổn định, xem vấn đề còn lại |

13 ca đạt; 1 ca còn vấn đề. Không coi gửi/nhận thành công là toàn bộ chat đã hoàn tất.

Log broker lúc 18:57:43 UTC ghi nhận `2 current WS`, CONNECT/CONNECTED đều 16. Đây là bằng chứng socket đã mở sau sửa, cùng với presence và UI nhận tin; không chỉ dựa vào REST/polling.

## Vấn đề còn lại và bàn giao cho teammate chat

Tin mới hiển thị trên màn đang mở nhưng mốc đọc có thể giữ giá trị cũ. Đã quan sát cả chat cá nhân và nhóm. Ví dụ nhóm có `last_seq=4`, cả hai `read_seq=2` dù tin mới đã hiển thị; sau quay về danh sách và mở lại nhóm, cả hai `read_seq=4`.

Cần điều tra phối hợp giữa FlatList viewability trong `DirectConversationScreen`, `thread.afterSeq`, callback `readVisible` trong hai hook messaging và giới hạn catch-up trong `DirectMessagingSession.read`. Chưa khẳng định nguyên nhân. Không sửa bằng cách đánh dấu toàn bộ lastSeq đã đọc vì có thể bao gồm tin chưa xem hoặc khoảng trống chưa tải. Thử buộc recordInteraction sau scrollToOffset không khắc phục kết quả thực tế nên đã gỡ thay đổi thử nghiệm đó.

Ca nghiệm thu tiếp theo: để hai màn ở cuối cuộc trò chuyện, gửi tin mới, không cuộn hoặc rời màn; sau khi tin hiển thị đủ 500 ms và REST catch-up hoàn tất, đọc lại mốc PostgreSQL. Lặp cho chat cá nhân/nhóm, rồi kiểm tra người đang đọc lịch sử cũ không bị đánh dấu tin mới là đã đọc.

Chưa kiểm tra logout/đổi tài khoản trong đợt hai tài khoản thật này, vì người dùng cần tự đăng nhập lại; chưa chạy iOS thật, APK release, tải lịch sử hơn 50 tin, thu hồi thành viên hoặc triển khai nhiều backend instance.

## Kiểm chứng code

- `npm test`: 127 ca, 127 đạt, 0 lỗi, 0 bỏ qua. Trong đó `test:messages` có 31 ca, `test:groups` có 11 ca; đây là các tập con, không cộng thêm vào tổng.
- `npm run typecheck` và `npm run format:check`: đạt.
- Hermes Android export: đạt sau thay đổi cuối; xem log local trong thư mục private.
- Không sửa backend; không chạy lại Maven và integration suite PostgreSQL riêng trong đợt này. Kết quả backend 165 ca của đợt refactor trước không được tính là lần chạy mới.
- Chưa commit/push các thay đổi QA này; dev/main không thay đổi. AndroidManifest và file cá nhân có sẵn được giữ nguyên.

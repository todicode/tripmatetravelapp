# TripMate — gói bàn giao UI sang React Native

Đây là snapshot giao diện React web hiện tại, **chưa phải component React Native**. Dùng mã và ảnh tham khảo trong gói này để port UI vào `C:\UIT\tripmatetravelapp\frontend`, kết nối với API và điều hướng hiện có của app thật.

## Nội dung

- `src/screens`: Khám phá; tạo chuyến đi; thiết lập khách sạn; lịch trình tự tạo/mẫu/đã lưu; danh sách chuyến đi; tin nhắn cá nhân/nhóm; tạo nhóm, thêm bạn, lời mời; cá nhân, sửa hồ sơ, cài đặt.
- `src/components`: bản đồ, popup, bộ cuộn ngày, loading lịch trình, thông tin địa điểm, khách sạn, bạn đồng hành, ghim lịch trình, chi phí, chuẩn bị, thanh điều hướng và các thành phần dùng chung.
- `src/store`, `src/utils`: dữ liệu mẫu, quản lý trạng thái, quy tắc ngày lưu trú, kiểm tra trùng và các bài kiểm tra logic.
- `src/context`: điều hướng demo và thông báo.
- `src/map`: cấu hình bản đồ web để đối chiếu khi thay bằng bản đồ native.
- `src/index.css`, `DESIGN.md`: màu, typography, tỉ lệ và motion.
- `public/images`: tài nguyên UI cục bộ; `references`: ảnh thiết kế tham khảo.
- `MANIFEST.json`: danh sách file và checksum của snapshot.

**Đã loại bỏ** màn hình đăng nhập/đăng ký, màn hình tạo chuyến đi web cũ không còn được dùng, HTML/JS legacy, `.git`, `node_modules`, file build và các file môi trường cá nhân. Không có API key thực tế. Bản demo mở thẳng Khám phá. Nút Đăng xuất chỉ là điểm nối với auth của app thật.

## Cách xem bản web

Trong thư mục gói: `npm install`, sau đó `npm run dev`. Có thể kiểm tra bằng `npm run build` và `npm test`. File `.env.example` chỉ chứa tên cấu hình bản đồ trống; nếu cần bản đồ, tự cấu hình khóa môi trường. Các ảnh bên ngoài vẫn dùng URL, không phải tất cả ảnh đã được tải về.

## Yêu cầu cần giữ khi port

1. Ngôn ngữ tiếng Việt; cùng bảng màu sáng/tối, lưu lựa chọn giao diện.
2. Màn hình lịch trình mới tạo và đã lưu dùng chung `SamplePlanScreen`; `TrackTripScreen` là adapter cho chuyến đi đã lưu. Giữ bản đồ 35%, phần nội dung 65%. Chi tiết địa điểm và thêm địa điểm không vượt khỏi phần dưới.
3. Tạo chuyến đi: Điểm đến → Ngày → Sở thích → Nơi nghỉ → Cách lên lịch. Khách sạn → ngày nhận/trả dạng wheel → giờ và ghi chú tùy chọn → danh sách nơi nghỉ. Thêm khách sạn chỉ khi còn đêm chưa phủ; không được trùng đêm lưu trú.
4. Tổng quan: đặt mỗi khách sạn ngay trước ngày nhận phòng, hàng gọn gồm icon giường, tên, số đêm và khoảng cách 16px trước ngày. Chuyến đi chưa có khách sạn có nút thêm.
5. AI: popup ghi chú tùy chọn; khóa nút tiếp tục nếu ghi chú trống/chỉ khoảng trắng; vẫn cho bỏ qua. Loading hiện là mô phỏng khoảng 3 giây, kết quả là mẫu có sẵn. Khi nối AI thật phải dùng trạng thái request thực, lỗi/thử lại/hủy, không giữ timer giả.
6. Bạn đồng hành: hiển thị tên/avatar/số lượng, thêm/xóa và chặn trùng. Bản demo chưa gửi lời mời thật.
7. Chat: avatar người gửi mở hồ sơ, ghim lịch trình do người dùng chọn, mặc định không ghim. Tin nhắn, người dùng và trạng thái trực tuyến hiện là mẫu.
8. Popup có animation mở/đóng, focus không làm cuộn nền, khóa cuộn nền và hỗ trợ giảm chuyển động. Port nguyên tắc tương tác, không copy DOM listeners sang native.

## Phần cần thay khi tích hợp native

| Web hiện tại | Thay bằng trong React Native |
|---|---|
| HTML/Tailwind/CSS | View/Text/Pressable/Image và StyleSheet hoặc hệ thống style của app |
| Leaflet, DOM refs, window/document | Bản đồ và API native phù hợp dự án |
| CSS animation, mouse/wheel listeners | Animation và gesture native; vẫn hỗ trợ giảm chuyển động |
| Popup absolute, focus trap HTML | Modal/bottom sheet và accessibility native |
| localStorage | Storage của app; profile/auth lấy từ backend thật |
| NavContext và URL hash | Điều hướng hiện có của app |
| TripsStore in-memory | API/service thật, giữ cấu trúc dữ liệu và quy tắc đã chốt |
| Lịch trình/di chuyển mẫu | AI, dữ liệu địa điểm và định tuyến thật |

Không ghi đè auth hoặc backend đang có của app thật. Chi phí/chuẩn bị, chat, lời mời, bản đồ, tìm kiếm và hồ sơ cần đối chiếu với service hiện có. Dữ liệu chuyến đi trong demo chỉ ở bộ nhớ, không bền vững sau reload; các tùy chọn theme/profile/saved places dùng localStorage. Các bài test logic có thể tái sử dụng sau khi đổi adapter storage.

Gói đã được kiểm tra build web và test logic. Chưa xác nhận trực tiếp mọi bố cục/gesture trên trình duyệt hoặc thiết bị native.

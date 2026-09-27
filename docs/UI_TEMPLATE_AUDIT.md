# Đối chiếu giao diện React Native với template_gui

Nguồn chuẩn: `template_gui/README.md`, `DESIGN.md`, `src/index.css`, toàn bộ `src/screens` và `src/components`. Không chỉnh sửa template trong đợt đối chiếu này. Chưa commit.

## Màn hình

| Template | React Native | Những phần đã đối chiếu / khôi phục |
| --- | --- | --- |
| ExploreScreen | ExploreScreen | Bản đồ 50%, panel 50%, hai nút bản đồ, kéo thu panel, filter, tìm kiếm inline, ảnh hero gốc, popup thêm địa điểm, danh sách mở rộng, gần bạn 50 km |
| TripSetupScreen | trips/TripSetupScreen | Accordion, tìm/nhập điểm đến, lịch, wheel 30 ngày, lưới sở thích, ba lựa chọn nơi nghỉ, SVG và hai lựa chọn cách lên lịch, popup lời nhắn AI |
| HotelSetupScreen | trips/HotelSetupScreen | Tách tìm khách sạn → wheel ngày → giờ/ghi chú tùy chọn → tổng kết, thẻ khách sạn và footer |
| ManualPlannerScreen | trips/ManualPlannerScreen | Màn hình riêng, bản đồ 176, tab ngày, timeline, giờ đến, ghi chú, chuyển ngày, đổi thứ tự, xóa, footer lưu |
| SamplePlanScreen | trips/SamplePlanScreen | Bản đồ 35% / panel 65%, header, avatar thành viên, tổng quan ảnh ngang, chi tiết từng ngày, khách sạn trước ngày nhận phòng, footer ngày đi |
| TrackTripScreen | trips/TrackTripScreen | Adapter dùng chung SamplePlan, không thay bằng bố cục riêng |
| ManageTripsScreen | trips/ManageTripsScreen | Header/subtitle, bộ lọc, ảnh 176, nhãn thời lượng, tên thành phố, thông tin chuyến đi và trạng thái rỗng |
| ChatListScreen | chat/ChatListScreen | Header 20/subtitle 14, nút cộng 44, menu, tìm kiếm, tabs, avatar, hàng hội thoại và thời gian |
| FriendChatScreen | chat/ConversationScreen | Header/call buttons, thẻ ghim, bubble 18, avatar người gửi 32, input/send 44, hồ sơ người chat và chọn lịch trình |
| GroupChatScreen | chat/ConversationScreen | Header nhóm, mời thành viên, tên người gửi, thẻ ghim và các popup dùng chung |
| CreateGroupScreen | chat/CreateGroupScreen | Ba thẻ riêng có viền: tên nhóm, liên kết chuyến đi mặc định tắt, chọn thành viên; nút tạo trên header |
| AddFriendScreen | chat/AddFriendScreen | Ba hàng thao tác, tên/email, khung QR cá nhân, popup số điện thoại và khung quét QR |
| FriendRequestsScreen | chat/FriendRequestsScreen | Header/subtitle, tabs, thẻ người dùng, hai nút đồng ý/từ chối đủ chữ, thu hồi lời mời |
| ProfileScreen | ProfileScreen | Thẻ user ở giữa, đúng ba menu, badge theo dữ liệu, một nút đăng xuất có icon; bỏ thống kê/menu tự thêm |
| EditProfileScreen | EditProfileScreen | Avatar 80 và camera 32, nút đổi ảnh, thẻ tên/email, nút lưu |
| SettingsScreen | SettingsScreen | Thẻ giao diện sáng/tối, switch thông báo, accordion riêng tư; giữ đường dẫn đổi mật khẩu thật |

## Component dùng chung

- `ScreenHeader`, `BottomNav`, `CreateMenu`, `FilterPills`: màu theo palette gốc, font/khoảng cách/kích thước nút, menu nổi ba hàng 80 và nút đóng 44.
- `StablePopup`, `SavedListDialog`: bo góc 18, handle, scrim, scroll và safe area; popup danh sách có chiều cao theo nội dung tối đa 85%, nút lưu ngoài phần cuộn. Modal native khóa tương tác nền và hỗ trợ nút back. Reduced motion theo AccessibilityInfo.
- `PlaceDetailsSheet`, `PlannerPlacePicker`: ảnh, giới thiệu, ghi chú, nguồn, giờ/địa chỉ/điện thoại, lưu/chỉ đường; popup trong chuyến đi nằm trong phần dưới 65% bản đồ. Picker có ảnh/icon, hàng 80, trạng thái đã chọn.
- `PlannerMap`, `TripDatePicker`, `HotelDayWheel`, `HotelStaySummary`: bản đồ thật, marker, chọn ngày, wheel 56/168, thẻ nơi nghỉ đúng thứ tự, kiểm tra đêm không chồng nhau.
- `TripMembers`: avatar/count, thêm/xóa/tìm, chống tên trùng; không gửi lời mời giả.
- `TripUtilities`: hai popup chi phí/checklist, thẻ tổng, form thêm và danh sách; bỏ thẻ quản lý thành viên và phần trăm checklist tự thêm trước đây.
- `ChatTripPin`, `ChatPersonProfile`: chọn/tìm lịch trình, thẻ ghim 64 và đổi/bỏ ghim, hồ sơ có avatar lớn và phần giới thiệu.
- `HorizontalScroll`: chuyển thành ScrollView ngang; `StatusBar` dùng native; Toast đã chuyển sang native với thẻ đen, text và thời gian 2400 ms theo template; hộp thoại lỗi/xác nhận vẫn dùng native Alert. Chuyển màn hình và mở accordion có animation, tắt theo reduced motion.

## Các khác biệt có chủ đích

- Theo yêu cầu người dùng, Chuyến đi không có nút “Tạo mới” hoặc “Tạo chuyến đi đầu tiên”; hướng dẫn sử dụng dấu **+** ở navigation.
- Không sao chép dữ liệu người dùng, tin nhắn, khách sạn, đánh giá, trạng thái online hoặc QR mẫu từ template. Các khung giao diện vẫn được giữ; dữ liệu thiếu hiển thị trạng thái chưa có/chưa khả dụng.
- AI, cập nhật hồ sơ, kết bạn, QR và cuộc gọi chưa có backend tương ứng. Không mô phỏng thành công và không chạy timer 3 giây sinh chuyến đi giả của template. Đăng nhập, đăng xuất, quên mật khẩu và đổi mật khẩu tiếp tục sử dụng API hiện có.
- Trường tên/email hồ sơ hiện chỉ đọc từ tài khoản thật; không sửa email đăng nhập bằng local storage. Chuyến đi/nhóm đang dùng dữ liệu phiên hiện tại, địa điểm và tùy chọn giao diện lưu trên thiết bị.
- Icon dùng thư viện native hiện có; font theo hệ điều hành như font stack của template. Leaflet trong WebView giữ nguồn bản đồ/đường bộ thật.

## Bằng chứng kiểm tra

- `npm run typecheck`: qua.
- `node scripts/check-trips.cjs`: qua; gồm ngày, nơi nghỉ, trùng địa điểm/thành viên, chuyển/sắp xếp điểm, chi phí, dữ liệu lưu, cache đường bộ và GPS.
- `node scripts/check-chat.cjs`: qua; gồm cô lập tin nhắn, nhập rỗng, ID, thành viên và ghim chuyến đi.
- `npx expo export --platform android --output-dir .expo/template-audit-check`: qua.
- Không thay đổi mã backend hoặc hợp đồng API trong đợt sửa giao diện.

Đây là đối chiếu mã và bundle, **chưa phải xác nhận khớp từng pixel trên thiết bị**. Chưa có thiết bị/emulator kết nối để chụp và đối chiếu tất cả trạng thái sáng/tối, bàn phím, màn hình nhỏ và cử chỉ thực tế. Native dependency mới yêu cầu build lại bằng `npm run android`.

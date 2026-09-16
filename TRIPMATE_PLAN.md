# Kế hoạch TripMate mở rộng đến ngày 15/12/2026

## 1. Mục tiêu và phạm vi đã chốt

Bản này thay thế kế hoạch trước, bổ sung **kết bạn qua QR, push notification, avatar và gửi ảnh/PDF trong chat**.

Hai thành viên dành **20 giờ/người/tuần**, tương đương khoảng **520 giờ công trong 13 tuần**. Hai AI hỗ trợ theo hai phần backend và mobile; thời gian review, tích hợp, kiểm thử và chuẩn bị vấn đáp vẫn nằm trong 520 giờ của nhóm.

Phần tính năng bổ sung dự kiến cần khoảng **70–110 giờ công**, sử dụng phần lớn trong 130 giờ tăng thêm so với kế hoạch cũ. Đây là ước lượng lập kế hoạch, cần cập nhật bằng giờ thực tế sau mỗi tuần.

Các điều kiện giữ nguyên:

- Bàn giao APK Android, backend trên hai VPS, báo cáo Word/PDF, PowerPoint và video demo.
- Mỗi chuyến chọn một thành phố tại Việt Nam, kéo dài 1–5 ngày, tối đa 10 thành viên.
- Kiểm thử kỹ Hà Nội, Đà Nẵng và TP.HCM.
- Mọi thành viên được sửa lịch trình; owner quản lý chuyến đi và thành viên.
- Chia sẻ vị trí khi app đang mở và người dùng chủ động bật.
- Tổng ngân sách dưới 500.000 đồng; thuê VPS trong tháng cuối.
- Dùng 11 mục giảng viên cung cấp làm danh mục nội dung báo cáo và bằng chứng.

### Tính năng của bản báo cáo

| Nhóm                  | Phạm vi triển khai                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tài khoản            | Đăng ký, đăng nhập, refresh token, đăng xuất, sửa tên/sở thích và avatar                        |
| Bạn bè               | QR cá nhân, quét QR, gửi/nhận lời mời, chấp nhận/từ chối, hủy lời mời và hủy kết bạn        |
| Chuyến đi            | Tạo/sửa/xóa, ngày đi/về, thành phố, ngân sách dự kiến, thành viên                               |
| Mời thành viên      | Mời từ danh sách bạn bè hoặc tham gia bằng mã chuyến đi                                             |
| Địa điểm           | Tìm kiếm, thông tin chi tiết, tìm quanh một vị trí, lưu địa điểm và marker                      |
| Lịch trình           | Tạo thủ công, chỉnh thời gian/ngày, sắp thứ tự, ghi chú và xử lý sửa trùng                     |
| AI                     | Sinh bản nháp từ địa điểm thật, xem trước, áp dụng và tạo lại toàn lịch trình               |
| Tuyến đường        | Tuyến đi bộ/ô tô theo từng ngày, quãng đường và thời gian dự kiến                              |
| Chat trong chuyến đi | Văn bản, ảnh, PDF, lịch sử, trạng thái gửi lỗi và thử lại                                         |
| Push notification      | Lời mời kết bạn, chấp nhận kết bạn, lời mời chuyến đi, tin nhắn mới và lịch trình thay đổi |
| Vị trí thành viên  | Bật/tắt chia sẻ, cập nhật realtime, thời điểm cập nhật và tự hết hạn                            |

**Hoãn sau báo cáo:** kết bạn bằng số điện thoại/OTP, chat riêng giữa hai người, kho tài liệu riêng, Word/Excel/video trong chat, booking/thanh toán, chia tiền, nhập link mạng xã hội, theo dõi vị trí nền và chuyến đi qua nhiều thành phố.

Ngân sách chuyến đi là mức dự kiến. Giá thiếu nguồn xác minh được hiển thị là chưa xác định; kết quả AI không được trình bày như báo giá chắc chắn.

### Giao diện

- Điều hướng chính: **Chuyến đi — Bạn bè — Hồ sơ**.
- Trong chuyến đi: **Tổng quan — Lịch trình — Bản đồ — Chat**.
- Bạn bè có danh sách bạn, lời mời và nút mở/quét QR.
- Hồ sơ có thay avatar và QR cá nhân.
- Biểu tượng thông báo mở danh sách thông báo gần đây.
- Chat có nút đính kèm ảnh/PDF, tiến trình tải lên và nút thử lại.
- Các màn hình có trạng thái tải, trống, lỗi và thử lại thống nhất.
- Khi đang xem đúng phòng chat, tin nhắn mới cập nhật tại chỗ và không hiện thêm banner hệ thống.

## 2. Kiến trúc và các quyết định triển khai

### Công nghệ

| Thành phần      | Lựa chọn                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Mobile            | React Native, TypeScript, Expo development build, Expo Router            |
| State             | TanStack Query cho dữ liệu server; Zustand cho trạng thái giao diện |
| Map               | `react-native-maps`, Google Maps SDK                                   |
| QR và chọn tệp | `expo-camera`, `expo-image-picker`, `expo-document-picker`         |
| Push trên mobile | `expo-notifications`, lấy native FCM token                            |
| Backend           | Java 26, Spring Boot 4.1, Maven, Spring Security, JPA, Flyway            |
| Database          | PostgreSQL                                                               |
| Realtime          | Spring WebSocket/STOMP và Redis Pub/Sub                                 |
| Lưu tệp         | Cloudflare R2 Standard, bucket riêng tư, truy cập qua S3 API          |
| Push backend      | Firebase Admin SDK gửi trực tiếp qua FCM                              |
| AI                | Groq Free qua adapter HTTP; model cấu hình bằng biến môi trường   |
| Triển khai       | Docker Compose, Nginx, GitHub Actions, GHCR                              |
| Theo dõi         | Actuator, Prometheus, Grafana                                            |

Giữ monorepo tại `D:\travelapp`, gồm `backend` và `frontend`. Khóa phiên bản thư viện sau khi dựng bộ khung; kiểm chứng model AI bằng thử nghiệm tiếng Việt/JSON ở tuần 2.

Expo hỗ trợ lấy native device token để backend gửi trực tiếp qua FCM. Kiểm thử push bằng development build và APK release. [Tài liệu Expo về FCM](https://docs.expo.dev/push-notifications/sending-notifications-custom/)

### Lý do lựa chọn

Xem [TECHNOLOGY_DECISIONS.md](docs/TECHNOLOGY_DECISIONS.md) để hiểu vai trò của từng công nghệ, lý do phù hợp với nhóm hai người, đánh đổi và cách kiểm chứng trước khi chốt phiên bản. Đây là quyết định thiết kế; backend/mobile chưa được triển khai.

### Bố trí hạ tầng

| Nơi chạy      | Thành phần                          |
| --------------- | ------------------------------------- |
| VPS 1, 2 GB RAM | Nginx, backend 1, Prometheus, Grafana |
| VPS 2, 2 GB RAM | Backend 2, PostgreSQL, Redis          |
| Cloudflare R2   | Avatar, ảnh chat, PDF và thumbnail  |
| FCM             | Chuyển thông báo đến Android     |

Hai VPS kết nối bằng WireGuard. PostgreSQL/Redis chỉ nhận kết nối nội bộ; dashboard truy cập qua đường quản trị.

Bắt đầu với JVM heap 384 MB/backend và metrics giữ 7 ngày; điều chỉnh theo số đo bộ nhớ. Không thêm MinIO hoặc PostGIS trong bản báo cáo.

Kiến trúc này chịu được lỗi một **tiến trình backend**. Nginx và database vẫn là điểm lỗi đơn; đây là giới hạn phải giải thích trong vấn đáp.

### Kết bạn bằng QR

Luồng chính:

1. Người dùng mở QR cá nhân.
2. Người khác quét QR.
3. App hiển thị tên và avatar để xác nhận đúng người.
4. Người quét gửi lời mời.
5. Người nhận chấp nhận hoặc từ chối.

Quy tắc:

- QR chứa mã kết bạn công khai của ứng dụng, không chứa mật khẩu hoặc token đăng nhập.
- Có cách nhập mã kết bạn khi không cấp quyền camera.
- Quét QR chỉ mở hồ sơ giới hạn; không tự động kết bạn.
- Không tự kết bạn với chính mình hoặc tạo nhiều lời mời đang chờ giữa cùng hai người.
- Khi hai người cùng gửi lời mời, hiển thị lời mời đã tồn tại để người nhận xử lý.
- Kết bạn không tự cấp quyền xem chuyến đi, tin nhắn hoặc vị trí.
- Owner có thể gửi lời mời vào chuyến đi cho bạn bè; người nhận phải chấp nhận.
- Hủy kết bạn không tự xóa tư cách thành viên trong những chuyến đi đã tham gia.

### Avatar, ảnh chat và PDF

**Giới hạn bản đầu:**

- Avatar: ảnh JPEG/PNG/WebP, chuẩn hóa kích thước trước khi lưu.
- Chat: ảnh JPEG/PNG/WebP và PDF, tối đa **10 MB/tệp**.
- Mỗi tin nhắn đính kèm tối đa một tệp, có thể có chú thích.
- Ảnh hiển thị thumbnail và mở xem lớn.
- PDF tải về vùng cache và mở bằng ứng dụng đọc PDF trên thiết bị.
- Chưa có album, kho tài liệu riêng hoặc sửa nội dung tệp.

Dùng một module `Media` chung:

1. Mobile chọn/chụp ảnh hoặc chọn PDF.
2. Mobile nén ảnh trước khi gửi.
3. Backend xác thực người dùng, kiểm tra quyền và giới hạn kích thước.
4. Backend kiểm tra định dạng thực tế, chuẩn hóa ảnh và lưu vào R2.
5. Backend trả `mediaId`.
6. Mobile dùng `mediaId` để cập nhật avatar hoặc gửi tin nhắn.

Database lưu metadata; không lưu binary hoặc URL công khai cố định. Tải tệp qua backend có kiểm tra quyền, rồi backend stream từ R2.

Các hành vi cần có:

- Upload thất bại không tạo tin nhắn trống.
- Gửi lại cùng `clientMessageId` không tạo tin nhắn trùng.
- Không được gắn tệp của chuyến đi khác vào tin nhắn.
- Thành viên đã rời/bị loại không được tải lại tệp của chuyến đi.
- Tệp chưa được gắn vào avatar/tin nhắn được dọn sau 24 giờ.
- Người gửi hoặc owner được xóa tệp đính kèm; lịch sử chat hiển thị trạng thái đã xóa.
- Giới hạn dữ liệu toàn dự án ở **2 GB**, tính cả tệp chờ và thumbnail, để có khoảng cách với hạn mức miễn phí.

R2 Standard hiện có hạn mức miễn phí 10 GB-tháng cùng hạn mức thao tác đọc/ghi; chỉ dùng lớp Standard. [Giá Cloudflare R2](https://developers.cloudflare.com/r2/pricing/)

### Push notification

FCM gửi thông báo cho:

- Lời mời kết bạn và kết quả chấp nhận.
- Lời mời tham gia chuyến đi.
- Tin nhắn văn bản, ảnh hoặc PDF mới.
- Lịch trình vừa được cập nhật.

Thiết kế:

- App xin quyền thông báo, tạo Android notification channel và đăng ký FCM token với backend.
- Mỗi token gắn với tài khoản và lần cài đặt; cập nhật khi token đổi, hủy liên kết khi đăng xuất.
- Lưu thông báo trong PostgreSQL để người dùng vẫn xem được nếu push không đến.
- Ghi tác vụ gửi push vào **outbox trong cùng transaction** với thay đổi nghiệp vụ.
- Hai backend dùng cơ chế claim tác vụ trong database để tránh cùng xử lý một tác vụ.
- Retry có giới hạn cho lỗi tạm thời; token không còn hợp lệ bị loại bỏ.
- Push chứa ID để điều hướng; app tải lại dữ liệu và kiểm tra quyền khi người dùng chạm thông báo.
- Không gửi nội dung tệp, URL tải riêng tư hoặc vị trí trực tiếp trong payload.
- Có tùy chọn tắt thông báo chat/lịch trình theo chuyến đi.
- Không gửi push cho chính người vừa tạo hành động.

Việc FCM chấp nhận yêu cầu chưa chứng minh điện thoại đã hiển thị thông báo. Nghiệm thu phải quan sát thiết bị ở trạng thái mở app, chạy nền và mở lại từ thông báo.

### API và dữ liệu

REST dùng `/api/v1`, tài liệu bằng OpenAPI; realtime dùng `/ws`.

| Nhóm        | Giao tiếp/dữ liệu chính                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| Tài khoản  | Auth, refresh token, profile,`avatarMediaId`                                       |
| Bạn bè     | Hồ sơ theo mã QR,`FriendRequest`, `Friendship`, chấp nhận/từ chối/hủy    |
| Chuyến đi  | Trip, membership, mã mời và lời mời theo người nhận                          |
| Lịch trình | `Itinerary`, `ItineraryItem`, `version`, bản nháp AI                         |
| Chat         | `ChatMessage` loại `TEXT`, `IMAGE`, `PDF`; `clientMessageId`, `mediaId` |
| Media        | Upload, đọc/xóa tệp; trạng thái chờ/sẵn sàng/đã xóa và quyền sở hữu  |
| Push         | Device token, notification, trạng thái đã đọc và outbox                       |
| Vị trí     | Snapshot ngắn hạn theo chuyến đi/thành viên                                    |

Các quy tắc nền tảng:

- Cập nhật lịch gửi `expectedVersion`; phiên bản cũ nhận `409`, không âm thầm ghi đè.
- AI tạo bản nháp; áp dụng phải kiểm tra lại version.
- Chat lưu PostgreSQL trước, sau đó phát sự kiện qua Redis/WebSocket.
- Client tải bù chat sau reconnect hoặc mở lại phòng; không dùng Redis Pub/Sub làm lịch sử.
- Quyền được kiểm tra ở cả REST và WebSocket đang mở.
- Vị trí dùng Redis key riêng cho từng người trong chuyến đi, cập nhật khoảng 10 giây và hết hạn sau 60 giây.
- UTC cho thời điểm hệ thống, `Asia/Ho_Chi_Minh` cho ngày/giờ chuyến đi, số nguyên VND cho tiền.

AI tiếp tục dùng luồng: yêu cầu người dùng → candidate places thật → LLM tạo JSON → backend kiểm tra địa điểm, lịch và thời gian di chuyển → xem trước → áp dụng. Timeout 45 giây; lỗi provider vẫn cho chỉnh lịch thủ công.

Lưu lâu dài `place_id` và dữ liệu do người dùng tạo; dữ liệu Google khác tuân thủ chính sách từng API. [Chính sách Places](https://developers.google.com/maps/documentation/places/web-service/policies)

## 3. Timeline và phân công

**A:** backend/infra. **B:** mobile/product. Mỗi tuần dự kiến **20 giờ/người**, đã gồm học, code, review, kiểm thử và tài liệu.

| Tuần                        | A — Backend/Infra                                                                          | B — Mobile/Product                                                            | Nghiệm thu cuối tuần                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **1 · 14–20/09**     | Spring skeleton, PostgreSQL, Flyway, API mẫu, CI; thiết kế schema và API contract       | Expo, TypeScript, navigation, giao diện nền, gọi API                        | Cả hai chạy được dự án; mobile nhận dữ liệu backend                                  |
| **2 · 21–27/09**     | Auth/refresh token; thử R2, FCM, Places và AI bằng yêu cầu nhỏ                        | Auth UI, lưu phiên; development build; thử map, push và camera QR          | Đăng nhập được; các tích hợp có rủi ro đã được thử trên thiết bị           |
| **3 · 28/09–04/10**  | Friend request/friendship, mã QR, CRUD trip                                                | Bạn bè, QR cá nhân/quét QR, danh sách và form chuyến đi               | Hai tài khoản kết bạn qua QR và tạo chuyến đi                                          |
| **4 · 05–11/10**     | Thành viên/lời mời; Places/saved places; hoàn thiện module Media và avatar           | Mời bạn vào trip, map/search/detail, upload avatar                          | Bạn bè tham gia cùng trip; tìm/lưu địa điểm ở ba thành phố; avatar lưu bền vững |
| **5 · 12–18/10**     | Lịch trình thủ công, validation ngày/giờ, version và test quyền                     | Lịch theo ngày, chỉnh sửa/sắp thứ tự, xử lý`409`                    | **Core hoàn chỉnh**, dùng được khi AI chưa hoạt động                           |
| **6 · 19–25/10**     | AI adapter, candidate set, JSON validation, draft/apply                                     | Form AI, trạng thái chờ, xem trước, áp dụng và thử lại               | Sinh được lịch từ địa điểm thật, không làm hỏng lịch đang có                   |
| **7 · 26/10–01/11**  | Routes, thời gian di chuyển, đánh giá AI đa thành phố                               | Polyline theo ngày, quãng đường/thời gian; hoàn thiện trải nghiệm AI | Luồng AI → lịch → map chạy tại ba thành phố                                            |
| **8 · 02–08/11**     | Chat, lưu lịch sử, chống gửi trùng, Redis bridge, liên kết media; outbox nền tảng | Chat chữ/ảnh/PDF, thumbnail, mở tệp, tiến trình upload và reconnect     | Hai client qua hai backend local chat được chữ/ảnh/PDF và tải bù lịch sử             |
| **9 · 09–15/11**     | Vị trí TTL, thu hồi quyền; hoàn thiện push/outbox/retry; chuẩn bị deploy            | Live map, quyền vị trí; notification list, token, deep link và mute trip   | Toàn bộ tính năng chạy local; push được kiểm thử khi app ở nền                     |
| **10 · 16–22/11**    | Thuê VPS, WireGuard, HTTPS, CD, backup và monitoring                                      | APK release, test server thật, sửa UX và quyền Android                     | **Đủ tính năng trên hai VPS; đóng phạm vi ngày 22/11**                          |
| **11 · 23–29/11**    | Test quyền tệp, outbox, mất mạng, failover, restore/rollback và tải nhẹ              | Test hai thiết bị, mạng yếu, QR/push/upload lỗi; tổ chức dùng thử     | Release candidate; hoàn thành đánh giá AI và phản hồi sử dụng                        |
| **12 · 30/11–06/12** | Báo cáo kiến trúc/API/dữ liệu/test, runbook và bằng chứng kỹ thuật               | Ảnh giao diện, nội dung UX, slide và video demo                            | **Word/PDF, PPTX, video và gói demo hoàn chỉnh**                                     |
| **13 · 07–13/12**    | Tập vấn đáp backend/AI/realtime/storage; sửa lỗi cuối                                | Tập thuyết trình và demo; kiểm tra APK/video/thiết bị; sửa lỗi cuối  | Hai lần tổng duyệt; gói cuối được kiểm tra trên máy khác                           |
| **14/12**              | Cùng kiểm tra server, backup và dữ liệu demo                                           | Cùng kiểm tra slide, video, APK và mạng dự phòng                         | Chỉ xử lý lỗi chặn demo                                                                   |
| **15/12**              | Thuyết trình, demo và vấn đáp                                                         | Thuyết trình, demo và vấn đáp                                            | Báo cáo dự án                                                                              |

### Cách sử dụng hai AI

- A dùng AI hỗ trợ backend; B dùng AI hỗ trợ mobile.
- Chốt API và hành vi trước khi hai phía cùng triển khai.
- Mỗi task gồm mục tiêu, đầu vào/đầu ra, quyền truy cập, trường hợp lỗi và tiêu chí nghiệm thu.
- Giao task nhỏ, có thể review và kiểm thử trong một buổi.
- Người phụ trách phải đọc được code, giải thích luồng và kiểm chứng kết quả.
- Không đưa credentials, dữ liệu cá nhân hoặc tệp riêng tư vào prompt.
- Tích hợp và demo chung hằng tuần; cập nhật contract khi thay đổi.

Hai tuần đầu dành khoảng 6 giờ/người/tuần cho học có mục tiêu trong tổng 20 giờ. Từ tuần 3, tăng thời gian tích hợp và kiểm thử.

Tỷ lệ đóng góp **kế hoạch 50%–50%**. Cuối kỳ thống nhất lại theo đầu việc được nghiệm thu, giờ thực tế và bằng chứng PR/test/tài liệu. Mỗi tuần ghi cả vấn đề gặp phải, cách xử lý và kết quả kiểm chứng.

## 4. Kiểm thử, vận hành và ngân sách

### Bộ kiểm thử bắt buộc

| Nhóm        | Tình huống phải kiểm tra                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Auth         | Phiên hết hạn, refresh token, đăng xuất, đổi tài khoản trên cùng thiết bị                                |
| QR/bạn bè  | QR sai, từ chối camera, quét chính mình, lời mời trùng/hai chiều, chấp nhận/từ chối/hủy                  |
| Thành viên | Người ngoài nhóm bị chặn; thành viên bị loại mất quyền REST, WebSocket và tệp                            |
| Lịch trình | Hai người sửa cùng version; AI draft cũ không được ghi đè bản mới                                         |
| AI           | 30 yêu cầu chia đều ba thành phố; chuyến 1/3/5 ngày, ít di chuyển, dữ liệu thiếu và lỗi provider        |
| Upload       | Tệp quá 10 MB, định dạng giả, mất mạng, hủy chọn, upload thành công nhưng gửi chat thất bại            |
| Chat media   | Retry không trùng tin; media sai trip bị chặn; ảnh/PDF bị xóa có trạng thái rõ ràng                        |
| Push         | Foreground/background, từ chối quyền, token đổi/hết hiệu lực, logout, mute trip, deep link sau khi mất quyền |
| Hai backend  | Hai worker không đồng thời claim một tác vụ; xử lý retry và sự kiện nhận lại                             |
| Vị trí     | Tắt GPS, mất mạng, đưa app xuống nền, tắt chia sẻ, rời trip và hết TTL                                     |
| Hạ tầng    | Dừng một backend, restore database, rollback image và kiểm tra lại media                                          |
| APK          | Cài mới và chạy trên hai thiết bị khi máy lập trình đã tắt                                                |

Mục tiêu đánh giá:

- Mọi lịch AI được phép áp dụng đều qua validator.
- Ít nhất 24/30 ca AI tạo lịch dùng được mà không phải sửa lớn.
- REST core p95 dưới 1 giây, chat thông thường nhận trong 2 giây, vị trí cập nhật trong 15 giây khi mạng ổn định.
- Thử tải 20 người dùng trong 10 phút, dùng provider giả để không tốn quota.
- Ít nhất 5 người dùng thử; ghi tỷ lệ hoàn thành và các điểm gây nhầm lẫn.
- Báo cáo dùng số đo thực tế và nêu điều kiện đo.

### CI/CD và vận hành

- PR: TypeScript/lint, test và build phù hợp từng phần.
- Merge `main`: build image theo commit SHA, đẩy GHCR, deploy từng backend.
- Health check từng instance trước khi kiểm tra qua Nginx.
- Migration Flyway chạy có kiểm soát; ưu tiên thay đổi bổ sung để rollback ứng dụng còn tương thích.
- Backup PostgreSQL hằng ngày và giữ bản mã hóa ngoài VPS.
- Có bản sao tệp demo và kiểm thử khôi phục liên kết database–media.
- Dashboard gồm request, lỗi, độ trễ, bộ nhớ, WebSocket, upload lỗi và tác vụ push thất bại.
- Secrets đặt trong môi trường/GitHub Secrets; không ghi token, tọa độ hoặc nội dung tệp vào log.

### Dự toán

| Khoản                                          |                       Dự toán |
| ----------------------------------------------- | ------------------------------: |
| Hai VPS 2 GB trong 30 ngày, 16/11–16/12       | **427.680 đồng** |
| DuckDNS và HTTPS miễn phí                    |              **0 đồng** |
| Google APIs và Groq trong hạn mức miễn phí |    Mục tiêu**0 đồng** |
| R2 Standard trong hạn mức miễn phí          |    Mục tiêu**0 đồng** |
| FCM                                             |              **0 đồng** |
| Dự phòng                                      |         **60.000 đồng** |
| **Tổng dự toán**                       |        **487.680 đồng** |

Đối chiếu bảng giá ngày **17/09/2026**: gói VPS 1, 2 GB RAM niêm yết **275 đồng/giờ**, chưa gồm VAT 8%. Hai VPS chạy đủ 30 ngày: `2 × 275 × 24 × 30 = 396.000 đồng`; cộng VAT theo bảng giá thành **427.680 đồng**. Cộng dự phòng 60.000 đồng, tổng **487.680 đồng**, còn **12.320 đồng** dưới trần 500.000 đồng. Đây là dự toán theo giá niêm yết, chưa phải báo giá đã đặt mua; kiểm tra lại giá, VAT, nạp tối thiểu và thời gian tính phí trước khi thuê. Các dịch vụ khác phải giữ trong hạn mức dự kiến để tổng không vượt trần. [Bảng giá VPS](https://lanit.com.vn/thue-vps-theo-gio.html)

R2 cần hoàn tất thiết lập tài khoản/thanh toán để sử dụng; quota miễn phí không phải trần chi phí tự động. App giới hạn dung lượng và lượt thao tác, dọn tệp chờ và chỉ sử dụng Standard. FCM được Firebase liệt kê trong các sản phẩm không tính phí. [Giá R2](https://developers.cloudflare.com/r2/pricing/), [giá Firebase](https://firebase.google.com/pricing)

### Kiểm soát tiến độ

- Khi mốc trễ quá 3 ngày: chia nhỏ task và điều chỉnh phân bổ giờ trong tuần.
- Khi trễ quá một tuần: hoãn animation, kéo thả, lọc nâng cao và mở rộng kiểm thử ngoài ba thành phố.
- Không dùng thời gian chuẩn bị báo cáo để tiếp tục mở rộng tính năng.
- Sau 22/11 chỉ sửa lỗi, kiểm thử, hoàn thiện tài liệu và demo.
- AI, upload hoặc push lỗi đều phải có trạng thái rõ ràng; luồng chính không bị treo.
- Video dự phòng được ghi từ bản chạy thật; dữ liệu mô phỏng phải được nói rõ.

## 5. Bàn giao và chuẩn bị vấn đáp

### Các sản phẩm bàn giao

1. APK release chạy độc lập với máy lập trình.
2. Source code, README local/deploy, cấu hình mẫu, migration và runbook.
3. Báo cáo Word/PDF.
4. PowerPoint khoảng 15–18 slide.
5. Video MP4, lưu sẵn trên cả hai máy.
6. Dữ liệu demo, tài khoản thử và kịch bản khôi phục.
7. Kế hoạch Markdown tại `D:\travelapp\TRIPMATE_PLAN.md`, sử dụng toàn bộ bản cập nhật này để theo dõi và chỉnh sửa.

### Bằng chứng cho 11 mục giảng viên

| Mục                        | Nội dung cần chuẩn bị                                                             |
| --------------------------- | ------------------------------------------------------------------------------------- |
| 1. Thuyết trình/báo cáo | Word/PDF, slide, nguồn tham khảo và hình từ bản cuối                           |
| 2. Timeline/thời gian      | Kế hoạch, giờ thực tế và lý do thay đổi tiến độ                           |
| 3. Phân công/đóng góp  | Người phụ trách, kết quả nghiệm thu và tỷ lệ đã thống nhất              |
| 4. Demo                     | Kịch bản live, video và dữ liệu có thể khôi phục                             |
| 5. Tính năng              | Danh sách đã hoàn thành, luồng và giới hạn                                   |
| 6. Công nghệ              | Sơ đồ kiến trúc, vai trò từng thành phần, lý do lựa chọn                  |
| 7. Độ khó                | AI validation, sửa đồng thời, realtime, media riêng tư và push nhiều instance |
| 8. Thực tiễn              | Nhu cầu du lịch nhóm và kết quả dùng thử                                      |
| 9. Giao diện               | Luồng chính, trạng thái lỗi và cải tiến từ phản hồi                        |
| 10. Khó khăn/giải pháp  | Vấn đề thật, nguyên nhân, cách xử lý và kiểm chứng                        |
| 11. Đúc kết              | Kết quả, hạn chế, bài học và hướng phát triển                              |

### Kịch bản demo đầy đủ

1. Hai tài khoản đăng nhập, hiển thị avatar.
2. Quét QR, gửi lời mời và chấp nhận kết bạn.
3. Tạo chuyến đi, mời bạn; thiết bị còn lại nhận thông báo.
4. Tìm/lưu địa điểm và thêm một mục lịch thủ công.
5. Sinh lịch bằng AI, xem bản nháp, áp dụng và mở tuyến đường.
6. Thành viên sửa lịch; minh họa đồng bộ và một trường hợp sửa trùng.
7. Gửi tin nhắn chữ, ảnh và PDF.
8. Đưa một app xuống nền, gửi tin mới, chạm push để mở đúng phòng chat.
9. Bật/tắt chia sẻ vị trí và kiểm tra vị trí hết hạn.
10. Giới thiệu CI/CD, dashboard và khả năng kết nối lại khi dừng một backend.

Chuẩn bị bản đầy đủ 10–12 phút và bản rút gọn 5 phút. Đến 06/12 phải có video và tài liệu hoàn chỉnh; tuần cuối dành cho tổng duyệt.

Cả hai cần giải thích được: QR khác xác thực tài khoản thế nào, ai được xem tệp, xử lý upload/gửi lại ra sao, push khác WebSocket ở điểm nào, vì sao cần outbox, cách kiểm tra đầu ra AI và giới hạn chịu lỗi của hai VPS.

## 6. Bổ sung hạ tầng và ERD — 13/09/2026

Người dùng bổ sung: **máy cá nhân có thể làm server/nút thứ 3**. V1 đề xuất dùng cho staging, kiểm thử, monitoring hoặc nhận backup mã hóa; có thể chạy backend 3 khi thử nghiệm. Luồng demo chính vẫn chạy trên hai VPS khi máy cá nhân tắt. Chưa chốt cấu hình/uptime của nút này, nên giữ dự toán hai VPS và không mặc định chuyển database chính sang máy cá nhân.

Thiết kế dữ liệu: [TRIPMATE_ERD_V1.md](TRIPMATE_ERD_V1.md), kèm [DBML](docs/database/tripmate_v1.dbml) và [SQL tham chiếu](docs/database/tripmate_v1.sql). Có thêm [từ điển dữ liệu cho teammate](docs/database/DATA_DICTIONARY.md), giải thích từng cột, quan hệ và index. Các backend dùng chung PostgreSQL/Redis; staging dùng dữ liệu tách biệt. Thêm nút không đồng nghĩa đã có HA database.

[UI Stitch sơ bộ](https://stitch.withgoogle.com/projects/3626733689084965569) chưa được đối chiếu do lỗi công cụ truy cập trong phiên thiết kế; ERD v1 bám phạm vi chức năng của kế hoạch này.

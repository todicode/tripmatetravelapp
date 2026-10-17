# Kiểm thử ứng dụng trên hai emulator — 15/10/2026

> Báo cáo lịch sử trước khi sửa. Sau đó người dùng đã duyệt triển khai; kết quả sửa và kiểm thử lại nằm trong [nghiệm thu chat và hồi quy QA](CHAT_EMULATOR_ACCEPTANCE_2026-10-15.md). Các mô tả “chưa sửa/chờ duyệt” bên dưới phản ánh thời điểm khảo sát ban đầu.

Trạng thái: đã kiểm tra các luồng chính trên cả hai máy và hoàn tất lượt bổ sung sau khi Metro được bật lại; các giới hạn chưa kiểm chứng được liệt kê riêng. Có sáu lỗi/khoảng trống cần duyệt và một hiện tượng timeout Photon cần điều tra. Chưa sửa mã ứng dụng trong đợt kiểm thử này.

## Môi trường và giới hạn dữ liệu

- Nhánh `refactor/backend-quality`, development APK đã cài; không kiểm chứng bản release.
- Máy A: Pixel_8, `emulator-5554`. Máy B: Pixel_8_2, `emulator-5556`, Android API 37.2. Serial có thể đổi khi khởi động AVD lần sau.
- Hai tài khoản tổng hợp riêng, hai mã cài đặt độc lập. OTP lấy từ log backend QA ở chế độ email log; không kiểm chứng giao thư SMTP thực tế.
- Backend QA cổng 8083 và PostgreSQL QA riêng bằng Docker; Metro QA cổng 8084 dùng cùng source frontend. Không sửa `.env` trong repository.
- Đã sửa cấu hình môi trường thử nghiệm: mã cài đặt bị sao chép giữa hai AVD và địa chỉ Wi-Fi bị trùng. Không thay chính sách xác thực backend để xử lý các lỗi môi trường này.
- Đối chiếu chỉ đọc database dev sau kiểm thử: vẫn có hai tài khoản thật; tên, avatar và sở thích khớp snapshot ban đầu. Không có đăng ký chờ của ba email tổng hợp trong database dev.
- Ảnh, OTP, token, fixture và log chi tiết được giữ riêng trong `outputs/realtime-private/full-20261015`, đã loại khỏi Git bằng local exclude. Không đưa dữ liệu bí mật vào báo cáo.

### Gián đoạn khi tiếp tục

Lúc tiếp tục buổi tối, hai emulator hoạt động và có IP riêng nhưng Metro 8084 đã tắt; container PostgreSQL QA ban đầu không còn tồn tại. Container ban đầu dùng `--rm`, vì vậy không thể dùng lại dữ liệu QA cũ sau lần Docker dừng. Ảnh, log và kết quả đã ghi trước đó vẫn còn; không coi việc mất fixture này là lỗi sản phẩm.

Đã dựng lại PostgreSQL QA với container không tự xóa, khởi động lại riêng backend 8083 và tạo lại hai tài khoản tổng hợp qua API để chuẩn bị các ca tiếp theo. Các chuyến đi, quan hệ và tin nhắn cũ không được phục hồi vào database mới. Không tuyên bố đã chạy lại toàn bộ ma trận trên database mới.

Người dùng đã bật lại Metro 8084; xác nhận HTTP 200 từ Metro và backend QA. Đã đăng nhập lại hai tài khoản qua UI. Máy A mất cấu hình developer host và hai máy lại có cùng ciphertext của installationId sau gián đoạn. Đã trỏ A về Metro QA, sao lưu và tạo lại riêng installationId trên A đang đăng xuất theo ủy quyền trước đó. Không khôi phục toàn bộ SecureStore. Sau đó hai tài khoản giữ được phiên đồng thời; đăng nhập A không còn làm B đăng xuất.

Lượt bổ sung đã kiểm chứng: camera preview trên cả hai máy, từ chối rồi cấp lại quyền camera trên B; B tìm/lưu địa điểm Hội An, chặn tên danh sách trùng và địa điểm trùng, force-stop/mở lại vẫn giữ danh sách; B cấp quyền vị trí, bật Location và xem trạng thái Gần bạn rỗng. Không tính các assertions của harness gặp popup lưu mật khẩu Google hoặc UI chưa render xong là lỗi ứng dụng.

## Phạm vi đã kiểm chứng

| Luồng                               | Bằng chứng / kết quả                                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng ký trên A và B                 | Form rỗng, thiếu đồng ý điều khoản, OTP sai bị chặn; OTP đúng tạo tài khoản và vào app. Máy B được thử lại với tài khoản mới sau khi khắc phục trùng IP.                                                                                                                  |
| Đăng nhập, đăng xuất, quên mật khẩu | Hai máy: mật khẩu sai bị từ chối; đăng nhập đúng; OTP khôi phục và đăng nhập bằng mật khẩu mới thành công. OTP dùng email log, không phải hộp thư thật.                                                                                                                   |
| Đổi mật khẩu                        | Hai máy: kiểm tra trường bắt buộc, xác nhận không khớp; đổi thành công có thông báo yêu cầu đăng nhập lại. Harness ban đầu không lưu mật khẩu ngẫu nhiên trước thao tác; đã khôi phục các tài khoản tổng hợp bằng luồng quên mật khẩu. Không tính lỗi harness là lỗi app. |
| Hồ sơ và sở thích                   | Hai máy: tên rỗng/quá 100 ký tự, xác nhận rời khi chưa lưu; lưu tên, chọn sở thích, mở lại và bỏ toàn bộ sở thích; đối chiếu PostgreSQL.                                                                                                                                  |
| Avatar                              | A và B: thư viện ảnh, giao diện crop hệ thống, xem trước và lưu lên R2; A mở lại vẫn tải được ảnh. B: hủy picker, hủy xác nhận xóa và xác nhận xóa rồi lưu.                                                                                                               |
| Cài đặt                             | Hai máy: giao diện tối và các công tắc được giữ khi mở lại; đã trả về sáng và tắt công tắc QA. Không kiểm chứng gửi thông báo thật.                                                                                                                                       |
| Khám phá và danh sách               | A tìm/lưu Hồ Hoàn Kiếm trong lượt đầu. Lượt bổ sung B tìm/lưu Hội An, chặn danh sách/địa điểm trùng và force-stop/mở lại vẫn giữ dữ liệu. Danh sách cục bộ theo email tài khoản. Có quan sát Photon timeout riêng bên dưới.                                               |
| GPS và bản đồ                       | A từ chối quyền có thông báo; cả A/B cấp quyền và bật Location nhận vị trí emulator, bản đồ hiển thị. Gần bạn rỗng đúng khi địa điểm đã lưu ở xa. Chưa xác minh ca có địa điểm trong bán kính gần.                                                                        |
| Tạo chuyến                          | A: linh hoạt 3 ngày, OSM và điểm nhập tay. B: linh hoạt 1 ngày; bấm lưu nhiều lần chỉ tạo một chuyến. B tạo chuyến ngày cụ thể 30 ngày bằng lịch qua hai tháng.                                                                                                           |
| Lưu và sửa lịch                     | Ngày trống, giờ nullable, điểm nhập tay không tọa độ; sắp xếp, chuyển ngày, sửa ghi chú và mở lại dữ liệu server. Không cho giảm số ngày khi ngày bị bỏ còn điểm.                                                                                                         |
| Tiến độ chuyến                      | Bắt đầu điểm mới hoàn thành điểm đang đi; chỉ một ACTIVE. Hoàn thành mọi điểm hoàn thành chuyến; mở lại điểm mở lại chuyến. Hủy khóa chỉnh sửa; khôi phục cho sửa tiếp.                                                                                                   |
| Lỗi mạng và phiên bản               | A mất mạng khi lưu lịch: giữ bản sửa, có lỗi và thử lại thành công. Hai emulator cùng tài khoản sửa cùng version: máy thứ hai nhận 409, giữ draft và không ghi đè server.                                                                                                 |
| Đổi tài khoản                       | Máy B chuyển sang A để kiểm tra xung đột rồi về B: không giữ danh sách chuyến riêng của tài khoản trước; lịch sử chat B tải lại từ server.                                                                                                                                |
| Kết bạn                             | Tra số điện thoại, số sai, gửi/rút/từ chối/chấp nhận lời mời, hủy kết bạn. Quét ảnh QR từ thư viện đúng tài khoản. Bổ sung camera preview cả A/B, B từ chối/cấp lại quyền có hướng dẫn; chưa decode QR trực tiếp bằng camera.                                             |
| Chat cá nhân                        | Hai chiều, presence, badge chưa đọc, mở lại lịch sử, bàn phím Android không che nút gửi; offline báo lỗi/thử lại chỉ lưu một tin; background rồi foreground nhận bù. Sau hủy kết bạn không gửi mới nhưng vẫn giữ lịch sử. Còn lỗi mốc đã đọc bên dưới.                    |
| Nhóm                                | Tạo hai thành viên, đổi tên, nhắn hai chiều, thêm/xóa thành viên, chuyển trưởng nhóm, lưu trữ và rời nhóm; kiểm tra quyền API sau thu hồi. Có lỗi điều hướng khi rời nhóm.                                                                                                |
| Chia sẻ chuyến qua nhóm             | Thiết lập liên kết bằng API QA vì frontend chưa có bộ chọn chuyến. UI đọc được chuyến linh hoạt và ngày cụ thể với giờ null; người xem không tự có quyền sửa; xóa chuyến làm API trả 404 và UI bỏ dữ liệu cũ sau tải lại định kỳ.                                         |

Người nhận lời mời kết bạn cần kéo tải lại trong các ca đã chạy. Chưa coi danh sách xã hội tự cập nhật realtime là tính năng đã được nghiệm thu.

## Phát hiện cần duyệt

### QA-01 — P1: Mất thanh điều hướng sau khi rời nhóm

- A mở nhóm đã lưu trữ, chọn rời và xác nhận. App trở về danh sách chat nhưng mất toàn bộ thanh điều hướng dưới; nhấn Back Android mới khôi phục.
- Bằng chứng: `group-leave-navigation-stuck-A.png` và XML tương ứng.
- Vị trí cần điều tra: `frontend/src/chat/useGroupDetails.ts`, `frontend/src/chat/ChatHome.tsx`, `frontend/src/ExploreHome.tsx`.
- Giả thuyết từ source: sự kiện gỡ membership làm màn unmount trước khi callback rời nhóm dọn route; ChatHome hiển thị danh sách dự phòng nhưng route còn tồn tại, khiến thanh điều hướng bị ẩn. Chưa khẳng định đây là nguyên nhân cuối cùng.
- Hướng sửa đề xuất: dọn route nhóm khi quyền truy cập hoặc hội thoại không còn; kiểm chứng đồng thời phản hồi HTTP và sự kiện realtime. Chưa sửa.

### QA-02 — P1: Tin đã xuất hiện trong màn chat nhưng mốc đã đọc không tăng

- Tái hiện ở cả chat cá nhân và nhóm khi người nhận đang mở màn, không cuộn hoặc rời màn.
- Cá nhân: B đã thấy tin seq 3 nhưng `read_seq` còn 1. Sau về danh sách và nhận seq 4, badge tính cả tin đã thấy. Mở lại hội thoại mới cập nhật mốc.
- Nhóm: tin seq 3 đã hiển thị nhưng mốc của B vẫn 1. Gửi/nhận thành công không đồng nghĩa xử lý đọc đã đúng.
- Bằng chứng: `dm-passive-read-B.png`, bản ghi `DM-live-read` và `GROUP-live-read` trong log QA riêng.
- Vị trí cần điều tra: `DirectConversationScreen.tsx`, `useDirectMessaging.ts`, `useGroupMessaging.ts`, session đọc tin và cursor tải bù.
- Hướng sửa đề xuất: kiểm tra callback viewability, trạng thái foreground và mốc dữ liệu đã tải. Không đánh dấu toàn bộ lastSeq đã đọc vì có thể gồm tin chưa xem. Chưa sửa; cần phối hợp teammate phụ trách chat.

### QA-03 — P2: Không nhập được danh sách đã lưu vào chuyến

- A lưu Hồ Hoàn Kiếm vào danh sách rồi chọn nhập danh sách đó trong wizard tạo chuyến.
- App báo “Điểm đến chưa được tải hoặc chưa hỗ trợ”.
- Bằng chứng: `trip-import-list-failed.png`.
- Source: `useExploreViewModel.ts` tạo key `saved_...`; `trips/useTripSetupViewModel.ts` chỉ chấp nhận key/mã trong danh mục thành phố.
- Hướng sửa đề xuất: xác định hoặc yêu cầu chọn thành phố hợp lệ trước khi nhập các địa điểm; giữ dữ liệu danh sách và quy tắc danh mục hiện có. Chưa sửa.

### QA-04 — P2: Frontend chưa cho liên kết chuyến server với nhóm

- Màn tạo nhóm vẫn ghi chuyến lưu trên máy chưa hỗ trợ liên kết; không có bộ chọn chuyến server. `groupMessageApi.ts` gửi `tripId: null`.
- Vị trí: `frontend/src/chat/CreateGroupScreen.tsx`, `frontend/src/chat/groupMessageApi.ts`.
- Backend và UI xem chuyến chia sẻ đã hoạt động trong các ca thiết lập bằng API. Không tính ca này là luồng liên kết hoàn chỉnh qua giao diện.
- Hướng xử lý đề xuất: chốt trách nhiệm với teammate chat rồi nối bộ chọn chuyến và quyền owner; không thay transport realtime. Chưa sửa.

### QA-05 — P2: Bạn bè không tải được avatar đã lưu

- A đã lưu avatar R2 và tự xem được. B tải thumbnail của A nhận 404; chat dùng chữ viết tắt.
- `media/application/MediaService.java` hiện kiểm tra quyền chủ sở hữu; `DirectConversationScreen.tsx` thử tải thumbnail rồi bỏ qua lỗi để dùng initials.
- Đây là khoảng trống tích hợp giữa media và social/chat, không phải bằng chứng lộ ảnh hoặc broken access control.
- Hướng xử lý đề xuất: thống nhất quyền đọc ảnh đại diện theo quan hệ/tài nguyên, thêm ca quyền trước khi mở rộng. Không công khai bucket hoặc bỏ kiểm tra ownership tùy tiện. Chưa sửa.

### QA-06 — P3: Chưa hướng dẫn phục hồi khi mất phản hồi xác minh đăng ký

- Trong lần máy B bị lỗi mạng môi trường, backend đã tạo user nhưng app chưa nhận phản hồi thành công. Gửi lại OTP từ màn cũ báo `VERIFICATION_ALREADY_USED`, không hướng dẫn đăng nhập tài khoản vừa tạo.
- Bằng chứng: `register-lost-response-retry.png`.
- OTP chỉ dùng một lần là đúng. Ca đăng ký bình thường sau khi sửa mạng đã đạt trên tài khoản mới.
- Hướng sửa đề xuất: thông báo có thể đăng nhập và đường dẫn quay về đăng nhập; không cấp lại phiên chỉ dựa trên OTP đã dùng. Chưa sửa.

## Quan sát bổ sung — Photon timeout, chưa xác định nguyên nhân

- Trong lượt bổ sung, máy A nhiều lần hiện lỗi tìm kiếm với Googleplex, Mountain View và Hội An. Máy B tìm Hội An thành công trước đó nhưng truy vấn Googleplex sau đó cũng hết thời gian chờ.
- Đối chiếu từ Windows host: HTTP tới endpoint Photon với truy vấn Hội An cũng `TimeoutError` sau khoảng 12,8 giây; cả hai emulator vẫn phân giải tên và ping được máy chủ Photon. Ping thành công không chứng minh HTTPS/API hoạt động bình thường.
- UI báo lỗi, giữ ô tìm kiếm và không crash. Chưa có căn cứ quy nguyên nhân cho riêng frontend hoặc riêng nhà cung cấp; cần đối chiếu HTTP/TLS, mạng và độ ổn định dịch vụ trước khi quyết định sửa.
- Bằng chứng: `explore-A-repeated-timeout.png`, `EXPLORE-A-search-followup` trong log QA riêng. Không gộp mục này thành lỗi code đã xác nhận thứ bảy.

## Kiểm thử tự động đã chạy trong đợt này

| Kiểm tra                                        | Kết quả                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm test` trong frontend                       | 127 đạt, 0 lỗi, 0 bỏ qua                                                                              |
| `npm run typecheck`                             | Đạt                                                                                                   |
| `npm run format:check`                          | Đạt                                                                                                   |
| Validator OpenAPI qua virtualenv sẵn có         | Đạt: 95 operations, 181 schemas, 2428 examples/parameters, 6 negative checks                          |
| `node --test docs/api/mock-server.test.mjs`     | 108 đạt, 0 lỗi, 0 bỏ qua; đây là mock/contract, không phải kiểm thử PostgreSQL                        |
| `frontend/scripts/test-backend-integration.cjs` | 13 đạt, 0 lỗi, 0 bỏ qua, frontend adapter gọi Spring Boot thật và PostgreSQL QA riêng trước gián đoạn |
| API giới hạn điểm/ngày sau khi dựng lại QA      | Lưu/đọc đủ 50 điểm; 51 điểm bị từ chối HTTP 422; chuyến QA này đã xóa mềm qua API                     |

Không cộng các số trên thành số ca thao tác UI. Không chạy lại Maven/backend suite hoặc build APK trong đợt này; kết quả backend từ các buổi trước không được tính vào đây. Assertions sai do harness nhận nhầm nút, chờ màn sau Alert hoặc dự đoán sai HTTP status đã được phân biệt với lỗi sản phẩm.

## Chưa kiểm chứng và việc tiếp tục

- Đã bổ sung camera permission/preview và tìm/lưu địa điểm trên B. Chưa kiểm chứng decode QR trực tiếp bằng camera, hoặc Gần bạn có ít nhất một địa điểm trong bán kính. Quét ảnh QR từ thư viện và Gần bạn rỗng đã kiểm chứng.
- Chưa kiểm tra Google OAuth với tài khoản nhà cung cấp, iOS, APK release, font hệ thống lớn, tải lịch sử chat hơn 50 tin và thao tác 50 điểm/ngày trực tiếp trên UI.
- Chưa chủ động ép Photon lỗi 503, hoặc làm mất đúng phản hồi POST tạo chuyến sau commit. Có kiểm tra idempotency bằng adapter và lưu nhiều lần, không coi đó là cùng một ca fault injection.
- AI, khách sạn, chi phí, checklist, mời thành viên chuyến, offline và cộng tác sửa lịch nằm ngoài phạm vi đã chốt. Thông báo thực tế và đồng bộ danh sách địa điểm lên server chưa được nghiệm thu; không coi các mục “Sắp có” là lỗi regression.
- Avatar A còn gắn vào fixture cũ khi database QA ban đầu bị mất; chưa xác nhận dọn được object R2 tương ứng. Không xóa object khi chưa xác định chắc chắn ID thuộc QA. B đã thực hiện luồng gỡ avatar trước gián đoạn nhưng trạng thái purge cuối chưa được đối chiếu lại. Cần kiểm kê ảnh QA trước khi kết thúc môi trường này.
- Đã đăng xuất hai tài khoản tổng hợp qua UI; khôi phục riêng `debug_http_host` về mặc định Metro 8081/backend dev 8082 và các Android settings đã sao lưu, gửi lại GPS fix ban đầu cho emulator. Cả hai máy đã về màn đăng nhập. Giữ hai installationId khác nhau; không khôi phục toàn bộ SecureStore gây clone.
- Đã xóa đúng hai tên file QA `TripMate-QA-avatar.webp` và `TripMate-QA-friend-qr.png` trong Download; không xóa thư viện ảnh cá nhân. Quyền camera/vị trí đã cấp trong ca kiểm thử có thể vẫn được Android giữ.
- Backend QA 8083, database QA mới và terminal Metro QA 8084 được giữ lại; hai emulator hiện dùng Metro dev 8081. Người dùng có thể dừng terminal 8084 khi không cần QA riêng nữa. Các ảnh R2 chưa xác định chính xác ID được giữ nguyên, không xóa theo phỏng đoán.

Ưu tiên đề nghị: QA-01, QA-02, QA-03; sau đó chốt phạm vi QA-04/QA-05 với teammate và xử lý QA-06. Tất cả vẫn chờ người dùng duyệt trước khi sửa code. Chưa commit, push hoặc merge trong đợt kiểm thử này; giữ nguyên các thay đổi có sẵn trong workspace.

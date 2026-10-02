# Kế hoạch API theo UI và database hiện tại

Ngày đối chiếu: **27/09/2026**. Phạm vi: backend trong repo, UI React Native đang tích hợp từ `template_gui`, OpenAPI **1.3.0** và schema SQL/Flyway.

## 1. Kết luận và thứ tự nên làm

Nên làm tiếp **API hồ sơ, danh mục, địa điểm, chuyến đi và lịch trình thủ công**. Đây là những phần giúp dữ liệu người dùng được lưu trên server, tải lại sau đăng nhập và dùng trên nhiều thiết bị. Sau đó làm khách sạn/chi phí/checklist, kết bạn, chat, thông báo và AI.

**API do backend triển khai. Frontend tích hợp API vào UI và quản lý trạng thái màn hình.** Database thuộc phần backend: migration, ràng buộc, transaction, index và quyền truy cập. Hạ tầng hỗ trợ email, file, push, provider bản đồ và chạy tác vụ; không thay thế API nghiệp vụ.

Repo đã có **73 operation REST trong OpenAPI**, nhưng đây là contract thiết kế, không phải 73 API đã chạy. Tài liệu này là kế hoạch triển khai và phân công, không sửa hoặc thay thế contract.

| Thứ tự | Nhóm | Kết quả cần có |
| --- | --- | --- |
| P0 | Chốt các điểm UI–contract–DB chưa khớp | Không phải đổi UI hoặc mất dữ liệu khi tích hợp |
| P1a | Hồ sơ và danh mục | Sửa tên thật, tải thành phố/sở thích từ server |
| P1b | Địa điểm, chuyến đi, lịch thủ công, danh sách lưu cá nhân | Tạo/lưu/tải lại chuyến đi và địa điểm qua API |
| P2 | Nơi nghỉ, chi phí, checklist | Các popup hiện có lưu được dữ liệu thật |
| P3a | Kết bạn và thành viên chuyến đi | Có bạn bè/lời mời/quyền thành viên thật |
| P3b | Hội thoại và tin nhắn | Chat riêng, nhóm độc lập hoặc gắn với chuyến đi |
| P4 | Realtime, thông báo, push, vị trí chia sẻ | Cập nhật giữa các thiết bị, nhận thông báo thật |
| P5 | AI và tuyến đường hoàn chỉnh | Sinh bản nháp thật, xem và áp dụng có kiểm soát |

Ảnh đại diện dùng module media, có thể triển khai sớm cùng P1a. Upload file chat làm sau khi quyền hội thoại đã rõ. Không cần chờ AI để hoàn thiện chức năng tạo chuyến đi thủ công.

## 2. Nguồn đối chiếu và mức độ xác minh

- Giao tiếp chuẩn: [openapi.json](openapi.json), [TEAM_RULES.md](TEAM_RULES.md), [CHANGELOG.md](CHANGELOG.md).
- Kiến trúc: [CODING_STANDARDS.md](../CODING_STANDARDS.md): frontend **MVVM**, backend **Modular Monolith**.
- Thiết kế DB: [tripmate_v1.sql](../database/tripmate_v1.sql), [DATA_DICTIONARY.md](../database/DATA_DICTIONARY.md), [ERD](../../TRIPMATE_ERD_V1.md).
- Schema được backend quản lý: [V1__identity.sql](../../backend/src/main/resources/db/migration/V1__identity.sql), [V2__password_reset.sql](../../backend/src/main/resources/db/migration/V2__password_reset.sql).
- API có implementation: [AuthController.java](../../backend/src/main/java/com/tripmate/identity/web/AuthController.java), [UserController.java](../../backend/src/main/java/com/tripmate/identity/web/UserController.java), [HealthController.java](../../backend/src/main/java/com/tripmate/shared/web/HealthController.java).
- State UI: [useHomeViewModel.ts](../../frontend/src/useHomeViewModel.ts), [tripModel.ts](../../frontend/src/trips/tripModel.ts), [useChatSession.ts](../../frontend/src/chat/useChatSession.ts), [useSettingsViewModel.ts](../../frontend/src/useSettingsViewModel.ts).

Đây là kiểm tra **mã và schema trong repo**, chưa truy vấn database đang chạy hoặc gọi từng endpoint trên một server đang deploy. Không suy ra rằng một bảng trong ERD đã tồn tại ở database backend thực tế.

Hai cấu hình local cũng khác nhau: `compose.erd.yml` tạo `tripmate_erd` trên cổng 5433 từ SQL thiết kế; `compose.auth.yml` tạo `tripmate_auth` trên cổng 55432, schema do backend migration quản lý. Phải kiểm tra `DATABASE_URL` của môi trường đích và lịch sử Flyway trước khi thêm bảng. Không chạy lại toàn bộ SQL ERD lên DB đang có user để “đồng bộ”.

## 3. Những API hiện đã có implementation

Tất cả đường dẫn REST dưới đây tính từ `/api/v1`.

| Method / path | Chức năng | Chủ sở hữu |
| --- | --- | --- |
| `POST /auth/register` | Bắt đầu đăng ký, gửi OTP email | identity |
| `POST /auth/register/verify` | Xác minh OTP, tạo tài khoản và phiên | identity |
| `POST /auth/register/resend` | Gửi lại OTP | identity |
| `POST /auth/register/cancel` | Hủy đăng ký chưa hoàn tất | identity |
| `POST /auth/login` | Đăng nhập email/mật khẩu | identity |
| `POST /auth/google` | Đăng nhập Google | identity |
| `POST /auth/refresh` | Đổi refresh token lấy phiên mới | identity |
| `POST /auth/logout` | Thu hồi phiên trên thiết bị hiện tại | identity |
| `POST /auth/password-reset/request` | Yêu cầu OTP quên mật khẩu | identity |
| `POST /auth/password-reset/confirm` | Xác nhận OTP và đặt mật khẩu mới | identity |
| `POST /auth/change-password` | Đổi mật khẩu khi đã đăng nhập | identity |
| `GET /users/me` | Đọc hồ sơ tài khoản hiện tại | identity |
| `GET /health` | Kiểm tra dịch vụ | shared/system |

`PATCH /users/me` đã triển khai slice sửa tên ngày 2026-10-01, có frontend MVVM và tests HTTP/PostgreSQL. Avatar/interests chưa hỗ trợ. API trips/places/chat/notifications và các nhóm tiếp theo **chưa có controller/service tương ứng** trong backend đã kiểm tra. Ví dụ trong mock server không phải implementation.

Các bảng identity đã có migration: `app_users`, `user_devices`, `refresh_tokens`, `pending_registrations`, `auth_identities`, `password_reset_challenges`.

## 4. UI đang dùng dữ liệu ở đâu?

| Mục UI | Hiện tại | Phần còn thiếu |
| --- | --- | --- |
| Cá nhân | GET hồ sơ, PATCH tên/avatar/sở thích, upload private, danh mục sở thích và form MVVM | Nghiệm thu UI sở thích; các luồng tiếp theo theo kế hoạch |
| Chuyến đi/lịch trình | State trong phiên app | CRUD trip, itinerary, quyền, version, tải lại |
| Khách sạn | Dữ liệu gắn trong model chuyến đi | Bảng và contract lưu nơi nghỉ |
| Chi phí/checklist | Mảng trong chuyến đi của phiên | Bảng và API ghi/đọc/sửa/xóa |
| Danh sách địa điểm cá nhân | AsyncStorage theo email | Đồng bộ server và quản lý danh sách |
| Tìm địa điểm | Frontend gọi Photon | Places API và ID địa điểm chuẩn của backend |
| Bản đồ/đường bộ | Leaflet/CARTO/OSRM trong WebView | Routes adapter, xử lý provider và dữ liệu lịch server |
| Bạn bè/lời mời | Danh sách rỗng trong state | Lookup/kết bạn/danh sách server |
| Tin nhắn/nhóm | State phiên; tin do user nhập, không có người nhận qua server | Hội thoại, membership, gửi/lịch sử/realtime |
| Ghim chuyến đi trong chat | `tripId` của hội thoại local | Quan hệ ghim, quyền xem và API |
| Sáng/tối | SecureStore trên thiết bị | Không bắt buộc thêm API |
| Thông báo/nhắc nhở | Tùy chọn local | Quyền OS, device token, notification service, lịch nhắc |
| AI | Chưa kết nối dịch vụ | Job thật, draft, tiến độ/trạng thái, apply |

Lưu AsyncStorage/SecureStore không đồng nghĩa lưu vào PostgreSQL. Bấm gửi tin nhắn local không đồng nghĩa người khác nhận được.

## 5. Các điểm phải chốt trước khi triển khai — P0

**Giữ style và luồng UI hiện tại.** Khi thiếu dữ liệu hoặc contract, bổ sung thiết kế dữ liệu; không tự bỏ tính năng hoặc thu gọn màn hình để vừa API cũ.

| Vấn đề | UI hiện tại | Contract/DB hiện tại | Hướng đề xuất |
| --- | --- | --- | --- |
| Ngày linh hoạt | Chọn 1–30 ngày, chưa chốt ngày đi | Trip bắt buộc start/end; tổng 1–5 ngày; itinerary tối đa 5 ngày | Bổ sung date mode/duration và trạng thái ngày chưa chốt; thống nhất nâng giới hạn. Không tự đặt ngày hôm nay |
| Điểm đến | Có thể tìm điểm đến ngoài danh mục | Trip bắt buộc `cityCode`; cities giới hạn VN | Ánh xạ city được hỗ trợ; nếu cần địa danh tùy ý phải mở rộng mô hình destination, không tự tạo cityCode từ tên |
| Provider địa điểm | Photon/OSM, có điểm tự nhập | `places.provider` chỉ GOOGLE | Chọn provider thật và bổ sung enum/adapter/migration; không ghi ID OSM thành Google ID |
| Danh sách lưu cá nhân | Lưu trước khi tạo chuyến, nhiều danh sách | Chỉ có `trip_saved_places` | Thêm bảng lưu theo user/danh sách; giữ API lưu theo trip riêng |
| Nơi nghỉ | Khách sạn, ở cùng bạn, quyết định sau; nhiều khoảng lưu trú | Không có bảng/API | Bổ sung lodging và hotel stays |
| Chi phí/checklist | Có người chi, số tiền, toggle, xóa | Không có bảng/API; `budget_vnd` chỉ là ngân sách | Bổ sung hai tài nguyên; không nhét vào budget hoặc itinerary note |
| Chat riêng/nhóm | Friend chat và nhóm không bắt buộc trip | `chat_messages.trip_id` bắt buộc; API chỉ chat theo trip | Bổ sung conversations và membership, xem mục 12 |
| Ghim lịch trình | Chọn/đổi/bỏ ghim trong từng chat | Không có bảng/API ghim | Quan hệ ghim riêng; ghim không tự cấp quyền xem trip |
| Kết bạn qua điện thoại | UI có nhập số điện thoại | Lookup chỉ nhận friendCode; request chỉ recipientId | Bổ sung lookup có kiểm soát và xử lý phone chưa xác minh |
| Giờ lịch | Chỉ có giờ đến, có thể rỗng | Itinerary bắt buộc start/end, không chồng lấn | Chốt semantics thời gian chưa định; không tự bịa giờ kết thúc |
| Điểm tự nhập | Có tên, có thể không tọa độ | PLACE cần UUID; NOTE có customTitle | Có thể ánh xạ thành NOTE nếu đúng ý nghĩa; muốn địa điểm tùy chỉnh thật thì bổ sung tài nguyên |
| Trạng thái chuyến/điểm | upcoming/completed/cancelled, pending/active/completed | Trip phase UPCOMING/ONGOING/PAST theo ngày; item không có trạng thái thực hiện | Phân biệt phase theo thời gian và completion/cancellation; bổ sung trạng thái thực hiện nếu muốn lưu |
| Email hồ sơ | UI có ô email | ProfileUpdate không cho email; phone chỉ điền khi còn trống | Giữ email đăng nhập chỉ đọc; muốn đổi email cần xác minh email mới và luồng riêng |
| Thông báo toàn cục | Hai switch nhắc chuyến/chat | Device có pushEnabled; trip có chat/itinerary push | Chốt scope user/device/trip, không map nhắc chuyến sang itinerary push |
| Gần bạn | Địa điểm cá nhân đã lưu trong 50 km | Places nearby tìm provider, tối đa 10 km và cityCode | Hai use case khác nhau; giữ lọc saved places hoặc thêm API riêng, không đổi UI thành khám phá provider |

Các endpoint ghi **[Bổ sung]** bên dưới là đề xuất để thảo luận, **chưa nằm trong OpenAPI và chưa triển khai**. Tên module đề xuất cũng chưa phải package đã tồn tại.

## 6. Phân công giữa các bên

| Bên | Công việc |
| --- | --- |
| Backend | HTTP DTO, auth/quyền theo tài nguyên, nghiệp vụ, transaction/version, persistence, pagination, lỗi, integration test |
| Frontend | API adapter, ánh xạ DTO sang ViewModel, loading/empty/error/submitting, cache theo user, retry đúng contract, giữ style template |
| Database — backend phụ trách | Flyway migration, FK/check/unique/index, dữ liệu catalog thật, backfill khi cần; không để app mobile truy cập PostgreSQL trực tiếp |
| Hạ tầng | PostgreSQL, object storage, SMTP, provider credentials, worker/outbox, FCM, HTTPS/WSS, cấu hình môi trường |
| Hai bên cùng chốt | Những mục P0, contract/extensions, ownership, ví dụ request/response và tiêu chí nghiệm thu |

Backend vẫn là **một ứng dụng Spring Boot**. Chia module để rõ trách nhiệm, chưa cần tách thành nhiều microservice.

## 7. Hồ sơ, avatar và danh mục — P1a

### 7.1. identity: cập nhật hồ sơ

| Endpoint đã có contract | UI | Dữ liệu |
| --- | --- | --- |
| `PATCH /users/me` | Chỉnh sửa hồ sơ | `app_users`, `user_interests` |
| `GET /interests` | Sở thích khi tạo chuyến/hồ sơ | `interests` |
| `GET /cities` | Chọn điểm đến | `cities` |

**Backend:** PATCH chỉ nhận `displayName`, `interestCodes`, `avatarMediaId` theo contract. Lấy user từ JWT. Kiểm tra mã sở thích, ownership của avatar và trạng thái media. Thiếu field giữ nguyên; `avatarMediaId: null` bỏ avatar. Thêm migration cho user interests/cities/interests trước khi dùng.

**Frontend:** nối nút Lưu thay đổi với PATCH, cập nhật hồ sơ từ response; chỉ báo đã lưu sau khi server xác nhận. Không đổi email đăng nhập qua PATCH này. Giữ label tiếng Việt nhưng dùng code catalog ổn định khi gửi.

Ví dụ đúng contract:

```http
PATCH /api/v1/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{"displayName":"Tên hiển thị mới","interestCodes":["FOOD"]}
```

### 7.2. media: ảnh đại diện

Contract có `POST /media`, `GET /media/{mediaId}`, `GET /media/{mediaId}/content`, `GET /media/{mediaId}/thumbnail`, `DELETE /media/{mediaId}`.

- Backend module `media` sở hữu `media_assets`, storage/quota và kiểm tra loại/kích thước file; FK avatar tới media thuộc chính uploader. ID media không phải URL tùy ý.
- Frontend chọn ảnh, upload theo multipart schema, nhận media READY rồi PATCH hồ sơ với ID. Khi PATCH thất bại không giả vờ avatar đã cập nhật server.
- Hạ tầng giữ object storage và credential ở server. Media private được truy cập theo quyền contract.
- Nghiệm thu: tên/avatar tải lại sau đăng nhập, user khác không thể dùng media không thuộc quyền; upload lỗi giữ form và cho thử lại.

## 8. Địa điểm và danh sách cá nhân — P1b

### 8.1. places: tìm kiếm và chi tiết

| Endpoint đã có contract | Công dụng |
| --- | --- |
| `GET /places/search` | Tìm theo `q` và `cityCode`, phân trang |
| `GET /places/nearby` | Tìm địa điểm provider quanh tọa độ, theo giới hạn contract |
| `GET /places/{placeId}` | Chi tiết địa điểm cho popup |
| `GET /trips/{tripId}/saved-places` | Địa điểm đã lưu chung cho chuyến |
| `PUT /trips/{tripId}/saved-places/{placeId}` | Thêm/cập nhật ghi chú lưu theo chuyến |
| `DELETE /trips/{tripId}/saved-places/{placeId}` | Bỏ lưu theo chuyến |

Module `places` sở hữu `places`, `trip_saved_places` và adapter provider. Backend trả ID UUID ổn định, kiểm tra địa điểm nằm trong phạm vi thành phố, timeout/quota và attribution. Không bịa rating, giá vé, giờ mở cửa hoặc khoảng cách khi provider thiếu dữ liệu.

Frontend ngừng dùng ID local/Photon như ID API. DTO phải ánh xạ category/image/coordinates và trường thiếu vào ViewModel; debounce/hủy request cũ, trạng thái lỗi giữ nội dung người dùng đã nhập.

### 8.2. [Bổ sung] danh sách địa điểm cá nhân

Đề xuất module `savedPlaces` sở hữu:

- `user_saved_places(user_id, place_id, note, created_at)` — unique user/place.
- `saved_place_lists(id, owner_id, name, version, created_at, updated_at)`.
- `saved_place_list_items(list_id, place_id, position, created_at)` — unique list/place; quyền owner qua list.

| Endpoint đề xuất | Công dụng |
| --- | --- |
| `GET /users/me/saved-places` | Tất cả địa điểm cá nhân đã lưu |
| `PUT /users/me/saved-places/{placeId}` | Lưu/update note |
| `DELETE /users/me/saved-places/{placeId}` | Bỏ lưu; chốt cách xóa liên kết list trong cùng transaction |
| `GET /users/me/place-lists` | Danh sách cá nhân |
| `POST /users/me/place-lists` | Tạo list và chọn các place có thật |
| `GET /users/me/place-lists/{listId}` | Chi tiết list |
| `PATCH /users/me/place-lists/{listId}` | Đổi tên với expected version |
| `DELETE /users/me/place-lists/{listId}` | Xóa list, không tự xóa place khỏi mọi danh sách |
| `PUT /users/me/place-lists/{listId}/places/{placeId}` | Thêm vào list |
| `DELETE /users/me/place-lists/{listId}/places/{placeId}` | Bỏ khỏi list |

Chốt semantics tên trùng, thứ tự và quan hệ lưu global/list trước migration. Import list vào chuyến chỉ sao chép liên kết cần dùng, không làm list cá nhân thành dữ liệu mọi thành viên đều được sửa.

AsyncStorage có thể giữ cache và dữ liệu chưa đồng bộ. Không upload toàn bộ local state tự động khi chưa resolve ID/provider; chỉ import theo user hiện tại, chống trùng và giữ bản local khi server lỗi.

**Nghiệm thu:** lưu địa điểm, tạo list, tắt app/đăng nhập lại vẫn tải được; account khác không thấy list; bỏ item không xóa dữ liệu ngoài phạm vi.

## 9. Chuyến đi và lịch trình thủ công — P1b

### 9.1. trip: thông tin chuyến đi

Contract: `GET /trips`, `POST /trips`, `GET /trips/{tripId}`, `PATCH /trips/{tripId}`, `DELETE /trips/{tripId}`.

Module `trip` sở hữu `trips`, `trip_members` và các tài nguyên lời mời ở mục 11. Tạo trip phải đồng thời tạo owner ACTIVE và itinerary/ngày tương ứng trong **một transaction**. Đề xuất trip phát `TripCreated` và itinerary xử lý đồng bộ trước commit để khởi tạo lịch; lỗi khởi tạo rollback toàn bộ. Không dùng listener sau commit/job bất đồng bộ cho bước bắt buộc này, và không tạo trip rồi mới thêm owner bằng request riêng.

- List chỉ trả chuyến user được phép truy cập; không phải toàn bộ trips trong DB.
- Đọc cần ACTIVE member, đổi thông tin/xóa cần OWNER theo contract. UI ẩn nút không thay thế kiểm tra quyền.
- PATCH dùng `expectedTripVersion`; ngày thay đổi kiểm tra lịch dưới cùng khóa, tăng version đúng quy tắc. Xóa theo semantics deleted trip, không tùy tiện cascade dữ liệu identity.
- Frontend tải list từ server vào `ManageTripsScreen`, dùng ID server, ánh xạ `myRole`, `phase`, version và thông tin city. Không gửi nguyên object `Trip` local lên POST.

Ví dụ **baseline đã có contract**, chỉ áp dụng cho trip đã chốt ngày và nằm trong giới hạn hiện tại:

```json
{
  "title": "Chuyến đi Đà Nẵng",
  "cityCode": "DANANG",
  "startDate": "2026-12-01",
  "endDate": "2026-12-03",
  "description": null,
  "budgetVnd": null
}
```

Để giữ chế độ linh hoạt 30 ngày của UI, cần cập nhật contract/DB tại P0. Đề xuất `dateMode`, `durationDays`, ngày nullable khi FLEXIBLE; phase cần semantics chưa chốt ngày. Đây chưa phải payload hợp lệ của OpenAPI hiện tại. Không gửi `null` hoặc field mới vào endpoint baseline trước khi thống nhất.

### 9.2. itinerary: lịch trình theo ngày

Contract: `GET /trips/{tripId}/itinerary`, `PUT /trips/{tripId}/itinerary`.

Module `itinerary` sở hữu `itineraries`, `itinerary_days`, `itinerary_items`; các module khác kiểm tra quyền qua public API của `trip`.

Dependency nghiệp vụ giữ một chiều `itinerary → trip.api` để kiểm tra quyền/metadata. Trip không import implementation của itinerary; sự kiện khởi tạo ở trên tránh tạo vòng `trip ↔ itinerary`. Nếu lựa chọn kiến trúc khác, phải có điều phối transaction và bằng chứng không có dependency vòng trước khi triển khai.

- GET trả version và toàn bộ ngày/mục, bao gồm ngày rỗng.
- PUT thay toàn lịch trong transaction, có `expectedVersion`. Array order quyết định position; ID cũ chỉ giữ mục thuộc chính lịch đó, mục mới bỏ ID để server sinh.
- Kiểm tra ngày hợp lệ, thời gian/overlap, place hợp lệ; lỗi giữ nguyên lịch cũ. Không commit được nửa lịch.
- UI chuyển ngày/sắp xếp/ghi chú gọi ViewModel, gom thay đổi vào draft; bấm lưu gửi PUT. `409 VERSION_CONFLICT` phải cho tải bản mới và xử lý bản đang sửa, không ghi đè mù.
- POST tạo trip rồi PUT lưu lịch là hai request: nếu PUT lỗi, giữ trip mới/draft và cho retry; không POST trip lần nữa chỉ vì chưa lưu được lịch. Muốn tạo atomic toàn bộ wizard phải bổ sung use case/contract riêng hoặc mở rộng CreateTrip có transaction, không tự thêm endpoint ngầm.

**Nghiệm thu:** tạo trip/lịch từ UI, mở lại thấy đúng ngày/thứ tự/ghi chú; user không có quyền bị chặn; hai người sửa cùng version không làm mất dữ liệu; lỗi mạng không báo lưu thành công.

## 10. Nơi nghỉ, chi phí và checklist — P2, đều cần bổ sung contract

### 10.1. [Bổ sung] hotel stays

Đề xuất thuộc module `trip` giai đoạn đầu, tách module riêng khi có nghiệp vụ lưu trú lớn hơn. Lưu `lodging_type` phù hợp trên trip và bảng `trip_hotel_stays`: ID, trip, place/name đã xác minh, start/end day, giờ optional, note, version, người tạo/sửa.

| Endpoint đề xuất | Công dụng |
| --- | --- |
| `GET /trips/{tripId}/hotel-stays` | Tổng kết nơi nghỉ |
| `PUT /trips/{tripId}/hotel-stays` | Thay toàn bộ các khoảng lưu trú với expected version |

Khoảng đêm là **[startDay, endDay)**: ngày 1→3 là 2 đêm; khách sạn tiếp theo bắt đầu ngày 3 không trùng đêm. Validate `1 <= startDay < endDay <= duration`, không chồng nhau, giờ/note không bắt buộc. Trip một ngày không có đêm lưu trú. Sửa thời lượng trip phải kiểm tra stays hiện có trong transaction. Chốt quyền sửa: đề xuất ACTIVE member như itinerary; owner kiểm soát metadata chung của trip.

Frontend giữ các bước tìm khách sạn → chọn ngày → giờ/ghi chú → tổng kết; render hàng khách sạn trước ngày check-in. Đây là lưu kế hoạch nơi nghỉ, **chưa phải booking/thanh toán khách sạn**.

### 10.2. [Bổ sung] expenses

Đề xuất module `tripFinance`, bảng `trip_expenses`: trip, title, `amount_vnd bigint`, payer user/member, createdBy, version, timestamps.

`GET /trips/{tripId}/expenses`, `POST /trips/{tripId}/expenses`, `PATCH /trips/{tripId}/expenses/{expenseId}`, `DELETE /trips/{tripId}/expenses/{expenseId}`.

- Chốt quyền: ACTIVE member được đọc/thêm; creator hoặc OWNER sửa/xóa. Payer phải thuộc danh sách được phép, không chỉ gửi một tên tùy ý.
- Nếu cần người tham gia chưa có account, thiết kế participant riêng, không tạo user giả. Quyết định cách xử lý payer rời trip để không mất lịch sử chi phí.
- Số tiền là chuỗi VND trong JSON, ví dụ `"150000"`; không dùng `number` của model local làm DTO server. Tổng/bình quân hiển thị là thống kê, không tự coi là khoản nợ/đã thanh toán.
- Retry POST sau timeout cần idempotency được contract mới định nghĩa, không áp dụng quy tắc chat một cách ngầm định.

### 10.3. [Bổ sung] checklist

Đề xuất thuộc module `trip` ban đầu, bảng `trip_checklist_items`: trip, text, checked, position, creator, updater, version/timestamps.

`GET /trips/{tripId}/checklist`, `POST /trips/{tripId}/checklist`, `PATCH /trips/{tripId}/checklist/{itemId}`, `DELETE /trips/{tripId}/checklist/{itemId}`.

Chốt checklist **chung của chuyến** theo UI hiện tại: ACTIVE member đọc/thêm/toggle; quyền xóa creator/OWNER. Nếu muốn checklist cá nhân, phải thêm user scope; không trộn hai nghĩa. Toggle gửi giá trị `checked` mong muốn kèm version, không gửi lệnh đảo trạng thái có thể đảo lần nữa khi retry.

**Nghiệm thu P2:** thêm/sửa/xóa và tải lại giữ nguyên dữ liệu; member khác thấy đúng theo quyền; stays trùng bị từ chối; tiền không mất chính xác; checklist không đảo sai khi gửi lại.

## 11. Kết bạn và thành viên chuyến đi — P3a

### 11.1. social: quan hệ bạn bè

| Endpoint đã có contract | UI |
| --- | --- |
| `GET /users/me/friend-code` | QR/mã kết bạn cá nhân |
| `GET /users/lookup?friendCode=...` | Tìm bằng mã từ QR |
| `GET /users/lookup-by-phone?phone=...` | Exact phone lookup |
| `GET /friends`, `DELETE /friends/{userId}` | Chọn bạn để mời và quản lý quan hệ |
| `GET /friend-requests` | Tab đã nhận/đã gửi |
| `POST /friend-requests` | Gửi lời mời với recipientId |
| `POST /friend-requests/{requestId}/accept` | Đồng ý |
| `POST /friend-requests/{requestId}/reject` | Từ chối |
| `POST /friend-requests/{requestId}/cancel` | Thu hồi |

Đề xuất module `social` sở hữu `friend_requests`, `friendships`; thông tin user đọc qua identity public API. QR chứa mã kết bạn có semantics rõ, không chứa access token. Frontend xử lý camera/đọc QR; backend tra mã và trả user summary phù hợp.

Backend chống tự kết bạn, pending trùng hai chiều, accept bởi người không phải recipient. Accept và tạo friendship trong transaction; hai request đồng thời không tạo quan hệ trùng. Không làm API public liệt kê mọi email tài khoản.

**Implemented friend API:** Authenticated phone/friend-code lookup now returns real relationship state. Flyway V5 enforces unique normalized phone numbers (not SMS verified); V6 adds friend requests with optional 500-character message and friendships. Requests are idempotent for a pending pair, role-checked on accept/reject/cancel, and paged. A friend can be removed. Existing normalized phone duplicates stop V5 for manual resolution. QR scanning and mobile friend UI remain frontend work.

### 11.2. trip: membership và invitations

Contract gồm:

- `GET /trips/{tripId}/members`.
- `DELETE /trips/{tripId}/members/me`, `DELETE /trips/{tripId}/members/{userId}`.
- `POST /trips/{tripId}/join-code`, `DELETE /trips/{tripId}/join-code`, `POST /trips/join`.
- `GET /trip-invitations`, `GET /trip-invitations/{invitationId}`.
- `GET /trips/{tripId}/invitations`, `POST /trips/{tripId}/invitations`.
- `POST /trip-invitations/{invitationId}/accept`, `/reject`, `/cancel`.

DB: `trip_members`, `trip_invitations`, `trip_join_codes`. Owner tạo/hủy lời mời hoặc quản lý thành viên; invitee chấp nhận/từ chối; owner không tự rời trip. Theo baseline tối đa **10 ACTIVE member kể cả owner**. Lock trip khi accept/join để không vượt cap do cạnh tranh.

UI “Thêm bạn đồng hành” phải phân biệt pending invitation và member ACTIVE. Không thêm ngay tên local vào danh sách thành viên server khi user chưa chấp nhận. Người chưa có account cần cơ chế participant riêng nếu giữ luồng nhập tên, không gán một UUID user tùy ý.

Rời/bị xóa quyền phải ngừng nhận chat/location và dọn cache trip theo contract. Membership nhóm chat độc lập ở mục 12 không đồng nghĩa membership chuyến đi.

## 12. Chat — P3b, cần quyết định mô hình trước

### 12.1. Phần baseline đã thiết kế

Contract có `GET /trips/{tripId}/messages`, `POST /trips/{tripId}/messages`. Bảng `chat_messages` gắn bắt buộc với trip và người gửi là trip member. Đây là **chat của chuyến đi**, không đáp ứng toàn bộ UI FriendChat/CreateGroup hiện tại.

Không nên yêu cầu user tạo một trip giả để nhắn tin riêng, hoặc biến mọi nhóm thành chuyến đi. Đề xuất thêm **hội thoại riêng** để giữ UI.

### 12.2. [Bổ sung] module chat theo conversations

Đề xuất các bảng:

- `conversations`: ID, type DIRECT/GROUP, name/avatar nếu GROUP, creator, trip liên kết optional, lastSeq, version/timestamps.
- `conversation_members`: conversation/user, role OWNER/MEMBER, trạng thái ACTIVE/LEFT/REMOVED, lastReadSeq, tùy chọn thông báo.
- `conversation_messages`: conversation, sender, seq, clientMessageId, kind/body, media nếu hỗ trợ; unique conversation/seq và conversation/sender/clientMessageId.
- `conversation_trip_pins`: conversation, trip, người ghim; nếu một ghim thì unique conversation.

| Endpoint đề xuất | Công dụng |
| --- | --- |
| `GET /conversations` | ChatList: tên/avatar/tin cuối/unread/cursor |
| `POST /conversations` | Tạo DIRECT hoặc GROUP; tripId optional cho nhóm |
| `GET /conversations/{conversationId}` | Header và quyền hiện tại |
| `PATCH /conversations/{conversationId}` | Tên/avatar nhóm theo quyền/version |
| `GET /conversations/{conversationId}/members` | Thành viên nhóm |
| `POST /conversations/{conversationId}/members` | Mời/thêm theo chính sách được chốt |
| `DELETE /conversations/{conversationId}/members/me` | Rời nhóm |
| `DELETE /conversations/{conversationId}/members/{userId}` | Owner quản lý thành viên |
| `GET /conversations/{conversationId}/messages` | Lịch sử/phân trang seq |
| `POST /conversations/{conversationId}/messages` | Gửi tin, clientMessageId chống gửi trùng |
| `PUT /conversations/{conversationId}/read-position` | Cập nhật lastReadSeq, suy ra unread |
| `GET /conversations/{conversationId}/trip-pin` | Ghim hiện tại, có thể rỗng |
| `PUT /conversations/{conversationId}/trip-pin` | Ghim/đổi trip, kiểm tra quyền |
| `DELETE /conversations/{conversationId}/trip-pin` | Bỏ ghim |

**Quy tắc phải chốt:** một DIRECT duy nhất cho cặp user; ai được mở DIRECT, ai được thêm bạn vào nhóm, có cần accept không; owner rời nhóm thì chuyển quyền hay giải tán. Tên nhóm không được dùng làm ID. Lời mời nhóm nếu cần sẽ là tài nguyên riêng, không tái dùng trip invitation với nghĩa khác.

Ghim trip không cấp quyền trip cho mọi người trong conversation. Backend kiểm tra quyền xem khi mở pin; có thể trả thông tin giới hạn/không có quyền. Chốt nhóm được ghim trip nào và ai được đổi/bỏ ghim trước khi viết API.

Khi bổ sung conversation chat phải mở rộng cả scope media, notification/event và realtime topic. Không bỏ FK trip của bảng hiện có hoặc thay wire format v1 trong một bản sửa chat. Có kế hoạch migration/adapter nếu cần giữ endpoint trip chat cũ.

### 12.3. Tích hợp frontend và nghiệm thu

- Thay `useChatSession` local bằng API adapter/ViewModel; không nạp dữ liệu mock vào app thật.
- Tin mới có trạng thái sending/sent/failed. Chỉ server xác nhận mới là sent; retry cùng clientMessageId theo contract đã chốt.
- Sender ID và thời gian/seq do server xác nhận; không gửi `isMe`/senderName để backend tin. UI suy ra isMe từ user ID.
- REST là nguồn dữ liệu; lịch sử tải trước/sau seq, dedup theo message ID. Reconnect tải bù trước khi coi đã đồng bộ.
- Hồ sơ người chat dùng summary/profile được cấp quyền; không hiển thị online/bio/email giả. Nếu cần popup đầy đủ, bổ sung endpoint đọc hồ sơ công khai với trường được phép.
- Giai đoạn đầu gửi TEXT. Location hiện là link text; muốn loại tin LOCATION riêng cần contract/schema mới. Image/PDF dùng media sau đó.
- Gọi thoại/video chưa thuộc REST chat: cần signaling/RTC và thiết kế riêng, ưu tiên sau.

**Nghiệm thu:** hai tài khoản trên hai thiết bị thật nhận tin qua server, restart còn lịch sử; retry không nhân đôi; không đọc được hội thoại khác; unread đúng sau đọc; bị xóa khỏi nhóm không tiếp tục nhận dữ liệu private.

## 13. Realtime, thông báo và vị trí — P4

### 13.1. notification và device push

Contract có:

- `PUT /devices/current`, `DELETE /devices/current/push-token`.
- `GET /notifications`, `GET /notifications/{notificationId}`, `POST /notifications/{notificationId}/read`.
- `GET /trips/{tripId}/settings/me`, `PATCH /trips/{tripId}/settings/me`.

Module `identity` sở hữu device binding; module `notification` sở hữu `notifications`, `outbox_events`, `push_deliveries`. Notification use case gọi identity public API để đọc/đổi push settings, không trực tiếp lấy repository của module khác. Hạ tầng cung cấp FCM và worker/outbox.

Backend tạo notification từ sự kiện thật trong transaction/outbox: friend request, invitation, message, itinerary update. Có dedup và retry. Push chỉ báo sự kiện, REST feed là nguồn dữ liệu; thiết bị không nhận push khi user tắt hoặc binding không còn thuộc user.

Frontend xin quyền OS đúng thời điểm, đăng ký/update token thiết bị, map deep link tới tài nguyên có quyền; switch không được chỉ ghi local rồi báo đã bật push. `installationId` là ID cài đặt, không hardcode chung giữa người dùng.

**[Bổ sung] nhắc lịch và tùy chọn toàn cục:** đề xuất `GET/PATCH /users/me/notification-preferences`, bảng preference user và bảng reminder/job nếu cần nhắc từ server. Baseline chưa có type TRIP_REMINDER, thời điểm nhắc/timezone/reschedule khi đổi ngày. Chốt giữa local scheduled notification và server reminder; không chạy cả hai làm thông báo trùng. Trip FLEXIBLE chưa có ngày thì không có giờ khởi hành thật để nhắc.

Sáng/tối có thể tiếp tục local; không cần API chỉ để chọn theme. Nếu sau này muốn đồng bộ theme đa thiết bị, bổ sung preference riêng.

### 13.2. Realtime

Baseline dùng **STOMP qua WebSocket `/ws`**, nhận `/topic/trips/{tripId}/events` và `/user/queue/events`. Chat/location/itinerary ghi bằng REST, không tạo STOMP SEND nghiệp vụ ngoài contract.

Backend kiểm tra JWT CONNECT, quyền SUBSCRIBE và quyền trước outbound; FE refresh/reconnect, dedup và REST tải bù. Có thể triển khai REST và polling trước, nhưng không gọi đó là realtime hoàn chỉnh. Với conversations mới cần bổ sung topic/event cùng contract quyền hội thoại.

### 13.3. location: chia sẻ vị trí thành viên

Contract: `GET /trips/{tripId}/locations`, `PUT /trips/{tripId}/locations/me`, `DELETE /trips/{tripId}/locations/me`.

Theo ERD, vị trí live là state tạm theo TTL, không nằm trong bảng lịch sử PostgreSQL hiện có. Chọn kho TTL phù hợp, ví dụ Redis khi triển khai, ghi rõ cấu hình và semantics. Baseline TTL 60 giây, interval 10 giây, chỉ app foreground và user chủ động bật; server xác định freshness.

Frontend xin quyền GPS, gửi khi bật, dừng khi user tắt/background/mất quyền; không upload tọa độ chỉ vì user bấm nút định vị bản đồ. Backend kiểm tra ACTIVE member, tọa độ/accuracy, TTL; không để vị trí stale thành vị trí hiện tại.

Nút “Gần bạn” và định vị Explore có thể chỉ tính trên thiết bị; không bắt buộc chạy location sharing API.

## 14. AI và route — P5

### 14.1. itineraryAi: tạo bản nháp

Contract có `POST /trips/{tripId}/ai-drafts`, `GET /trips/{tripId}/ai-drafts`, `GET /trips/{tripId}/ai-drafts/{draftId}`, `POST /trips/{tripId}/ai-drafts/{draftId}/apply`.

Đề xuất module `itineraryAi` sở hữu `ai_itinerary_drafts` và provider/job adapter; apply gọi public API itinerary trong transaction. API provider key, prompt nội bộ/quota ở server, không trong app.

- Tạo draft trả 202, job chuyển GENERATING → READY/FAILED; FE polling baseline 2 giây, dừng ở trạng thái kết thúc.
- UI giữ popup notes và loading gốc, cập nhật theo trạng thái thật. Không timer giả chạy 3 giây rồi lưu lịch mẫu.
- Backend kiểm tra output theo city/place IDs, ngày/giờ, không lấy text AI làm dữ liệu đã xác minh; không bịa giá vé.
- Draft ghi base trip/itinerary version và expiresAt. Apply stale/expired bị từ chối; lịch đang dùng không bị thay trong lúc job chỉ đang GENERATING.
- Idempotency bằng clientRequestId/apply theo đúng contract; mất mạng không tự tạo nhiều job tính phí.

### 14.2. routes

Contract có `GET /trips/{tripId}/days/{dayNumber}/route`, đề xuất module `routing` không sở hữu itinerary; đọc qua public API itinerary và gọi provider adapter.

Backend kiểm tra quyền/ngày/version, cache theo các điểm và transport mode, trả khoảng cách/thời gian/attribution thật hoặc lỗi provider. FE vẽ route/legs lên bản đồ, không thay khoảng cách thiếu bằng số mẫu. Hiện OSRM trong WebView có thể tiếp tục phục vụ bản đồ trước khi API route hoàn thành; chốt provider và contract dữ liệu trước khi thay.

## 15. Quy ước dùng chung khi làm từng API

1. Base `/api/v1`, camelCase; JSON thành công `{data, requestId}`, lỗi `{requestId, error:{code,message,details,context}}`; 204 không body. DTO chi tiết theo OpenAPI, không theo entity hoặc model UI.
2. ID tài nguyên do backend sinh UUID. `makeId()` local không phải UUID server; client chỉ sinh các ID được contract cho phép như installationId/clientMessageId/clientRequestId.
3. JWT xác định actor. Không nhận owner/role từ client để cấp quyền. Mỗi query/mutation phải kiểm tra tài nguyên thuộc phạm vi user/member.
4. VND/version/seq/bigint là **string**, tính bằng BigInt khi cần; `null` không phải số 0. Ngày local YYYY-MM-DD, giờ HH:mm, timestamp UTC Z.
5. Cursor opaque, không tự dùng offset hoặc giả định mọi API list có cùng shape. Chat có pagination seq riêng.
6. `401` xử lý refresh theo contract; `403/404` xử lý mất quyền; `409` resolve conflict; `422` lỗi field/nghiệp vụ; `429` tôn trọng retry window; `503` cho thử lại phù hợp. Không bật retry vô điều kiện cho POST.
7. API adapter dùng HTTP client chung. ViewModel quản lý server state/draft và lỗi; View chỉ render. Không viết fetch trực tiếp vào các màn hình khi tích hợp module mới.
8. Loading/empty/error/submitting phải có; chỉ báo thành công khi backend xác nhận. Cache theo account và tài nguyên; dọn khi logout/đổi account/mất quyền.
9. Migration mới cho schema mới; không sửa V1/V2 đã áp dụng hoặc xóa DB user. Test constraint/transaction/concurrency trên PostgreSQL cho các rule phụ thuộc DB.
10. Hợp đồng mới cập nhật OpenAPI/examples/TEAM_RULES/changelog đồng bộ. Mock chỉ dùng kiểm tra adapter/contract khi chủ động chọn môi trường dev; app thật không hiển thị fixture làm dữ liệu của user.

## 16. Gói triển khai đầu tiên đề xuất

Gói đầu tiên nên gồm:

1. Chốt date mode/duration, provider place, giờ chưa định và saved lists ở P0.
2. `GET /cities`, `GET /interests`, `PATCH /users/me` — thêm bảng/catalog migration cần thiết.
3. `GET /places/search`, `GET /places/{placeId}` — tạo place ID thật cho lịch.
4. CRUD trip và GET/PUT itinerary — owner/membership/version cùng transaction.
5. API saved places/list cá nhân đã chốt — lưu và import vào wizard.
6. Nối UI vào từng nhóm API, giữ nguyên layout/style template; thực hiện một workflow trên server thật từ tạo → lưu → đóng app → tải lại.

Không cần làm hết 73 endpoint trong một commit. Mỗi nhóm bàn giao đủ: migration, DTO đúng contract, service/controller, quyền, test và tích hợp UI. Media avatar có thể làm song song trong lịch phát triển của nhóm, không phải điều kiện bắt buộc cho tạo trip thủ công.

## Kế hoạch hồ sơ cá nhân sau auth

Đã triển khai theo [PROFILE_IMPLEMENTATION_PLAN.md](PROFILE_IMPLEMENTATION_PLAN.md), HS-01 đến HS-06. Slice đầu chỉ cập nhật `displayName`; email chỉ đọc, avatar/interests để sau. Backend 57 tests gồm PostgreSQL thật, frontend auth/profile/form tests, TypeScript, OpenAPI, Android build và Metro export pass. Chưa thao tác UI trực tiếp trên emulator/device; checklist còn lại nằm trong kế hoạch.

Quy tắc slice: PATCH `/users/me` nhận tên được trim, 1–100 Unicode code point, giữ dấu và chữ hoa/thường. JSON sai cú pháp trả 400 `INVALID_REQUEST`; object rỗng, sai kiểu/null, field lạ và field chưa hỗ trợ (kể cả `avatarMediaId: null`) trả 422 `VALIDATION_ERROR` kèm details. Kiểm tra toàn bộ payload trước mutation. Thành công trả profile đầy đủ; không đổi session/remember-me. Schema OpenAPI vẫn mô tả phạm vi đích rộng hơn; ví dụ có interests chưa phải payload được implementation slice này hỗ trợ.

## 17. Checklist bàn giao một nhóm API

- [ ] Contract được chốt; phần đề xuất mới không bị nhầm thành API hiện có.
- [ ] Migration áp dụng được trên DB đang có identity data, không làm hỏng login/register/reset/change-password.
- [ ] GET trả dữ liệu đúng actor; mutation kiểm tra quyền và transaction/version/idempotency phù hợp.
- [ ] Tests gồm thành công, input sai, không có quyền, resource khác user, gửi trùng/xung đột nếu liên quan.
- [ ] Frontend giữ style template, có đầy đủ trạng thái và dùng adapter/ViewModel.
- [ ] Test bằng tối thiểu hai tài khoản khi có sharing/chat; không dùng fixture để chứng minh server đã lưu.
- [ ] Restart/tải lại/đổi account không mất hoặc lẫn dữ liệu.
- [ ] API lỗi/mạng lỗi giữ draft và không báo thành công giả.
- [ ] OpenAPI/examples và tài liệu trạng thái implementation được cập nhật đúng mức đã hoàn thành.

**Cập nhật avatar 2026-10-01:** đã triển khai upload/download private, quota/cleanup, PATCH gắn/xóa ảnh và picker/crop/preview theo [AVATAR_IMPLEMENTATION_PLAN.md](AVATAR_IMPLEMENTATION_PLAN.md), có migration V3. Các mô tả slice chỉ nhận tên ở trên là lịch sử; hiện `avatarMediaId` UUID/null được hỗ trợ. Còn cấu hình R2 thật và nghiệm thu UI native theo [R2_AVATAR_SETUP.md](R2_AVATAR_SETUP.md).

**Ngoài auth, sửa tên và avatar, các nhóm API còn lại vẫn là kế hoạch.** Những đề xuất bổ sung cần được đưa vào contract trước khi code nhóm tương ứng.

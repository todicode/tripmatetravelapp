# Quy tắc phối hợp Backend ↔ Frontend — TripMate v1

Phiên bản contract **1.0.0**, ngày **17/09/2026**. Áp dụng cho người và AI hỗ trợ hai phía. Đây là baseline để triển khai; **chưa phải danh sách API đang chạy**.

Nguồn chuẩn giao tiếp là [openapi.json](openapi.json). REST nằm trong `paths/components`; STOMP trong `x-realtime`; push trong `x-push`. `x-realtime` là extension riêng của dự án, **không phải tài liệu AsyncAPI**. [ERD](../../TRIPMATE_ERD_V1.md) và [SQL](../database/tripmate_v1.sql) quy định dữ liệu/transaction; DTO API không xuất trực tiếp entity database.

**BẮT BUỘC** nghĩa là cả hai phía phải thực hiện. Khi khác ý tưởng với contract, sửa contract trước qua PR chung, không tự đổi wire format rồi yêu cầu phía kia sửa theo.

## 1. Các quyết định triển khai của baseline

Các điểm sau cụ thể hóa phần kế hoạch chưa xác định đầy đủ:

| Hạng mục | Quyết định v1 |
| --- | --- |
| Đăng nhập | Email + mật khẩu, không OTP; register trả phiên đăng nhập |
| REST | `/api/v1`, JSON UTF-8, camelCase |
| Response | Thành công `{data, requestId}`; lỗi `{requestId, error}`; 204 không body |
| Sửa lịch | Một `PUT /trips/{tripId}/itinerary` thay toàn lịch trong transaction |
| Phân trang | Cursor opaque; mặc định 20, tối đa 100; chat mặc định 50 và dùng seq riêng |
| Chat/vị trí ghi | REST; socket chỉ nhận sự kiện, không có STOMP SEND nghiệp vụ |
| Upload | Multipart qua backend, đồng bộ; 201 chỉ khi media READY |
| Password mới | 8–128 ký tự; không trim/đổi mật khẩu; đây là ràng buộc API, không quy định thuật toán hash |
| Giới hạn input | Ghi chú 2.000, AI notes 1.000, chat 4.000 ký tự; tối đa 50 mục/ngày |
| Thời hạn | Mã/lời mời chuyến 7 ngày; draft AI 24 giờ; vị trí TTL 60 giây |
| Token | FE đọc expiresIn/refreshExpiresAt, không hardcode thời hạn; các số trong ví dụ không phải TTL bắt buộc |
| AI polling | 2 giây khi GENERATING, dừng khi READY/FAILED/APPLIED/EXPIRED |
| Màn hình | Bám kế hoạch hiện có; chưa đối chiếu trực tiếp UI Stitch |

Các quyết định này nằm trong contract để hai bên có thể code ngay. Thay đổi sau này phải ghi changelog; không được coi ví dụ mock là dữ liệu sản phẩm hay bằng chứng backend đã hoàn thành.

## 2. Kiểu dữ liệu và HTTP

1. BẮT BUỘC dùng đúng method, URL, tên trường, kiểu, enum, required/nullable, mã HTTP và response shape trong JSON. Frontend không tự chuyển snake_case thành camelCase để che lệch contract.
2. ID là UUID string. UUID của entity do backend sinh; client chỉ sinh `installationId`, `clientMessageId`, `clientRequestId`. Không gửi `userId`, owner, role, membershipVersion, costSource/origin để tự cấp quyền hoặc sửa trường server quản lý.
3. **Mọi bigint** (VND, version, seq, sizeBytes) là chuỗi thập phân chuẩn, từ `"0"` đến `"9223372036854775807"`. Không dấu âm, dấu cộng, số 0 thừa hay số mũ. Regex giới hạn hình dạng; backend còn kiểm tra trần bigint. FE giữ string; dùng `BigInt` khi so sánh/tính, chuyển lại string trước JSON.stringify; không ép sang Number.
4. `null` khác `0`, `"0"`, `""` và field không có. PATCH: thiếu = giữ nguyên; null chỉ được dùng với field nullable để xóa giá trị. Mảng rỗng là rỗng, không trả null. Response phải có đủ các field required, kể cả field nullable.
5. Thời điểm là RFC 3339 UTC có hậu tố Z; ngày là YYYY-MM-DD; giờ lịch là HH:mm tại `Asia/Ho_Chi_Minh`. FE không chuyển ngày chuyến qua UTC làm lệch ngày. V1 không có mục lịch qua đêm.
6. Chuỗi có maxLength tính theo Unicode code point; tên/title phải có ký tự không trắng. Email trim + lowercase. Mã kết bạn/mã chuyến trim + uppercase. Không tự trim body chat hay password.
7. Request JSON từ chối field lạ bằng 422. FE bỏ qua response field mới chưa dùng, không crash vì thuộc tính bổ sung. Không serialize trực tiếp JPA entity hoặc trả stack trace.
8. `Content-Type: application/json` cho JSON; upload để thư viện tự đặt multipart boundary. Download trả binary đúng MIME, không bọc JSON. Production dùng HTTPS/WSS; local dùng HTTP/WS.
9. Backend cấp `X-Request-Id` cho mọi response, trùng requestId trong body nếu có. 204 vẫn có header nhưng không có body. Không cần FE gửi requestId. FE không gọi response.json() trên 204/binary.
10. Dữ liệu riêng tư và token response dùng `Cache-Control: private, no-store`. Cache trong app theo tài khoản và quyền hiện tại; xóa khi logout/đổi tài khoản/mất quyền. Chỉ dùng TLS cho môi trường có dữ liệu thật.

Ví dụ thành công:

```json
{
  "data": { "draftId": "00000000-0000-4000-8000-000000000051", "tripId": "00000000-0000-4000-8000-000000000010", "appliedItineraryVersion": "1", "appliedAt": "2026-09-17T03:00:00Z" },
  "requestId": "00000000-0000-4000-8000-000000000090"
}
```

Ví dụ xung đột:

```json
{
  "requestId": "00000000-0000-4000-8000-000000000090",
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Lịch đã được một thành viên khác cập nhật.",
    "details": [],
    "context": { "resource": "ITINERARY", "currentVersion": "3", "currentTripVersion": "2", "currentItineraryVersion": "3" }
  }
}
```

## 3. Lỗi, phân trang và retry

| HTTP | Ý nghĩa và cách xử lý |
| --- | --- |
| 400 | JSON/query/cursor sai cú pháp; sửa request |
| 401 | Thiếu/hết hạn/không hợp lệ phiên; chỉ refresh với ACCESS_TOKEN_EXPIRED |
| 403 | Đã xác thực nhưng không có quyền hành động |
| 404 | Không tồn tại hoặc không được phép biết tài nguyên đó tồn tại |
| 409 | Xung đột version/trạng thái/chỗ/ID retry; không retry mù |
| 410 | Mã/lời mời/draft hết hạn hoặc tệp đã xóa, sau khi kiểm tra quyền |
| 413 / 415 | Tệp quá lớn / media type không được hỗ trợ |
| 422 | Body đúng JSON nhưng sai field hoặc nghiệp vụ; details chỉ ra field |
| 429 | Vượt giới hạn; tuân theo Retry-After (giây) |
| 503 | Provider/service tạm lỗi hoặc quota storage; xử lý theo error.code |
| 500 | Lỗi không dự kiến; hiển thị lỗi và requestId để tra cứu |

- FE branch theo **error.code**, không parse message. Message tiếng Việt để hiển thị; code mới/lỗi không biết có fallback chung. Không dùng HTTP 200 chứa success=false cho lỗi.
- Người ngoài trip/không phải người nhận thường nhận 404 để không lộ tài nguyên; thành viên biết trip nhưng thiếu quyền owner nhận 403. Trả lỗi media đã xóa chỉ sau kiểm tra quyền; không dò trạng thái tệp người khác.
- Trường dùng lại như `Error409` liệt kê tập code toàn API; mỗi operation chỉ phát code liên quan đến nghiệp vụ mô tả tại đó. Field `details[].field` dùng đường dẫn dạng `days[0].items[1].startTime`.
- Cursor do backend ký/kiểm tra hoặc ánh xạ ở server, gắn với user và bộ lọc. Không dùng offset hoặc timestamp đơn lẻ làm cursor. Thứ tự mặc định createdAt DESC, id DESC; ngoại lệ ghi ở operation.
- Trang cuối: hasMore=false, nextCursor=null. Trang rỗng trả items=[]; trang trước đã đọc không bảo đảm snapshot bất biến khi có thay đổi đồng thời, FE dedupe theo ID.
- GET có thể retry giới hạn 3 lần với backoff/jitter khi lỗi mạng/503/429. Không tự retry 4xx trừ quy trình refresh với ACCESS_TOKEN_EXPIRED. STORAGE_QUOTA_EXCEEDED cần dọn dữ liệu, không vòng lặp upload.
- Mutation chỉ tự retry khi quy tắc của operation cho phép. Create trip/upload/rotate mã không có idempotency key tổng quát; timeout không đồng nghĩa chưa ghi. FE hiển thị lỗi và đối soát danh sách/trạng thái trước thao tác lại.
- Không tự thêm `Idempotency-Key` rồi giả định backend đã hỗ trợ. Các khóa chống trùng của v1 được mô tả bên dưới.

## 4. Auth, thiết bị và quyền

**Backend phải:**

- Kiểm tra token, trạng thái tài khoản, binding thiết bị và quyền trên từng REST request, STOMP CONNECT/SUBSCRIBE và trước khi giao event. Không tin nút ẩn ở FE là biện pháp phân quyền.
- Register/login gắn installation với tài khoản chỉ sau xác thực thành công; installationId không phải bí mật xác thực. Token/phiên phải xác định device; API devices/current không đổi chủ bằng userId/installationId gửi lên.
- Rotate refresh một lần trong transaction; reuse thu hồi cả family. Logout thu hồi family trên device, xóa token FCM/tắt push và tăng bindingVersion. Chặn phiên đã thu hồi, kể cả JWT chưa hết hạn.
- Không trả email trong UserSummary/QR/friendship/chat/member. Mã QR chỉ mở hồ sơ giới hạn; không tự kết bạn/cấp quyền trip.
- Role OWNER suy ra từ trip.ownerId. Mọi thành viên ACTIVE sửa lịch/chat/saved place/location; owner quản lý trip/thành viên/lời mời/mã. Chủ tài khoản chỉ sửa profile/settings/inbox của chính mình.

**Frontend phải:**

- Lưu token trong secure storage, không AsyncStorage thuần; không đưa token vào URL, log, ảnh lỗi hoặc repo.
- Chỉ chạy **một refresh tại một thời điểm** và cho các request khác chờ. Sau refresh thành công retry request gốc tối đa một lần. Refresh thất bại/response bị mất không retry token cũ vô hạn; yêu cầu đăng nhập lại.
- Logout gọi backend khi còn mạng/phiên, rồi xóa token và cache riêng tư ngay cả khi lỗi mạng. Phiên server không tự biến mất chỉ vì đã xóa local.
- Dùng base URL từ cấu hình để chuyển mock/local/staging, không gắn mock fallback vào production. Không gọi Groq/R2/Places bằng secret backend từ app.

## 5. Quy tắc nghiệp vụ hai bên cùng giữ

### Chuyến, lời mời và kết bạn

- Một thành phố VN, 1–5 ngày tính cả hai đầu, tối đa 10 ACTIVE gồm owner. Budget là dự kiến **toàn nhóm**; null là chưa đặt, "0" là đã đặt bằng 0.
- Tạo chuyến đồng thời tạo owner, itinerary và đủ ngày rỗng. Kiểm tra chỗ cuối trong transaction; invitation chưa nhận không giữ chỗ.
- Chủ không tự rời/bị loại; v1 không chuyển quyền. LEFT được vào lại bằng mã hợp lệ; REMOVED chỉ vào bằng lời mời mới sau lúc bị loại.
- Mã chuyến khác friendCode. Mã rõ chỉ hiện lúc tạo/rotate, không có endpoint lấy lại; backend chỉ lưu digest.
- Kết bạn hai chiều đồng thời chỉ có một PENDING; tạo lời mời trả request hiện có hoặc friendship. Gửi ngược chiều không tự accept. Accept/reject/cancel chỉ đúng actor; đã xử lý thì trả trạng thái hiện tại.
- Owner chỉ mời người đang là bạn tại lúc tạo. Hủy kết bạn không xóa membership và không vô hiệu invitation còn hạn đã cấp.
- Mất quyền trip: FE dừng socket/cập nhật vị trí, bỏ dữ liệu cache có liên quan; server chặn cả media, lịch sử chat và event mới.

### Lịch và AI

- `trip.version` và `itinerary.version` độc lập. Trip PATCH dùng expectedTripVersion; itinerary PUT dùng expectedVersion. Chat/membership không tăng trip.version.
- Đổi ngày tăng cả hai version; rút ngắn còn mục trong ngày bị cắt -> DAYS_NOT_EMPTY. Đổi city khi còn PLACE hoặc saved places -> CITY_HAS_PLACES. Backend không tự xóa nội dung để làm request thành công.
- PUT lịch gửi **đủ tất cả ngày** và tất cả mục muốn giữ. DayNumber đủ 1..duration. id của mục cũ được giữ; mục mới bỏ id. Thứ tự array xác định position 0..N-1, đồng thời phải đúng thứ tự giờ, không chồng lấn.
- NOTE có placeId=null và title không trắng; PLACE có placeId tồn tại, đúng city. estimatedCostVnd=null -> UNKNOWN; số do người dùng nhập -> USER. Backend giữ origin của mục cũ, mục thủ công mới -> MANUAL.
- FE giữ nội dung form khi gặp 409, lấy dữ liệu mới để người dùng quyết định áp dụng lại. Không đổi expectedVersion rồi tự gửi lại khiến mất sửa của người khác.
- AI tạo draft riêng, không tự đổi lịch. Backend chọn candidate place thật và validate toàn bộ result; không nhận giá AI làm báo giá. DTO API dùng camelCase; JSONB nội bộ trong ERD minh họa snake_case cần mapper riêng.
- Tạo draft chống lặp theo (trip,user,clientRequestId); cùng ID/payload trả draft cũ, khác payload ->409. Tạo lại có chủ ý dùng ID mới.
- Apply kiểm tra cả hai base version, hạn, quyền và dữ liệu; thay toàn lịch đúng một lần. Retry draft APPLIED trả **biên nhận apply cũ**, kể cả lịch đã sửa tiếp; FE GET itinerary hiện tại, không dùng receipt như snapshot lịch.
- Tuyến chỉ đi qua PLACE theo thứ tự với WALK/DRIVE. Route trả itineraryVersion; FE bỏ response nếu version đã đổi. Provider lỗi vẫn cho sửa lịch thủ công.
- Places thiếu dữ liệu hiển thị chưa xác định; hiển thị attribution do backend trả. Không lưu dài hạn nội dung provider trong DB/draft hoặc app offline cache chỉ vì có field trả về.

### Upload và chat

- 10 MB = **10.000.000 byte**, không phải 10 MiB. Chỉ JPEG/PNG/WebP/PDF; avatar không PDF. Backend kiểm tra byte thật, định dạng và quota 2.000.000.000 byte gồm thumbnail và reservation.
- Upload thành công -> media READY -> PATCH profile hoặc POST message để attach. Upload lỗi không tạo message trống. READY chưa attach được dọn sau 24h.
- Một tin tối đa một media, phải CHAT/cùng trip/do sender upload; không gắn lại cho tin khác. TEXT có body không trắng; IMAGE/PDF có mediaId, caption tùy chọn.
- Mỗi thao tác gửi mới tạo một clientMessageId UUID, lưu cùng pending message. Retry giữ nguyên ID/payload/mediaId. Cùng ID/payload trả tin cũ, khác ->409; không tạo ID mới chỉ vì timeout.
- Backend lưu message + seq + attach media + inbox/outbox cùng transaction, rồi mới phát event. DB không lưu trạng thái gửi lỗi của client.
- Chat lịch sử/tải bù dùng seq string, luôn trả items tăng dần. Không truyền beforeSeq và afterSeq cùng lúc. Sau reconnect dùng afterSeq cuối đã hợp nhất, tải tiếp đến hasMore=false.
- Sender hoặc owner còn ACTIVE được xóa attachment. Message giữ media tombstone; UI hiện “Tệp đã xóa”. Download cần Bearer header; không nhét token vào URL để hiển thị ảnh.
- Tệp đã tải vào thiết bị không thể thu hồi vật lý từ server. FE dọn cache khi mất quyền; mọi lần tải mới đều được backend kiểm tra.

### Socket, vị trí và push

- Dùng đúng destinations/payload trong x-realtime. Không dùng STOMP SEND để ghi nghiệp vụ. WebSocket chưa có mock broker trong bộ mock này.
- Event có thể lặp, đến khác thứ tự hoặc mất khi offline. Dedupe eventId/message.id/notification.id; đối chiếu version. Socket không thay cho REST source of truth.
- Reconnect: đăng ký topic trước, buffer event, tải bù REST, merge/dedupe rồi xử lý buffer. Refetch snapshot các luồng không có durable cursor.
- Location mặc định tắt, chỉ foreground và người dùng bật. Gửi khoảng 10s/lần; TTL 60s do server tính. FE xóa marker khi expiresAt đã qua kể cả không nhận event xóa, dùng serverTime để bù sai lệch đồng hồ.
- Tắt chia sẻ/xuống nền: dừng lịch gửi, tuần tự hóa với request đang gửi rồi DELETE khi có thể; không gửi lại PUT cũ sau DELETE. Mất mạng để TTL xử lý, không ngầm bật lại khi mở app.
- Revocation không dựa riêng Redis Pub/Sub: backend kiểm tra quyền hiện tại trước fanout. Bỏ location có membershipVersion cũ. Không có bảng lịch sử GPS, không log tọa độ.
- FCM chỉ payload string theo x-push, không chat body, tọa độ, URL riêng tư. Tap -> GET notification -> tải resource và kiểm tra quyền.
- Mute chat/lịch chỉ tắt push, inbox vẫn lưu. Foreground ở đúng chat không thêm banner. Không gửi push cho actor; token đổi cập nhật devices/current. “FCM đã nhận” không đồng nghĩa điện thoại đã hiển thị.

## 6. Quy trình thay đổi và bàn giao

1. Người cần thay đổi sửa **openapi.json + ví dụ + TEAM_RULES nếu thay hành vi + CHANGELOG** trong cùng PR trước hoặc cùng implementation. Nêu màn hình/endpoint bị ảnh hưởng.
2. Người phụ trách backend và frontend cùng review contract. Không ghi “đã thống nhất” nếu chưa có review; contract hiện tại là baseline được tạo để triển khai.
3. Chạy validator và mock smoke test. Sinh/cập nhật type từ schema bằng công cụ team chọn; không sửa tay file được generate. Endpoint chưa làm vẫn dùng mock example theo cùng contract.
4. Backend triển khai DTO/validation/auth/service theo contract, FE triển khai API adapter và trạng thái loading/empty/error/retry theo examples. Không chờ toàn bộ backend mới tích hợp.
5. Khi một module sẵn sàng, chuyển base URL của module/môi trường sang backend và chạy ca chấp nhận chung. Không âm thầm quay lại mock khi backend lỗi.
6. Tiến độ nên dùng bảng PR/issue: planned → implementing → contract-tested → integrated, ghi commit contract tham chiếu và bằng chứng. Mock trả 200 không phải trạng thái backend hoàn thành.

### Version và tương thích

- Patch (1.0.x): sửa mô tả/ví dụ không đổi hành vi.
- Minor (1.x.0): thêm endpoint hoặc field response tùy chọn có thể bỏ qua, giữ tương thích client cũ.
- Major: đổi tên/kiểu/required/nullable, xóa field/endpoint, đổi nghĩa/HTTP/quyền, thu hẹp validation; thêm enum response cũng phải đánh giá là breaking vì UI có thể switch đầy đủ. Dùng /api/v2 hoặc kế hoạch migration được cả hai review.
- Enum mới không tự coi là minor. Field request mới dù optional cần backend hỗ trợ trước khi FE gửi vì backend v1 từ chối field lạ.
- Production không để APK cũ hỏng ngay khi backend mới lên. Ghi lịch deprecate/migration khi có phiên bản đã phát hành.

## 7. Điều kiện nghiệm thu chung

| Nhóm | Backend phải chứng minh | Frontend phải chứng minh |
| --- | --- | --- |
| Contract | Response và lỗi khớp schema, đúng HTTP | Parse đúng 204/binary/null/bigint, bỏ qua field mới |
| Auth | Refresh single-use, logout/device revoke | Single-flight refresh, đổi tài khoản không lộ cache cũ |
| Quyền | Người ngoài/member bị loại không đọc/ghi REST/socket/media | Dừng subscription/vị trí, điều hướng khi 403/404 |
| Bạn bè | Hai lời mời ngược chiều chỉ một PENDING | Không hiển thị đã là bạn trước accept |
| Thành viên | Hai người tranh chỗ thứ 10 chỉ một thành công | Hiển thị TRIP_FULL; không tăng số ảo |
| Lịch | Hai PUT cùng version: một thành công, một 409 | Giữ form khi conflict, không ghi đè tự động |
| AI | Draft cũ không apply, retry apply không tăng lần hai | GENERATING/READY/FAILED/stale/expired; preview trước apply |
| Media | Sai định dạng/10 MB/scope/uploader bị chặn | Upload tiến trình/lỗi, attachment tombstone |
| Chat | Retry cùng ID một message; reconnect đủ seq | Dedupe optimistic/REST/socket, không mất tin khi nối lại |
| Location | TTL + membershipVersion + revoke thực sự | Foreground opt-in, tắt/background dừng gửi, marker hết hạn |
| Push | Outbox và token binding đúng, không gửi actor | Mute/inbox, foreground/banner, tap sau mất quyền |
| Tích hợp | Test hai backend dùng chung DB/Redis | Test hai thiết bị, mạng yếu, đổi mock/backend bằng cấu hình |

Validator trong repo kiểm tra **hình thức contract và ví dụ**, mock là fixture tĩnh. Các ca quyền, transaction, race, provider, upload thực, STOMP và FCM phải được test khi có backend/mobile; không tuyên bố đã qua từ bộ mock.

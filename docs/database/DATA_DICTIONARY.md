# TripMate — Từ điển dữ liệu và cách dùng index

Cập nhật: **17/09/2026**. Dành cho teammate đọc schema trước khi làm backend/mobile.

Nguồn chuẩn là [tripmate_v1.sql](tripmate_v1.sql); [DBML](tripmate_v1.dbml) giúp xem sơ đồ và [ERD v1](../../TRIPMATE_ERD_V1.md) giải thích transaction nghiệp vụ. Tài liệu này mô tả **đúng schema tham chiếu hiện tại**, không tuyên bố backend đã được triển khai.

Phạm vi: **23 bảng, 213 cột, 55 FK và 73 index** (23 index PK, 22 index từ UNIQUE constraint, 28 index khai báo bằng CREATE INDEX, trong đó 3 là unique partial index). Không tính index của bảng hệ thống PostgreSQL.

## Cách đọc nhanh

- **Một hàng** là một bản ghi: một user, một lời mời hoặc một tin nhắn.
- **PK** định danh duy nhất; PK ghép như `(trip_id,user_id)` định danh bằng cả cặp.
- **FK** buộc tham chiếu tới hàng có thật, không tự cấp quyền truy cập.
- **UNIQUE** chống giá trị/cặp trùng. Với UNIQUE thường của schema này, nhiều NULL vẫn được phép.
- **CHECK** kiểm tra dữ liệu hàng. Các quy tắc nhiều hàng như tối đa 10 ACTIVE cần transaction ở service.
- **1–N**: một hàng cha có thể được nhiều hàng con tham chiếu. **N–N**: thông qua bảng nối. Một FK không buộc hàng cha phải có con.
- **NULL** biểu thị chưa có/không áp dụng; khác số 0, chuỗi rỗng và false.
- Bảng thuộc tính ghi mặc định của SQL, không phải giá trị backend được phép bỏ qua khi cập nhật.

PostgreSQL tự tạo index cho PK/UNIQUE, nhưng không tự tạo index phía cột FK tham chiếu. FK trong schema dùng MATCH SIMPLE: khi một cột trong FK ghép là NULL, phép kiểm tra FK đó có thể được bỏ qua; CHECK khác có thể vẫn hạn chế NULL. [Tài liệu constraints PostgreSQL 17](https://www.postgresql.org/docs/17/ddl-constraints.html)

### Quy ước dữ liệu chung

| Kiểu/quy ước | Cách hiểu trong TripMate |
| --- | --- |
| uuid | ID backend sinh, trừ các ID yêu cầu/lần cài đặt do client cấp theo API contract; SQL chưa có DEFAULT sinh UUID |
| varchar(n), text | Chuỗi; varchar giới hạn độ dài. Những trường bắt buộc không rỗng có CHECK riêng, NOT NULL chưa đủ |
| char(64) | Dùng cho digest/hash; kiểu cột không tự xác minh đây là 64 ký tự hex hợp lệ |
| bigint | Số nguyên cho tiền, version, seq hoặc byte; API dùng chuỗi nếu có thể vượt độ chính xác của JavaScript |
| timestamptz | Một thời điểm; DB/session quy ước UTC, app hiển thị theo múi giờ phù hợp |
| date / time | Ngày hoặc giờ địa phương của chuyến, dùng Asia/Ho_Chi_Minh |
| now() | Giá trị thời gian đầu transaction trong PostgreSQL; không dùng created_at để suy luận thứ tự commit |
| created_at / updated_at | Có DEFAULT lúc insert; backend tự ghi updated_at khi sửa vì schema chưa có trigger |
| status | varchar + CHECK các giá trị; CHECK chưa bảo vệ toàn bộ chuyển trạng thái |
| jsonb | Draft/payload có schema ở backend; ID nằm trong JSON không tự trở thành FK |
| deleted_at / purged_at | Xóa logic khác xác nhận object đã được dọn khỏi storage |

### Bản đồ nghiệp vụ

| Luồng | Các bảng liên quan |
| --- | --- |
| Hồ sơ và phiên | app_users → user_devices, refresh_tokens; user_interests nối interests |
| Bạn bè | friend_requests giữ lịch sử có hướng; friendships giữ cặp bạn hiện tại |
| Chuyến | trips ↔ trip_members; cities là danh mục; invitation/code là cách xin tham gia |
| Địa điểm/lịch | places → trip_saved_places hoặc itinerary_items; itineraries → itinerary_days → itinerary_items |
| AI | ai_itinerary_drafts tham chiếu itinerary, chỉ khi apply mới sửa lịch |
| Tệp/chat | media_assets giữ metadata; chat_messages tham chiếu media đúng trip/uploader |
| Thông báo | notifications là inbox; outbox_events là công việc; push_deliveries theo thiết bị/binding |
| Vị trí | Redis TTL, không có bảng lịch sử GPS trong PostgreSQL |

## Mục lục bảng

1. [app_users](#app_users) — Tài khoản, hồ sơ và điểm bắt đầu của quan hệ người dùng.
2. [user_devices](#user_devices) — Một hàng cho một lần cài app, giữ ổn định qua các lần đăng nhập.
3. [refresh_tokens](#refresh_tokens) — Lịch sử refresh token và chuỗi rotation của phiên.
4. [interests](#interests) — Danh mục sở thích do ứng dụng quản lý.
5. [user_interests](#user_interests) — Bảng nối quan hệ nhiều–nhiều giữa user và sở thích.
6. [friend_requests](#friend_requests) — Lịch sử lời mời kết bạn có hướng gửi–nhận.
7. [friendships](#friendships) — Danh sách quan hệ bạn bè hiện tại, mỗi cặp một hàng.
8. [cities](#cities) — Danh mục thành phố được phép chọn trong v1.
9. [trips](#trips) — Thông tin chuyến và hàng khóa chung khi thay đổi nghiệp vụ trong chuyến.
10. [trip_members](#trip_members) — Một membership lịch sử cho mỗi user trong mỗi chuyến; cũng lưu tùy chọn push.
11. [trip_invitations](#trip_invitations) — Lời mời cá nhân vào trip do owner gửi cho một bạn.
12. [trip_join_codes](#trip_join_codes) — Lịch sử phát hành/thu hồi mã tham gia chuyến.
13. [places](#places) — Định danh provider dùng chung giữa nhiều chuyến.
14. [trip_saved_places](#trip_saved_places) — Địa điểm đã lưu chung trong một chuyến, không phải bookmark cá nhân.
15. [itineraries](#itineraries) — Một lịch hiện hành tối đa cho mỗi trip, version áp dụng toàn bộ lịch.
16. [itinerary_days](#itinerary_days) — Các ngày tương đối của lịch trình.
17. [itinerary_items](#itinerary_items) — Mục địa điểm hoặc ghi chú trong ngày, có thứ tự và khoảng giờ.
18. [ai_itinerary_drafts](#ai_itinerary_drafts) — Bản nháp AI tách biệt; chỉ apply mới thay lịch hiện hành.
19. [media_assets](#media_assets) — Metadata tệp trong R2, ownership, scope và dung lượng đã dự trữ.
20. [chat_messages](#chat_messages) — Tin nhắn bền vững, một phòng tương ứng một trip.
21. [notifications](#notifications) — Inbox bền vững theo người nhận, không phụ thuộc push đã đến hay chưa.
22. [outbox_events](#outbox_events) — Công việc hậu commit để publish realtime, fanout push hoặc dọn R2.
23. [push_deliveries](#push_deliveries) — Trạng thái gửi riêng cho từng notification và binding thiết bị.

<a id="app_users"></a>

## 1. `app_users`

Tài khoản, hồ sơ và điểm bắt đầu của quan hệ người dùng.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh tài khoản do backend sinh; dùng làm khóa tham chiếu, không dùng email làm PK. |
| `email` | `varchar(254)` | Không NULL; UNIQUE | Email đăng nhập. Phải trim + lowercase; SQL yêu cầu dài hơn 3 ký tự và duy nhất, chưa kiểm tra đầy đủ cú pháp email. |
| `password_hash` | `text` | Không NULL | Kết quả password encoder; không lưu mật khẩu gốc và không dùng SHA-256 thuần để băm mật khẩu. |
| `display_name` | `varchar(100)` | Không NULL | Tên hiển thị trên hồ sơ, QR và chat; không được rỗng sau trim. |
| `phone` | `varchar(32)` | Allows NULL | Phone number collected by manual registration; normalized by the API and optional for Google-created users until profile completion is implemented. |
| `friend_code` | `varchar(32)` | Không NULL; UNIQUE | Mã kết bạn công khai để tạo QR/nhập tay. Backend sinh ngẫu nhiên; không phải token đăng nhập. |
| `avatar_media_id` | `uuid` | Cho phép NULL | Tệp avatar hiện tại; NULL là chưa có. FK ghép với id buộc tệp thuộc chính tài khoản. |
| `status` | `varchar(16)` | Không NULL; mặc định `'ACTIVE'` | ACTIVE hoặc DISABLED. Đây là trạng thái tài khoản; backend phải kiểm tra khi xác thực. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(avatar_media_id,id)` | [media_assets](#media_assets) `(id,uploader_id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được tối đa 1 hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [user_devices](#user_devices) `(user_id)` → `(id)`; [refresh_tokens](#refresh_tokens) `(user_id)` → `(id)`; [user_interests](#user_interests) `(user_id)` → `(id)`; [friend_requests](#friend_requests) `(sender_id)` → `(id)`; [friend_requests](#friend_requests) `(recipient_id)` → `(id)`; [friendships](#friendships) `(user_low_id)` → `(id)`; [friendships](#friendships) `(user_high_id)` → `(id)`; [trips](#trips) `(owner_id)` → `(id)`; [trip_members](#trip_members) `(user_id)` → `(id)`; [trip_invitations](#trip_invitations) `(inviter_id)` → `(id)`; [trip_invitations](#trip_invitations) `(invitee_id)` → `(id)`; [trip_join_codes](#trip_join_codes) `(created_by)` → `(id)`; [trip_saved_places](#trip_saved_places) `(added_by)` → `(id)`; [itineraries](#itineraries) `(updated_by)` → `(id)`; [itinerary_items](#itinerary_items) `(created_by)` → `(id)`; [itinerary_items](#itinerary_items) `(updated_by)` → `(id)`; [ai_itinerary_drafts](#ai_itinerary_drafts) `(requested_by)` → `(id)`; [ai_itinerary_drafts](#ai_itinerary_drafts) `(applied_by)` → `(id)`; [media_assets](#media_assets) `(uploader_id)` → `(id)`; [media_assets](#media_assets) `(deleted_by)` → `(id)`; [chat_messages](#chat_messages) `(sender_id)` → `(id)`; [notifications](#notifications) `(recipient_id)` → `(id)`; [notifications](#notifications) `(actor_id)` → `(id)`; [push_deliveries](#push_deliveries) `(recipient_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

Email/tên có CHECK; avatar có FK ownership. Service kiểm tra avatar đúng purpose AVATAR, trạng thái READY và MIME ảnh trước khi gắn. Không có UNIQUE riêng avatar_media_id, nhưng FK ghép với id buộc mỗi avatar chỉ có thể được chính uploader chọn.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(email)` | `email` | Toàn bảng | Chặn email trùng và tra đăng nhập theo email đã chuẩn hóa; không cần thêm index email thường. |
| UNIQUE `(friend_code)` | `friend_code` | Toàn bảng | Tra hồ sơ giới hạn từ mã QR và tránh cấp hai user cùng mã. |

<a id="user_devices"></a>

## 2. `user_devices`

Một hàng cho một lần cài app, giữ ổn định qua các lần đăng nhập.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh hàng thiết bị ổn định, được refresh token và delivery tham chiếu. |
| `installation_id` | `uuid` | Không NULL; UNIQUE | UUID của một lần cài đặt app. Duy nhất, nhưng không phải bằng chứng xác thực hay ID phần cứng. |
| `user_id` | `uuid` | Cho phép NULL | Tài khoản đang gắn thiết bị; NULL sau logout. Một user có thể có nhiều thiết bị. |
| `binding_version` | `bigint` | Không NULL; mặc định `1` | Số phiên bản liên kết tài khoản/token, > 0. Tăng khi đổi tài khoản/token hoặc logout để delivery cũ không gửi nhầm. |
| `fcm_token` | `text` | Cho phép NULL; UNIQUE | Native FCM token hiện tại. NULL khi chưa đăng ký hoặc logout; không chép token sang outbox. |
| `push_enabled` | `boolean` | Không NULL; mặc định `false` | Cho phép gửi push tới thiết bị này; backend vẫn kiểm tra token, binding và quyền theo trip. |
| `last_seen_at` | `timestamptz` | Không NULL; mặc định `now()` | Lần gần nhất backend ghi nhận hoạt động thiết bị; không chứng minh app còn online. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(user_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [refresh_tokens](#refresh_tokens) `(device_id)` → `(id)`; [push_deliveries](#push_deliveries) `(device_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

CHECK: user_id NULL thì fcm_token phải NULL và push_enabled=false. Chiều ngược lại không bắt buộc có token khi có user. Thay binding phải khóa hàng và tăng version; installation_id không đủ để chiếm quyền thiết bị.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(installation_id)` | `installation_id` | Toàn bảng | Đăng ký lại cùng lần cài đặt tìm đúng hàng ổn định; UNIQUE không chứng minh người gửi sở hữu thiết bị. |
| UNIQUE `(fcm_token)` | `fcm_token` | Toàn bảng | Chặn một token không NULL nằm trên hai hàng thiết bị; nhiều NULL được phép. |
| `ix_devices_user` | `user_id` | Toàn bảng | Tìm các thiết bị của một user để fanout push hoặc xử lý logout; WHERE user_id = ... |

<a id="refresh_tokens"></a>

## 3. `refresh_tokens`

Lịch sử refresh token và chuỗi rotation của phiên.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh bản ghi refresh token, khác chuỗi token bí mật cấp cho client. |
| `user_id` | `uuid` | Không NULL | Chủ phiên. Vẫn giữ lịch sử token theo user dù thiết bị đăng xuất/đổi tài khoản. |
| `device_id` | `uuid` | Không NULL | Thiết bị của phiên. FK chỉ bảo đảm thiết bị tồn tại; service kiểm tra tài khoản/binding khi dùng. |
| `family_id` | `uuid` | Không NULL | UUID nhóm token trong một chuỗi rotation; dùng thu hồi cả family khi phát hiện replay. Không có bảng family/FK riêng. |
| `parent_token_id` | `uuid` | Cho phép NULL; UNIQUE | Token trước đó trong chuỗi; NULL ở token gốc. UNIQUE giới hạn mỗi cha có tối đa một token con; cấm tự tham chiếu. |
| `token_hash` | `char(64)` | Không NULL; UNIQUE | SHA-256 của refresh token ngẫu nhiên; tra cứu bằng hash. Khác password_hash vì nguồn là token entropy cao. |
| `expires_at` | `timestamptz` | Không NULL | Hạn dùng của token, phải sau created_at. Thời hạn tối đa của family do service kiểm soát. |
| `consumed_at` | `timestamptz` | Cho phép NULL | Thời điểm token đã dùng để refresh; NULL là chưa consumed. Giữ hàng cũ để phát hiện replay. |
| `revoked_at` | `timestamptz` | Cho phép NULL | Thời điểm thu hồi; NULL là chưa thu hồi. Token hợp lệ còn cần chưa hết hạn/chưa consumed. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(user_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(device_id)` | [user_devices](#user_devices) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(parent_token_id)` | [refresh_tokens](#refresh_tokens) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được tối đa 1 hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [refresh_tokens](#refresh_tokens) `(parent_token_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

FK tự tham chiếu parent_token_id; UNIQUE chặn hai con cùng cha. Token cha khác user/device/family vẫn có thể qua FK, nên service phải bảo vệ tính liên tục chuỗi, xử lý replay và giới hạn thời hạn family.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(parent_token_id)` | `parent_token_id` | Toàn bảng | Mỗi token cha chỉ có tối đa một token con để chống rotation hai nhánh; nhiều token gốc NULL được phép. |
| UNIQUE `(token_hash)` | `token_hash` | Toàn bảng | Tra refresh token từ digest và chống hash trùng; không đưa raw token vào SQL log. |
| `ix_refresh_user_device` | `user_id,device_id` | Toàn bảng | Tìm/thu hồi các token của một user trên một thiết bị; dùng tốt khi lọc user_id, rồi device_id. Không tối ưu riêng device_id. |
| `ix_refresh_family` | `family_id` | Toàn bảng | Thu hồi/tra lịch sử toàn family sau replay; WHERE family_id = ... |
| `ix_refresh_expiry` | `expires_at` | Toàn bảng | Tìm token quá hạn để dọn theo expires_at; việc xóa vẫn phải xét FK cha–con. |

<a id="interests"></a>

## 4. `interests`

Danh mục sở thích do ứng dụng quản lý.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `code` | `varchar(32)` | Không NULL; PK | Mã sở thích của ứng dụng, ví dụ FOOD/NATURE/CULTURE; khóa ổn định để client tham chiếu. |
| `label` | `varchar(80)` | Không NULL | Nhãn hiển thị cho sở thích, ví dụ Ẩm thực. Danh mục phải được seed khi triển khai. |

### Quan hệ

Bảng này không chứa FK tới bảng khác.

**Các bảng trỏ vào bảng này:** [user_interests](#user_interests) `(interest_code)` → `(code)`.

### Ràng buộc và việc backend phải làm

Chưa có dữ liệu seed trong DDL. Thay label không cần đổi code; xóa code đang được chọn bị FK chặn.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(code)` | `code` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |

<a id="user_interests"></a>

## 5. `user_interests`

Bảng nối quan hệ nhiều–nhiều giữa user và sở thích.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `user_id` | `uuid` | Không NULL; PK | Tài khoản chọn sở thích; là một phần PK ghép. |
| `interest_code` | `varchar(32)` | Không NULL; PK | Mã sở thích được chọn; cùng user_id tạo một lựa chọn duy nhất. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(user_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(interest_code)` | [interests](#interests) `(code)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

PK ghép chặn chọn trùng một sở thích. Chưa có index bắt đầu bằng interest_code; chỉ thêm nếu có nhu cầu tra ngược được đo thực tế.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(user_id,interest_code)` | `user_id,interest_code` | Toàn bảng | Chặn chọn trùng và lấy sở thích theo user_id. Không thay thế index bắt đầu bằng interest_code. |

<a id="friend_requests"></a>

## 6. `friend_requests`

Lịch sử lời mời kết bạn có hướng gửi–nhận.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh một lần gửi lời mời; lần gửi mới sau từ chối/hủy có ID mới. |
| `sender_id` | `uuid` | Không NULL | Người gửi; được hủy lời mời đang chờ theo kiểm tra service. |
| `recipient_id` | `uuid` | Không NULL | Người nhận; được chấp nhận/từ chối. Phải khác sender_id. |
| `status` | `varchar(16)` | Không NULL; mặc định `'PENDING'` | PENDING, ACCEPTED, REJECTED hoặc CANCELLED. SQL kiểm tra giá trị; các chuyển trạng thái hợp lệ do service kiểm soát. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `resolved_at` | `timestamptz` | Cho phép NULL | NULL khi PENDING; bắt buộc có khi đã xử lý. SQL cưỡng chế tương ứng hai chiều. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(sender_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(recipient_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [notifications](#notifications) `(friend_request_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

CHECK cấm tự mời và ràng buộc resolved_at với status. Chấp nhận phải cập nhật request, thêm friendship, notification/outbox trong cùng transaction; FK/index không tự làm các bước này.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| `uq_friend_pending_pair` (unique) | `least(sender_id,recipient_id),greatest(sender_id,recipient_id)` | `status = 'PENDING'` | Chống hai lời mời đang chờ cho cùng cặp ở cả hai chiều. least/greatest chuẩn hóa cặp; lời mời đã xử lý không nằm trong index. |
| `ix_friend_requests_inbox` | `recipient_id,status,created_at DESC` | Toàn bảng | Danh sách lời mời nhận theo người nhận + trạng thái, mới nhất trước. Bỏ lọc status có thể phải sort thêm. |
| `ix_friend_requests_sent` | `sender_id,status,created_at DESC` | Toàn bảng | Danh sách lời mời đã gửi theo sender + trạng thái, mới nhất trước. |

<a id="friendships"></a>

## 7. `friendships`

Danh sách quan hệ bạn bè hiện tại, mỗi cặp một hàng.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `user_low_id` | `uuid` | Không NULL; PK | UUID nhỏ hơn của cặp bạn bè. Không phải vai trò người gửi. |
| `user_high_id` | `uuid` | Không NULL; PK | UUID lớn hơn của cặp. CHECK low < high vừa chuẩn hóa thứ tự vừa cấm tự kết bạn. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(user_low_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(user_high_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

CHECK low < high và PK ghép chuẩn hóa quan hệ không hướng. Không có FK nối tới một friend_request cụ thể. Hủy kết bạn xóa hàng này, không xóa lịch sử request hoặc membership.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(user_low_id,user_high_id)` | `user_low_id,user_high_id` | Toàn bảng | Chặn cặp bạn trùng và lấy bạn theo user_low_id; tra phía high cần ix_friendships_high. |
| `ix_friendships_high` | `user_high_id` | Toàn bảng | Tìm bạn khi user ở phía high. PK phục vụ phía low; cần kết hợp cả hai phía mới đủ danh sách bạn. |

<a id="cities"></a>

## 8. `cities`

Danh mục thành phố được phép chọn trong v1.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `code` | `varchar(32)` | Không NULL; PK | Mã thành phố nội bộ, dự kiến HANOI/DANANG/HCMC; không coi là mã hành chính. |
| `name` | `varchar(100)` | Không NULL | Tên hiển thị thành phố. |
| `country_code` | `char(2)` | Không NULL; mặc định `'VN'` | Giới hạn VN trong v1; SQL không nhận quốc gia khác. |
| `timezone` | `varchar(64)` | Không NULL; mặc định `'Asia/Ho_Chi_Minh'` | Asia/Ho_Chi_Minh cho ngày/giờ chuyến; khác timezone UTC của session DB. |
| `enabled` | `boolean` | Không NULL; mặc định `true` | Cho phép chọn thành phố cho thao tác mới theo service. Tắt không tự xóa chuyến đã có. |

### Quan hệ

Bảng này không chứa FK tới bảng khác.

**Các bảng trỏ vào bảng này:** [trips](#trips) `(city_code)` → `(code)`.

### Ràng buộc và việc backend phải làm

CHECK chỉ VN và Asia/Ho_Chi_Minh. Không có seed thành phố trong DDL; enabled do service kiểm tra khi chọn/đổi thành phố.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(code)` | `code` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |

<a id="trips"></a>

## 9. `trips`

Thông tin chuyến và hàng khóa chung khi thay đổi nghiệp vụ trong chuyến.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh chuyến; cũng là phạm vi lịch trình, chat, media và membership. |
| `owner_id` | `uuid` | Không NULL | Người sở hữu chuyến. FK tới user và FK ghép tới membership; service bảo đảm owner luôn ACTIVE. |
| `city_code` | `varchar(32)` | Không NULL | Thành phố duy nhất của chuyến, tham chiếu danh mục cities. |
| `title` | `varchar(160)` | Không NULL | Tên chuyến; không được rỗng sau trim. |
| `description` | `text` | Cho phép NULL | Mô tả do người dùng nhập; có thể chưa nhập. |
| `start_date` | `date` | Không NULL | Ngày bắt đầu theo múi giờ thành phố. |
| `end_date` | `date` | Không NULL | Ngày cuối, tính cả ngày bắt đầu; hiệu end_date - start_date phải từ 0 đến 4. |
| `budget_vnd` | `bigint` | Cho phép NULL | Ngân sách dự kiến toàn nhóm, số nguyên VND không âm. NULL là chưa đặt; 0 là đã đặt bằng 0. |
| `version` | `bigint` | Không NULL; mặc định `0` | Phiên bản thông tin chuyến cho expectedTripVersion; tăng khi sửa thông tin, không tăng chỉ vì chat. |
| `last_chat_seq` | `bigint` | Không NULL; mặc định `0` | Bộ đếm chat riêng chuyến. Service tăng dưới khóa hàng trip, cùng transaction insert message để giữ thứ tự commit. |
| `deleted_at` | `timestamptz` | Cho phép NULL | NULL khi chưa xóa; có giá trị là soft-delete. Service chặn truy cập và xử lý thu hồi/dọn tệp. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(owner_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(city_code)` | [cities](#cities) `(code)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(id,owner_id)` | [trip_members](#trip_members) `(trip_id,user_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được tối đa 1 hàng hiện tại tham chiếu. Kiểm tra FK deferred tại COMMIT. |

**Các bảng trỏ vào bảng này:** [trip_members](#trip_members) `(trip_id)` → `(id)`; [trip_invitations](#trip_invitations) `(trip_id)` → `(id)`; [trip_join_codes](#trip_join_codes) `(trip_id)` → `(id)`; [trip_saved_places](#trip_saved_places) `(trip_id)` → `(id)`; [itineraries](#itineraries) `(trip_id)` → `(id)`; [media_assets](#media_assets) `(trip_id)` → `(id)`; [chat_messages](#chat_messages) `(trip_id)` → `(id)`; [notifications](#notifications) `(trip_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

CHECK giới hạn 1–5 ngày, ngân sách/version/bộ đếm không âm. fk_trip_owner_membership deferred giải quyết vòng trip ↔ member. Service tạo owner ACTIVE, lịch và đủ ngày cùng transaction; FK chưa buộc owner ACTIVE hoặc tối đa 10 người.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra/khóa một trip bằng id để tuần tự hóa thay đổi membership, seq và lịch. |
| `ix_trips_owner` | `owner_id` | Toàn bảng | Tra các chuyến do một người sở hữu. Danh sách chuyến tham gia nói chung bắt đầu từ trip_members. |
| `ix_trips_city` | `city_code` | Toàn bảng | Lọc/join chuyến theo city_code; không tự sắp theo ngày hoặc lọc deleted_at. |

<a id="trip_members"></a>

## 10. `trip_members`

Một membership lịch sử cho mỗi user trong mỗi chuyến; cũng lưu tùy chọn push.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `trip_id` | `uuid` | Không NULL; PK | Chuyến có membership này; phần thứ nhất PK ghép. |
| `user_id` | `uuid` | Không NULL; PK | Người tham gia; cặp trip_id/user_id chỉ có một hàng, được tái kích hoạt khi tham gia lại. |
| `status` | `varchar(16)` | Không NULL; mặc định `'ACTIVE'` | ACTIVE, LEFT hoặc REMOVED. Hàng cũ vẫn tồn tại để giữ lịch sử và các FK. |
| `membership_version` | `bigint` | Không NULL; mặc định `1` | Phiên bản membership > 0; tăng khi thu hồi/tái kích hoạt để vô hiệu sự kiện, vị trí và push cũ. |
| `chat_push_enabled` | `boolean` | Không NULL; mặc định `true` | Tùy chọn nhận push chat trong chuyến; không xóa inbox và không chặn chat trực tiếp. |
| `itinerary_push_enabled` | `boolean` | Không NULL; mặc định `true` | Tùy chọn push khi lịch trình đổi; inbox vẫn được giữ. |
| `joined_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tham gia của lần ACTIVE hiện tại/gần nhất; cập nhật khi tái kích hoạt. |
| `ended_at` | `timestamptz` | Cho phép NULL | NULL khi ACTIVE; bắt buộc có khi LEFT/REMOVED. SQL cưỡng chế tương ứng này. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(user_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [trip_saved_places](#trip_saved_places) `(trip_id,added_by)` → `(trip_id,user_id)`; [itineraries](#itineraries) `(trip_id,updated_by)` → `(trip_id,user_id)`; [ai_itinerary_drafts](#ai_itinerary_drafts) `(trip_id,requested_by)` → `(trip_id,user_id)`; [media_assets](#media_assets) `(trip_id,uploader_id)` → `(trip_id,user_id)`; [chat_messages](#chat_messages) `(trip_id,sender_id)` → `(trip_id,user_id)`; [trips](#trips) `(id,owner_id)` → `(trip_id,user_id)`.

### Ràng buộc và việc backend phải làm

CHECK liên kết status và ended_at. Không có cột role: OWNER suy ra từ trips.owner_id. Tham gia/rời/loại phải khóa trip, đếm ACTIVE và cập nhật membership_version. FK từ dữ liệu lịch sử không cấp quyền hiện tại.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(trip_id,user_id)` | `trip_id,user_id` | Toàn bảng | Chặn membership trùng và lấy/đếm thành viên theo trip_id. ACTIVE và giới hạn 10 do service kiểm tra. |
| `ix_trip_members_user` | `user_id,status,trip_id` | Toàn bảng | Lấy các trip của một user theo status, ví dụ WHERE user_id = ... AND status = 'ACTIVE'. |

<a id="trip_invitations"></a>

## 11. `trip_invitations`

Lời mời cá nhân vào trip do owner gửi cho một bạn.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh một lời mời cá nhân vào chuyến. |
| `trip_id` | `uuid` | Không NULL | Chuyến được mời vào. |
| `inviter_id` | `uuid` | Không NULL | Người gửi lời mời; service kiểm tra đây là owner và đang là bạn với invitee lúc tạo. |
| `invitee_id` | `uuid` | Không NULL | Người được mời; khác inviter_id. Chỉ đúng người này được chấp nhận. |
| `status` | `varchar(16)` | Không NULL; mặc định `'PENDING'` | PENDING, ACCEPTED, REJECTED, CANCELLED hoặc EXPIRED. Một lời mời chờ chưa giữ chỗ thành viên. |
| `expires_at` | `timestamptz` | Không NULL | Hạn lời mời, sau created_at; request phải kiểm tra dù job chưa đổi status sang EXPIRED. |
| `resolved_at` | `timestamptz` | Cho phép NULL | NULL khi PENDING; có thời điểm khi đã xử lý/hết hạn/hủy. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(inviter_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(invitee_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [notifications](#notifications) `(trip_invitation_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

CHECK người mời khác người nhận, hạn sau thời điểm tạo và trạng thái khớp resolved_at. Owner/quyền bạn bè, đúng invitee khi accept và chỗ trống do service kiểm tra. Người nhận chưa là member vẫn có thể nhận push lời mời.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| `uq_trip_invitation_pending` (unique) | `trip_id,invitee_id` | `status = 'PENDING'` | Một lời mời PENDING cho mỗi trip/invitee. Lời mời đã hết giờ nhưng còn PENDING vẫn chặn; service chuyển EXPIRED trước khi mời lại. |
| `ix_trip_invitations_inbox` | `invitee_id,status,created_at DESC` | Toàn bảng | Liệt kê lời mời vào chuyến theo invitee/status, mới nhất trước. |

<a id="trip_join_codes"></a>

## 12. `trip_join_codes`

Lịch sử phát hành/thu hồi mã tham gia chuyến.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh một lần phát hành mã tham gia. |
| `trip_id` | `uuid` | Không NULL | Chuyến mà mã cấp quyền xin tham gia. |
| `code_digest` | `char(64)` | Không NULL; UNIQUE | HMAC-SHA-256 của mã đã chuẩn hóa, dùng server secret; không lưu mã rõ. UNIQUE toàn bảng. |
| `expires_at` | `timestamptz` | Không NULL | Hạn mã sau created_at; service kiểm tra lúc dùng, index không tự loại mã hết hạn. |
| `revoked_at` | `timestamptz` | Cho phép NULL | NULL nếu chưa thu hồi. Mỗi trip chỉ có một mã chưa thu hồi, kể cả mã đó đã hết hạn. |
| `created_by` | `uuid` | Không NULL | Người phát hành mã; FK tới user, quyền owner kiểm tra tại service. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(created_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

FK created_by chỉ kiểm tra user tồn tại. Service kiểm tra owner khi tạo, hạn/rate limit khi nhập, và quy tắc REMOVED cần lời mời mới; digest không phải friend_code.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(code_digest)` | `code_digest` | Toàn bảng | Tra mã người dùng nhập sau khi server tính HMAC; chống digest trùng toàn bảng. |
| `uq_trip_unrevoked_code` (unique) | `trip_id` | `revoked_at IS NULL` | Mỗi trip tối đa một mã revoked_at IS NULL. Không phụ thuộc expires_at; phải thu hồi mã hết hạn trước khi phát hành mã mới. |

<a id="places"></a>

## 13. `places`

Định danh provider dùng chung giữa nhiều chuyến.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | UUID địa điểm nội bộ, được lịch trình và danh sách lưu tham chiếu. |
| `provider` | `varchar(16)` | Không NULL; mặc định `'GOOGLE'` | Provider định danh; v1 SQL chỉ cho GOOGLE. |
| `provider_place_id` | `text` | Không NULL | ID Google Places, không phải tên/địa chỉ. Cặp provider/ID duy nhất; không lưu toàn response Google. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

Bảng này không chứa FK tới bảng khác.

**Các bảng trỏ vào bảng này:** [trip_saved_places](#trip_saved_places) `(place_id)` → `(id)`; [itinerary_items](#itinerary_items) `(place_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

Không lưu tên, ảnh, tọa độ hoặc rating Google lâu dài trong bảng này. Xóa khỏi shortlist không xóa place đang được lịch trình dùng; policy/provider adapter quản lý việc lấy chi tiết.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(provider,provider_place_id)` | `provider,provider_place_id` | Toàn bảng | Một hàng nội bộ cho cùng place của cùng provider; dùng lookup/upsert định danh. |

<a id="trip_saved_places"></a>

## 14. `trip_saved_places`

Địa điểm đã lưu chung trong một chuyến, không phải bookmark cá nhân.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `trip_id` | `uuid` | Không NULL; PK | Chuyến sở hữu danh sách địa điểm chung. |
| `place_id` | `uuid` | Không NULL; PK | Địa điểm được lưu; mỗi trip lưu một địa điểm tối đa một lần. |
| `added_by` | `uuid` | Không NULL | Người đã lưu địa điểm. FK ghép bảo đảm từng là member; service kiểm tra ACTIVE lúc thêm. |
| `note` | `text` | Cho phép NULL | Ghi chú do người dùng tạo cho địa điểm trong riêng chuyến này. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(place_id)` | [places](#places) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(added_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id,added_by)` | [trip_members](#trip_members) `(trip_id,user_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

FK ghép added_by/trip_id bảo đảm từng có membership. Service kiểm tra ACTIVE và dữ liệu địa điểm phù hợp thành phố; không có FK trực tiếp place → city.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(trip_id,place_id)` | `trip_id,place_id` | Toàn bảng | Chặn lưu trùng place trong trip và lấy shortlist theo trip_id. |
| `ix_saved_place_reverse` | `place_id` | Toàn bảng | Tìm những chuyến đã lưu một place, hỗ trợ join/kiểm tra tham chiếu theo place_id. PK phục vụ chiều trip trước. |

<a id="itineraries"></a>

## 15. `itineraries`

Một lịch hiện hành tối đa cho mỗi trip, version áp dụng toàn bộ lịch.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `trip_id` | `uuid` | Không NULL; PK | Vừa là PK vừa FK tới trips; tối đa một lịch hiện hành mỗi trip. Service tạo lịch cùng transaction tạo chuyến. |
| `version` | `bigint` | Không NULL; mặc định `0` | Phiên bản chung cho toàn lịch: ngày, mục, thứ tự, mode, ghi chú hoặc apply AI. Client gửi expectedVersion. |
| `updated_by` | `uuid` | Không NULL | Người chỉnh lịch gần nhất. FK ghép tới membership lịch sử; service kiểm tra đang ACTIVE. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được tối đa 1 hàng hiện tại tham chiếu. |
| `(updated_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id,updated_by)` | [trip_members](#trip_members) `(trip_id,user_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được tối đa 1 hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [itinerary_days](#itinerary_days) `(trip_id)` → `(trip_id)`; [ai_itinerary_drafts](#ai_itinerary_drafts) `(trip_id)` → `(trip_id)`.

### Ràng buộc và việc backend phải làm

PK trip_id chặn lịch thứ hai, nhưng DB không tự tạo lịch cho mọi trip. Mỗi mutation kiểm tra expectedVersion dưới khóa trip → itinerary, tăng version và ghi event cùng transaction.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(trip_id)` | `trip_id` | Toàn bảng | Bảo đảm tối đa một lịch cho trip; tra/khóa lịch bằng trip_id. |

<a id="itinerary_days"></a>

## 16. `itinerary_days`

Các ngày tương đối của lịch trình.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh ngày để itinerary_items tham chiếu ổn định. |
| `trip_id` | `uuid` | Không NULL | Lịch/chuyến chứa ngày; FK tới itineraries chứ không chỉ trips. |
| `day_number` | `smallint` | Không NULL | Số ngày tương đối 1–5; ngày thực = trips.start_date + day_number - 1. Service kiểm tra trong số ngày chuyến. |
| `transport_mode` | `varchar(16)` | Không NULL; mặc định `'DRIVE'` | WALK hoặc DRIVE, dùng khi lấy tuyến cho ngày. |
| `note` | `text` | Cho phép NULL | Ghi chú chung của ngày do người dùng nhập. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [itineraries](#itineraries) `(trip_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [itinerary_items](#itinerary_items) `(day_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

CHECK chỉ day_number 1–5 và mode WALK/DRIVE; DB chưa buộc số ngày khớp duration hoặc đủ các ngày liên tiếp. Thay ngày đi/rút ngắn chuyến cần service xử lý và tăng version.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(trip_id,day_number)` | `trip_id,day_number` | Toàn bảng | Không có hai ngày số 1 của cùng trip; hỗ trợ lấy các ngày của trip theo day_number. |

<a id="itinerary_items"></a>

## 17. `itinerary_items`

Mục địa điểm hoặc ghi chú trong ngày, có thứ tự và khoảng giờ.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh mục lịch trình. |
| `day_id` | `uuid` | Không NULL | Ngày chứa mục. Xóa ngày sẽ xóa các mục qua FK ON DELETE CASCADE. |
| `place_id` | `uuid` | Cho phép NULL | Địa điểm thật nếu kind=PLACE; NULL nếu kind=NOTE. |
| `kind` | `varchar(16)` | Không NULL | PLACE là điểm ghé có place_id; NOTE là mục nghỉ/ghi chú, không có place_id. |
| `custom_title` | `varchar(160)` | Cho phép NULL | Tiêu đề do người dùng nhập. NOTE bắt buộc có và không rỗng; PLACE có thể NULL. |
| `position` | `integer` | Không NULL | Thứ tự mục trong ngày, số nguyên >= 0. Service giữ liên tục từ 0; UNIQUE deferred cho phép hoán đổi trong transaction. |
| `start_time` | `time` | Không NULL | Giờ bắt đầu theo múi giờ chuyến; không chứa ngày/offset. |
| `end_time` | `time` | Không NULL | Giờ kết thúc trong cùng ngày, phải lớn hơn start_time. Mục qua đêm tách thành các mục riêng. |
| `note` | `text` | Cho phép NULL | Ghi chú do người dùng tạo cho mục. |
| `estimated_cost_vnd` | `bigint` | Cho phép NULL | Chi phí dự kiến không âm do người dùng nhập; NULL nếu chưa biết. Không coi giá AI là đã xác minh. |
| `cost_source` | `varchar(16)` | Không NULL; mặc định `'UNKNOWN'` | UNKNOWN tương ứng chi phí NULL; USER tương ứng có số tiền. CHECK giữ hai trường nhất quán. |
| `origin` | `varchar(16)` | Không NULL; mặc định `'MANUAL'` | MANUAL hoặc AI, ghi nguồn tạo mục; không thay thế quyền chỉnh sửa. |
| `created_by` | `uuid` | Không NULL | Người tạo mục; FK chỉ tới user, service kiểm tra membership của chuyến. |
| `updated_by` | `uuid` | Không NULL | Người chỉnh mục gần nhất; cùng yêu cầu kiểm tra quyền ở service. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(day_id)` | [itinerary_days](#itinerary_days) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. ON DELETE CASCADE: xóa hàng cha xóa các hàng con. |
| `(place_id)` | [places](#places) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(created_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(updated_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

CHECK bảo vệ loại mục, giờ, chi phí/nguồn và position không âm. Không có constraint chặn chồng giờ giữa hai hàng hoặc bắt position liên tục. Service validate trước commit. uq_item_position deferred không nên dùng làm arbiter ON CONFLICT.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| `uq_item_position` | `day_id,position` | DEFERRABLE INITIALLY DEFERRED | Không trùng vị trí cuối transaction; lấy mục của ngày theo position. Deferred để hoán đổi hai vị trí. |
| `ix_itinerary_items_place` | `place_id` | Toàn bảng | Tìm các mục lịch đang dùng một địa điểm; không thay thế index theo ngày/thứ tự. |

<a id="ai_itinerary_drafts"></a>

## 18. `ai_itinerary_drafts`

Bản nháp AI tách biệt; chỉ apply mới thay lịch hiện hành.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh bản nháp tách khỏi lịch hiện hành. |
| `trip_id` | `uuid` | Không NULL | Lịch/chuyến được yêu cầu sinh bản nháp. |
| `requested_by` | `uuid` | Không NULL | Người yêu cầu sinh; FK ghép bảo đảm membership tồn tại, service kiểm tra ACTIVE. |
| `client_request_id` | `uuid` | Không NULL | ID client giữ nguyên khi retry yêu cầu; UNIQUE theo trip/người yêu cầu. Tạo lại chủ động dùng ID mới. |
| `base_itinerary_version` | `bigint` | Không NULL | Phiên bản lịch lúc bắt đầu sinh; apply phải khớp phiên bản hiện tại. |
| `base_trip_version` | `bigint` | Không NULL | Phiên bản thông tin trip lúc bắt đầu sinh; ngăn áp lịch theo ngày/ngân sách cũ. |
| `status` | `varchar(16)` | Không NULL; mặc định `'GENERATING'` | GENERATING, READY, FAILED, APPLIED hoặc EXPIRED; service thực hiện chuyển trạng thái và xử lý timeout. |
| `preferences` | `jsonb` | Không NULL; mặc định `'{}'::jsonb` | JSON object chứa sở thích/yêu cầu của người dùng; không lưu prompt thô hoặc API key. |
| `candidate_place_ids` | `jsonb` | Không NULL; mặc định `'[]'::jsonb` | JSON array các ID địa điểm được phép dùng; phần tử không tự có FK, phải validate ở backend. |
| `result` | `jsonb` | Cho phép NULL | JSON object kết quả đã lọc có schema_version; bắt buộc khi READY/APPLIED. CHECK không xác minh toàn cấu trúc lịch. |
| `provider` | `varchar(32)` | Không NULL | Tên nhà cung cấp AI thực sự đã gọi để truy vết. |
| `model` | `varchar(120)` | Không NULL | Tên model thực sự sử dụng; tách khỏi cấu hình mới thay đổi sau này. |
| `error_code` | `varchar(64)` | Cho phép NULL | Mã lỗi có kiểm soát; NULL khi không có lỗi, không lưu raw response nhạy cảm. |
| `expires_at` | `timestamptz` | Không NULL | Hạn draft, phải sau created_at. Request apply vẫn kiểm tra hạn dù job chưa dọn. |
| `applied_at` | `timestamptz` | Cho phép NULL | Thời điểm áp dụng; bắt buộc và chỉ có khi APPLIED. |
| `applied_by` | `uuid` | Cho phép NULL | Người áp dụng; FK tới user. Service kiểm tra quyền và ghi cùng transaction thay lịch. |
| `applied_itinerary_version` | `bigint` | Cho phép NULL | Phiên bản lịch tạo ra bởi lần apply; trả lại khi client retry để tránh áp dụng lần hai. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [itineraries](#itineraries) `(trip_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(requested_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(applied_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id,requested_by)` | [trip_members](#trip_members) `(trip_id,user_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

CHECK kiểm tra JSON ở mức object/array, trạng thái READY/APPLIED có result và đủ bộ applied_* khi APPLIED. ID trong JSON, quyền, hết hạn, candidate set và so cả hai version do service validate. client_request_id không tự phát hiện retry có payload khác.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(trip_id,requested_by,client_request_id)` | `trip_id,requested_by,client_request_id` | Toàn bảng | Tra kết quả yêu cầu tạo draft khi retry, chống tạo lặp; tạo lại có chủ ý cần client_request_id mới. |
| `ix_ai_drafts_trip` | `trip_id,created_at DESC` | Toàn bảng | Lấy draft của chuyến theo created_at DESC; nếu cần phân trang ổn định khi trùng giờ phải có tie-breaker và đo lại plan. |
| `ix_ai_drafts_expiry` | `expires_at) WHERE status IN ('GENERATING','READY'` | Toàn bảng | Quét hạn của draft GENERATING/READY để xử lý hết hạn. Không phải index riêng tối ưu timeout GENERATING theo created_at. |

<a id="media_assets"></a>

## 19. `media_assets`

Metadata tệp trong R2, ownership, scope và dung lượng đã dự trữ.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh media backend cấp cho app; không phải object key hoặc URL. |
| `uploader_id` | `uuid` | Không NULL | Người tải tệp lên; dùng để buộc avatar và attachment thuộc đúng chủ. |
| `trip_id` | `uuid` | Cho phép NULL | NULL cho AVATAR; bắt buộc cho CHAT. FK ghép với uploader kiểm tra membership tồn tại. |
| `purpose` | `varchar(16)` | Không NULL | AVATAR hoặc CHAT; quyết định phạm vi quyền và yêu cầu trip/MIME. |
| `status` | `varchar(16)` | Không NULL; mặc định `'PENDING'` | PENDING, READY, ATTACHED, FAILED hoặc DELETED. READY chưa được coi là một attachment đã gửi. |
| `object_key` | `text` | Không NULL; UNIQUE | Khóa object chính trong bucket riêng tư, do server chọn và duy nhất; không phải URL công khai. |
| `thumbnail_key` | `text` | Cho phép NULL; UNIQUE | Khóa thumbnail nếu có; có thể NULL, giá trị có mặt phải duy nhất. |
| `original_filename` | `varchar(255)` | Không NULL | Tên gốc để hiển thị sau khi xử lý an toàn; không dùng trực tiếp làm đường dẫn storage. |
| `mime_type` | `varchar(64)` | Không NULL | Chỉ image/jpeg, image/png, image/webp hoặc application/pdf. AVATAR không được là PDF; xác minh bytes ở backend. |
| `size_bytes` | `bigint` | Không NULL | Kích thước object chính: 1–10.000.000 byte. Service kiểm tra bytes thật trước READY. |
| `thumbnail_size_bytes` | `bigint` | Không NULL; mặc định `0` | Kích thước thumbnail, >= 0; tính vào quota. |
| `reserved_bytes` | `bigint` | Không NULL | Dung lượng đã dự trữ cho object + thumbnail. Khi chưa purged phải >= tổng hai kích thước; sau purged bằng 0. |
| `sha256` | `char(64)` | Cho phép NULL | Digest nội dung nếu đã tính; nullable, không có UNIQUE và không tự deduplicate file. |
| `width` | `integer` | Cho phép NULL | Chiều rộng ảnh pixel, > 0 khi có; có thể NULL cho PDF hoặc trước khi xử lý. |
| `height` | `integer` | Cho phép NULL | Chiều cao ảnh pixel, > 0 khi có; SQL không bắt cặp width/height cùng có giá trị. |
| `attached_at` | `timestamptz` | Cho phép NULL | Thời điểm được gắn vào avatar/message; bắt buộc khi ATTACHED. Có thể giữ lại sau khi xóa. |
| `orphan_expires_at` | `timestamptz` | Không NULL; mặc định `(now() + interval '24 hours')` | Mốc dọn file chưa gắn, mặc định sau 24 giờ. Cleaner phải khóa/kiểm tra lại trạng thái trước khi xóa. |
| `deleted_at` | `timestamptz` | Cho phép NULL | Bắt buộc khi DELETED, còn các trạng thái khác phải NULL; đánh dấu tombstone, chưa chứng minh R2 đã xóa. |
| `deleted_by` | `uuid` | Cho phép NULL | Người chủ động xóa, nullable để hỗ trợ job hệ thống; service kiểm tra sender/owner và quyền còn hiệu lực. |
| `purged_at` | `timestamptz` | Cho phép NULL | Xác nhận object/thumbnail đã được dọn. Chỉ có khi DELETED/FAILED; chỉ lúc này mới giải phóng reservation. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |
| `updated_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sửa gần nhất, mặc định now() lúc insert; backend phải cập nhật khi sửa vì schema chưa có trigger tự cập nhật. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(uploader_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(deleted_by)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id,uploader_id)` | [trip_members](#trip_members) `(trip_id,user_id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [chat_messages](#chat_messages) `(media_id,trip_id,sender_id)` → `(id,trip_id,uploader_id)`; [app_users](#app_users) `(avatar_media_id,id)` → `(id,uploader_id)`.

### Ràng buộc và việc backend phải làm

CHECK bảo vệ purpose/trip, MIME, kích thước, trạng thái xóa/attach và reservation theo từng hàng. Trần 2 GB toàn dự án cần advisory lock + SUM; không có CHECK tổng liên hàng. FK không bảo đảm object R2 tồn tại hoặc file có đúng magic bytes.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(object_key)` | `object_key` | Toàn bảng | Chống dùng lại khóa object chính và tra metadata theo object_key. |
| UNIQUE `(thumbnail_key)` | `thumbnail_key` | Toàn bảng | Chống dùng cùng khóa thumbnail cho hai asset; nhiều NULL được phép. Không kiểm tra trùng chéo với object_key. |
| UNIQUE `(id,uploader_id)` | `id,uploader_id` | Toàn bảng | Khóa đích hợp lệ cho FK avatar ghép. id đã duy nhất; index này chủ yếu phục vụ ràng buộc ownership. |
| UNIQUE `(id,trip_id,uploader_id)` | `id,trip_id,uploader_id` | Toàn bảng | Khóa đích của FK attachment ghép, buộc cùng asset/trip/uploader; không phải index tối ưu lọc riêng trip_id. |
| `ix_media_uploader` | `uploader_id` | Toàn bảng | Tra các asset do user upload để quản trị/reconcile; có index không đồng nghĩa được mở API liệt kê công khai. |
| `ix_media_trip` | `trip_id` | Toàn bảng | Tra các asset thuộc trip để xử lý xóa chuyến/dọn tệp; service kiểm tra trạng thái/quyền. |
| `ix_media_orphans` | `orphan_expires_at) WHERE status IN ('PENDING','READY','FAILED'` | Toàn bảng | Chọn asset PENDING/READY/FAILED tới hạn orphan_expires_at để cleaner kiểm tra lại trước khi xóa. |

<a id="chat_messages"></a>

## 20. `chat_messages`

Tin nhắn bền vững, một phòng tương ứng một trip.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh tin đã commit; dùng cho event, UI và notification. |
| `trip_id` | `uuid` | Không NULL | Phòng chat tương ứng một chuyến; không có bảng phòng chat riêng. |
| `sender_id` | `uuid` | Không NULL | Người gửi; FK ghép tới membership lịch sử, quyền ACTIVE do service kiểm tra. |
| `seq` | `bigint` | Không NULL | Số thứ tự > 0 trong riêng trip, cấp từ trips.last_chat_seq dưới khóa; cursor tải bù dùng after_seq. |
| `client_message_id` | `uuid` | Không NULL | UUID client giữ nguyên khi retry; UNIQUE theo trip/sender để một yêu cầu không tạo hai tin. |
| `request_hash` | `char(64)` | Không NULL | Hash payload đã chuẩn hóa. Cùng client_message_id nhưng hash khác phải bị service trả 409. |
| `kind` | `varchar(16)` | Không NULL | TEXT, IMAGE hoặc PDF. Loại file phải khớp MIME ở service. |
| `body` | `text` | Cho phép NULL | Văn bản hoặc caption, tối đa 4.000 ký tự. TEXT bắt buộc khác rỗng sau trim; IMAGE/PDF có thể không có caption. |
| `media_id` | `uuid` | Cho phép NULL; UNIQUE | Tối đa một attachment; NULL cho TEXT, bắt buộc với IMAGE/PDF. UNIQUE cấm dùng cùng tệp cho hai tin. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(sender_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id,sender_id)` | [trip_members](#trip_members) `(trip_id,user_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(media_id,trip_id,sender_id)` | [media_assets](#media_assets) `(id,trip_id,uploader_id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được tối đa 1 hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [notifications](#notifications) `(chat_message_id)` → `(id)`.

### Ràng buộc và việc backend phải làm

CHECK buộc TEXT có body không rỗng và không media; IMAGE/PDF phải có media. FK ghép buộc cùng trip và uploader. Service còn kiểm tra ACTIVE, media READY/purpose/MIME, request_hash và cấp seq; lưu message + outbox trước publish.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(media_id)` | `media_id` | Toàn bảng | Một media không được gắn hai tin; nhiều tin TEXT có media_id NULL vẫn hợp lệ. |
| UNIQUE `(trip_id,seq)` | `trip_id,seq` | Toàn bảng | Chống số chat trùng trong trip; đọc lịch sử và tải bù với seq > cursor, ORDER BY seq. |
| UNIQUE `(trip_id,sender_id,client_message_id)` | `trip_id,sender_id,client_message_id` | Toàn bảng | Chống duplicate do client retry; service còn so request_hash trước khi trả tin cũ. |

<a id="notifications"></a>

## 21. `notifications`

Inbox bền vững theo người nhận, không phụ thuộc push đã đến hay chưa.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh thông báo trong inbox; độc lập với số thiết bị nhận push. |
| `event_key` | `varchar(160)` | Không NULL | Khóa sự kiện dùng chống trùng inbox theo recipient, do backend tạo ổn định khi retry. |
| `recipient_id` | `uuid` | Không NULL | Chủ inbox và người có quyền đánh dấu đã đọc. |
| `actor_id` | `uuid` | Không NULL | Người tạo hành động; phải khác recipient_id, không gửi thông báo cho chính actor. |
| `type` | `varchar(32)` | Không NULL | FRIEND_REQUEST, FRIEND_ACCEPTED, TRIP_INVITATION, CHAT_MESSAGE hoặc ITINERARY_UPDATED; quyết định bộ FK phải có. |
| `trip_id` | `uuid` | Cho phép NULL | Chuyến liên quan với thông báo trip/chat/lịch; NULL với thông báo bạn bè. |
| `friend_request_id` | `uuid` | Cho phép NULL | Lời mời kết bạn liên quan, bắt buộc cho hai loại thông báo bạn bè. |
| `trip_invitation_id` | `uuid` | Cho phép NULL | Lời mời chuyến liên quan, chỉ có với TRIP_INVITATION. |
| `chat_message_id` | `uuid` | Cho phép NULL | Tin nhắn liên quan, chỉ có với CHAT_MESSAGE. |
| `itinerary_version` | `bigint` | Cho phép NULL | Phiên bản lịch > 0 tại sự kiện, chỉ có với ITINERARY_UPDATED. Không phải FK tới lịch sử version. |
| `title` | `varchar(160)` | Không NULL | Tiêu đề chung, tối đa 160 ký tự; không chứa nội dung chat/tọa độ riêng tư. |
| `body` | `varchar(300)` | Không NULL | Nội dung chung, tối đa 300 ký tự; app tải chi tiết sau khi kiểm tra quyền. |
| `read_at` | `timestamptz` | Cho phép NULL | NULL là chưa đọc; có thời điểm sau khi chủ inbox đánh dấu đã đọc. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(recipient_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(actor_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_id)` | [trips](#trips) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(friend_request_id)` | [friend_requests](#friend_requests) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(trip_invitation_id)` | [trip_invitations](#trip_invitations) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(chat_message_id)` | [chat_messages](#chat_messages) `(id)` | Mỗi hàng hiện tại tham chiếu 0 hoặc 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** [push_deliveries](#push_deliveries) `(notification_id)` → `(id)`; [push_deliveries](#push_deliveries) `(notification_id,recipient_id)` → `(id,recipient_id)`.

### Ràng buộc và việc backend phải làm

CHECK buộc đúng bộ trường cho từng type và actor khác recipient. FK chưa buộc message/invitation thuộc trip_id đang ghi; backend tạo notification và kiểm tra quan hệ đó. Không có FK tới lịch sử itinerary_version.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(event_key,recipient_id)` | `event_key,recipient_id` | Toàn bảng | Retry cùng sự kiện không tạo hai inbox cho cùng người. |
| UNIQUE `(id,recipient_id)` | `id,recipient_id` | Toàn bảng | Khóa đích FK ghép từ push_deliveries để buộc đúng chủ inbox; id đã có PK. Không tối ưu feed riêng recipient. |
| `ix_notifications_feed` | `recipient_id,created_at DESC,id DESC` | Toàn bảng | Feed theo recipient, mới nhất trước; id DESC phá hòa timestamp, phù hợp keyset cursor (created_at,id). |
| `ix_notifications_unread` | `recipient_id,created_at DESC` | `read_at IS NULL` | Lấy/đếm thông báo chưa đọc cho một recipient; chỉ chứa read_at IS NULL. Đếm vẫn có chi phí đọc các entry phù hợp. |

<a id="outbox_events"></a>

## 22. `outbox_events`

Công việc hậu commit để publish realtime, fanout push hoặc dọn R2.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh công việc hậu commit, tạo trong cùng transaction với nghiệp vụ. |
| `dedup_key` | `varchar(200)` | Không NULL; UNIQUE | Khóa duy nhất của công việc logic để ghi/retry không tạo hai event tương đương. |
| `event_type` | `varchar(48)` | Không NULL | Loại xử lý như publish chat, fanout push, xóa R2; SQL chưa có CHECK enum, backend quản lý danh mục. |
| `aggregate_id` | `uuid` | Không NULL | ID đối tượng liên quan theo event_type. Đây KHÔNG phải FK đa hình được DB bảo vệ. |
| `payload` | `jsonb` | Không NULL | JSON object chỉ chứa dữ liệu cần thiết/ID; backend validate schema, không đưa token, URL riêng tư hoặc tọa độ vào. |
| `status` | `varchar(16)` | Không NULL; mặc định `'PENDING'` | PENDING, PROCESSING, DONE hoặc DEAD. DEAD cần quy trình xem lỗi/xử lý lại có kiểm soát. |
| `attempts` | `integer` | Không NULL; mặc định `0` | Số lần claim/xử lý, >= 0. Service tăng khi claim và áp dụng giới hạn retry. |
| `available_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm sớm nhất được xử lý; dùng lập lịch/backoff sau lỗi. |
| `locked_by` | `varchar(100)` | Cho phép NULL | Định danh worker đang giữ lease; bắt buộc chỉ khi PROCESSING. |
| `claim_token` | `uuid` | Cho phép NULL | UUID của lần claim; worker chỉ được ack/renew nếu token vẫn khớp để chặn worker cũ. |
| `locked_until` | `timestamptz` | Cho phép NULL | Hạn lease; worker khác có thể lấy lại sau khi hết hạn theo transaction claim. |
| `last_error_code` | `varchar(80)` | Cho phép NULL | Mã lỗi kiểm soát phục vụ theo dõi/retry; không lưu nguyên exception có secrets. |
| `completed_at` | `timestamptz` | Cho phép NULL | Thời điểm công việc hoàn tất do service ghi. SQL chưa ràng buộc trường này với DONE. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

Bảng này không chứa FK tới bảng khác.

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

CHECK buộc PROCESSING có đủ ba trường khóa và các trạng thái khác phải NULL. FK không bảo vệ aggregate_id/payload. Claim cần transaction; retry/backoff, renew lease và ack theo claim_token do worker triển khai.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(dedup_key)` | `dedup_key` | Toàn bảng | Chống tạo lặp một công việc logic; không làm tác dụng bên ngoài trở thành exactly-once. |
| `ix_outbox_pending` | `available_at,id` | `status = 'PENDING'` | Worker chọn việc PENDING đã tới available_at, thứ tự available_at rồi id; kết hợp khóa hàng SKIP LOCKED. |
| `ix_outbox_lease` | `locked_until` | `status = 'PROCESSING'` | Reaper tìm PROCESSING hết lease để retry hoặc DEAD. Đây không phải index cho việc PENDING. |

<a id="push_deliveries"></a>

## 23. `push_deliveries`

Trạng thái gửi riêng cho từng notification và binding thiết bị.

### Thuộc tính

| Cột | Kiểu SQL | NULL / mặc định | Ý nghĩa và cách dùng |
| --- | --- | --- | --- |
| `id` | `uuid` | Không NULL; PK | Định danh một lần giao thông báo tới một binding thiết bị. |
| `notification_id` | `uuid` | Không NULL | Thông báo inbox cần gửi; nhiều delivery có thể cùng tham chiếu một notification. |
| `recipient_id` | `uuid` | Không NULL | Người nhận; FK ghép buộc trùng recipient trên notification. |
| `device_id` | `uuid` | Không NULL | Thiết bị đích. Không sao chép FCM token vào hàng delivery. |
| `device_binding_version` | `bigint` | Không NULL | Snapshot version của thiết bị khi tạo delivery, > 0; gửi chỉ khi còn khớp binding hiện tại. |
| `trip_membership_version` | `bigint` | Cho phép NULL | Snapshot membership để bỏ push chat/lịch đã lỗi thời; nullable cho thông báo không yêu cầu membership, như lời mời trip. |
| `status` | `varchar(16)` | Không NULL; mặc định `'PENDING'` | PENDING, PROCESSING, SENT, SKIPPED hoặc DEAD. SENT nghĩa là FCM nhận, không chứng minh màn hình đã hiển thị. |
| `attempts` | `integer` | Không NULL; mặc định `0` | Số lần claim/gửi cho riêng thiết bị này, >= 0; thiết bị khác lỗi không reset delivery đã SENT. |
| `available_at` | `timestamptz` | Không NULL; mặc định `now()` | Mốc gửi sớm nhất hoặc lần retry tiếp theo. |
| `locked_by` | `varchar(100)` | Cho phép NULL | Worker giữ lease hiện tại; chỉ có khi PROCESSING. |
| `claim_token` | `uuid` | Cho phép NULL | Token của lần claim; cần khớp khi ghi kết quả để tránh ack của worker hết lease. |
| `locked_until` | `timestamptz` | Cho phép NULL | Hạn lease cho công việc gửi; dùng thu hồi sau khi worker chết. |
| `last_error_code` | `varchar(80)` | Cho phép NULL | Mã lỗi FCM/nội bộ đã lọc để phân loại tạm thời hay vĩnh viễn. |
| `fcm_message_id` | `text` | Cho phép NULL | ID provider trả về khi chấp nhận; nullable, phục vụ truy vết chứ không xác nhận đã đọc. |
| `sent_at` | `timestamptz` | Cho phép NULL | Bắt buộc khi SENT; SQL không cấm giữ timestamp này ở trạng thái khác, service quản lý chuyển trạng thái. |
| `created_at` | `timestamptz` | Không NULL; mặc định `now()` | Thời điểm tạo hàng, mặc định now() trong transaction. Lưu timestamptz; không dùng làm cursor duy nhất khi cần thứ tự commit. |

### Quan hệ

| FK từ bảng này | Tham chiếu tới | Ý nghĩa số lượng và hành vi |
| --- | --- | --- |
| `(notification_id)` | [notifications](#notifications) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(recipient_id)` | [app_users](#app_users) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(device_id)` | [user_devices](#user_devices) `(id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |
| `(notification_id,recipient_id)` | [notifications](#notifications) `(id,recipient_id)` | Mỗi hàng hiện tại phải tham chiếu 1 hàng đích; mỗi hàng đích được 0..N hàng hiện tại tham chiếu. |

**Các bảng trỏ vào bảng này:** không có FK đi vào trong schema v1.

### Ràng buộc và việc backend phải làm

CHECK lease tương tự outbox, SENT phải có sent_at; FK ghép bảo đảm notification thuộc recipient. FK chưa kiểm tra recipient trùng user hiện tại của device hoặc binding/member version còn hiệu lực. Worker kiểm tra lại và SKIPPED nếu mất quyền.

### Index và truy vấn được hỗ trợ

| Index / constraint tạo index | Cột hoặc biểu thức theo thứ tự | Điều kiện / thời điểm kiểm tra | Cách dùng |
| --- | --- | --- | --- |
| PK `(id)` | `id` | Toàn bảng | Tra một hàng theo khóa chính và làm đích cho FK; không cần tạo thêm index trùng PK. |
| UNIQUE `(notification_id,device_id,device_binding_version)` | `notification_id,device_id,device_binding_version` | Toàn bảng | Một delivery cho notification + thiết bị + binding. Không gửi lại binding cũ sau khi user/token đổi. |
| `ix_push_pending` | `available_at,id` | `status = 'PENDING'` | Worker chọn delivery PENDING đã tới hạn; sắp available_at,id. |
| `ix_push_lease` | `locked_until` | `status = 'PROCESSING'` | Tìm delivery PROCESSING có lease hết hạn để phục hồi công việc. |
| `ix_push_device` | `device_id` | Toàn bảng | Tra delivery của một thiết bị để quản trị hoặc xử lý thay đổi binding; tính hợp lệ vẫn phải kiểm tra version. |

## 24. Cách sử dụng index trong truy vấn

### 24.1. Index không tự chạy thay nghiệp vụ

Toàn bộ index của schema này dùng B-tree mặc định. Các index PK/UNIQUE vừa phục vụ tra cứu vừa bảo vệ tính duy nhất; index thường chỉ hỗ trợ truy vấn. Thêm index tốn dung lượng và công cập nhật khi ghi.

SQL planner quyết định dùng index, bitmap scan hay sequential scan theo dữ liệu/thống kê. Với 23 bảng gần như rỗng, thấy Seq Scan chưa có nghĩa index sai. Không cam kết tốc độ chỉ từ việc index tồn tại.

Index ghép thường hiệu quả nhất khi truy vấn lọc các cột đầu. Ví dụ `(user_id,status,trip_id)` phục vụ danh sách trip theo user/status; nó không thay thế một index bắt đầu bằng trip_id. Điều kiện lọc và ORDER BY phải được xét cùng nhau. [Multicolumn indexes PostgreSQL 17](https://www.postgresql.org/docs/17/indexes-multicolumn.html)

Partial index chỉ chứa các hàng khớp điều kiện. Truy vấn cần điều kiện để planner chứng minh phù hợp; generic prepared plan có tham số trạng thái không phải lúc nào cũng dùng được partial index. Khi state là cố định của worker, viết rõ literal như `status = 'PENDING'` và kiểm tra plan thực tế. [Partial indexes PostgreSQL 17](https://www.postgresql.org/docs/17/indexes-partial.html)

### 24.2. Những truy vấn tiêu biểu

Các ví dụ dùng `$1`, `$2`... làm tham số bind của driver. Nếu thử trực tiếp trong DBeaver/psql, thay chúng bằng giá trị thử đúng kiểu hoặc dùng PREPARE/EXECUTE. Đây là ví dụ đọc dữ liệu; API thực tế còn phải kiểm tra user, membership và trip chưa xóa.

**Danh sách chuyến đang tham gia**

```sql
SELECT t.id, t.title, t.start_date, t.end_date
FROM trip_members m
JOIN trips t ON t.id = m.trip_id
WHERE m.user_id = $1 AND m.status = 'ACTIVE'
  AND t.deleted_at IS NULL
ORDER BY t.start_date DESC, t.id DESC;
```

`ix_trip_members_user(user_id,status,trip_id)` lọc membership; PK trips hỗ trợ join. ORDER BY start_date/id có thể vẫn cần sort; index membership không sắp sẵn theo ngày chuyến. Đây không phải truy vấn chỉ lấy các chuyến mình làm owner.

**Lấy danh sách bạn ở cả hai phía**

```sql
SELECT user_high_id AS friend_id
FROM friendships WHERE user_low_id = $1
UNION ALL
SELECT user_low_id AS friend_id
FROM friendships WHERE user_high_id = $1;
```

Nhánh đầu dùng tiền tố PK `(user_low_id,user_high_id)`, nhánh sau có `ix_friendships_high`. CHECK low < high và PK bảo đảm một cặp chuẩn hóa; UNION ALL không cần loại cùng cặp hai lần.

**Tải bù chat sau reconnect**

```sql
SELECT id, seq, sender_id, kind, body, media_id, created_at
FROM chat_messages
WHERE trip_id = $1 AND seq > $2
ORDER BY seq ASC
LIMIT 50;
```

UNIQUE `(trip_id,seq)` hỗ trợ lọc + sắp thứ tự. Mỗi trip có seq riêng; cursor 100 của trip A không dùng cho trip B. Việc tránh bỏ sót commit muộn đến từ cách cấp seq dưới khóa trip, không chỉ từ index.

**Đọc các mục một ngày**

```sql
SELECT id, kind, place_id, custom_title, position, start_time, end_time
FROM itinerary_items
WHERE day_id = $1
ORDER BY position ASC;
```

`uq_item_position(day_id,position)` phục vụ thứ tự trong ngày. Đổi hai position có thể tạm trùng giữa transaction vì constraint deferred; tới thời điểm kiểm tra phải duy nhất. Đây không phải bảo vệ chống hai người sửa cùng version.

**Feed thông báo với cursor ổn định**

```sql
SELECT id, type, title, body, created_at, read_at
FROM notifications
WHERE recipient_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT 30;
```

`ix_notifications_feed(recipient_id,created_at DESC,id DESC)` khớp thứ tự. Trang đầu bỏ điều kiện cursor. Cặp timestamp/id tránh bỏ/trùng hàng chỉ vì nhiều thông báo có cùng timestamp; timestamp đơn lẻ không đủ.

Thông báo chưa đọc:

```sql
SELECT count(*)
FROM notifications
WHERE recipient_id = $1 AND read_at IS NULL;
```

`ix_notifications_unread` chỉ chứa thông báo chưa đọc. Khi cập nhật read_at, hàng không còn nằm trong partial index này; việc đếm vẫn không có chi phí O(1).

**Worker chọn outbox đến hạn**

```sql
SELECT id
FROM outbox_events
WHERE status = 'PENDING' AND available_at <= now()
ORDER BY available_at, id
FOR UPDATE SKIP LOCKED
LIMIT 20;
```

Dùng `ix_outbox_pending`. Worker phải chạy SELECT này trong transaction và cập nhật PROCESSING, locked_by, claim_token, locked_until, attempts trước COMMIT; sau đó mới gọi Redis/FCM/R2. Chỉ SELECT rồi thả transaction không phải đã claim công việc. Worker lấy lại lease hết hạn qua `ix_outbox_lease`; push_deliveries có cặp index tương tự.

**Cleaner chọn file tới hạn**

```sql
SELECT id
FROM media_assets
WHERE status IN ('PENDING','READY','FAILED')
  AND orphan_expires_at <= now()
ORDER BY orphan_expires_at
LIMIT 100;
```

`ix_media_orphans` thu hẹp danh sách ứng viên. Cleaner còn phải khóa và kiểm tra lại trạng thái/tham chiếu để không xóa file vừa được attach. Các asset DELETED cần luồng xóa R2/outbox riêng, không thuộc partial index này.

### 24.3. Những index dễ hiểu sai

- Các UNIQUE `media_assets(id,uploader_id)`, `media_assets(id,trip_id,uploader_id)` và `notifications(id,recipient_id)` chủ yếu tạo khóa đích cho FK ghép. PK id đã duy nhất; chúng không phải bằng chứng có thể lọc nhanh riêng cột đứng sau id.
- `uq_friend_pending_pair` là index biểu thức least/greatest, không giống UNIQUE có thứ tự sender/recipient. Nó coi A→B và B→A là cùng cặp khi PENDING.
- `uq_trip_unrevoked_code` không dùng now(): mã hết hạn nhưng chưa revoked vẫn chiếm chỗ.
- `ix_ai_drafts_expiry` theo expires_at. Job phát hiện GENERATING treo theo created_at cần đánh giá truy vấn riêng.
- Chưa có index riêng bắt đầu bằng `user_interests.interest_code`, `refresh_tokens.device_id` hoặc nhiều FK audit như updated_by. Điều đó không làm FK mất hiệu lực; chỉ cần đo khi xuất hiện truy vấn tra ngược/xóa cha.
- Chưa có GIN trên JSONB, full-text search hoặc spatial index. Không thêm chỉ vì cột JSON/text tồn tại.
- Các index có created_at nhưng thiếu id làm tie-breaker chưa tự cung cấp cursor phân trang duy nhất khi timestamp trùng.

### 24.4. Kiểm chứng khi có dữ liệu thử

Chạy ANALYZE sau khi nạp dữ liệu thử đủ đại diện, rồi dùng `EXPLAIN (ANALYZE, BUFFERS)` cho truy vấn cần đo. Đối chiếu số hàng ước lượng/thực tế, bước sort và lượng đọc trước khi thêm index. EXPLAIN ANALYZE thực sự chạy câu lệnh; dùng truy vấn SELECT trên database thử, cẩn thận với câu lệnh ghi hoặc SELECT giữ khóa. [Using EXPLAIN PostgreSQL 17](https://www.postgresql.org/docs/17/using-explain.html)

Có thể xem các index thực tế bằng truy vấn chỉ đọc:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Tên tự sinh của index PK/UNIQUE xem ở đây; trong tài liệu, chúng được gọi bằng constraint và danh sách cột để tránh nhầm với các index đặt tên thủ công.

## 25. Đọc xuyên bảng bằng một tình huống

1. **A và B kết bạn:** friend_requests lưu A→B; khi B chấp nhận, service ghi friendships với thứ tự UUID low/high, notification cho A và outbox cùng transaction.
2. **A tạo chuyến:** insert trips trước, rồi trip_members của A, itineraries và đủ itinerary_days. FK owner-membership được hoãn tới COMMIT nên vòng tham chiếu vẫn hợp lệ.
3. **A mời B:** trip_invitations ghi người nhận cụ thể. Khi B chấp nhận, khóa trip, kiểm tra hạn/quyền/chỗ trống rồi thêm hoặc tái kích hoạt membership. Lời mời chưa nhận không tính vào 10 ACTIVE.
4. **B sửa lịch:** service kiểm tra membership ACTIVE, khóa trip → itinerary, so version, sửa item và tăng version. Ghi notification/outbox cho người nhận phù hợp.
5. **B gửi ảnh:** upload tạo media_assets trong scope trip, xác minh và READY. Gửi chat dùng media_id; FK ghép buộc cùng trip/uploader, UNIQUE chặn dùng tệp cho hai tin. Message, seq, trạng thái media và event commit cùng nhau.
6. **A nhận thông báo:** inbox có notification; worker tạo push_deliveries theo thiết bị/binding của A. Trước khi gửi phải kiểm tra lại binding, mute và quyền; notification có thể tồn tại dù push bị SKIPPED.
7. **B bị loại:** membership chuyển REMOVED và tăng version. Hàng lịch sử/FK còn đó nhưng mọi request mới về lịch, chat, media và vị trí phải bị service chặn. Tệp đã tải xuống thiết bị trước đó không thể thu hồi bằng FK.

## 26. Giới hạn và cách cập nhật tài liệu

- DDL mới là schema tham chiếu; chưa có controller, service, worker hoặc Flyway migration trong repo.
- [verify_tripmate_v1.sql](verify_tripmate_v1.sql) có 22 ca constraint và rollback fixture; không thay thế test quyền, transaction đồng thời, provider hoặc performance.
- Xóa mặc định theo FK NO ACTION; chỉ FK itinerary_items.day_id có ON DELETE CASCADE. Dữ liệu user/trip thường được giữ hoặc xóa logic theo thiết kế, không suy diễn rằng mọi FK đều cascade.
- DB không tự tạo user/city/interest, không tự sinh UUID, không tự tăng version và không tự tạo notification khi dữ liệu đổi.
- Mỗi lần đổi SQL, cập nhật DBML, tài liệu này, ERD và ca kiểm tra có liên quan. Luôn đối chiếu lại danh sách cột, NULL/default, 55 quan hệ và index thực tế; các con số sẽ thay đổi nếu schema thay đổi.

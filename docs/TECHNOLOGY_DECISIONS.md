# TripMate — Lý do chọn công nghệ

Cập nhật: **17/09/2026**. Tài liệu giải thích lựa chọn trong [kế hoạch](../TRIPMATE_PLAN.md), phục vụ triển khai và trao đổi trong nhóm. Các đánh giá “phù hợp với TripMate” dưới đây là quyết định thiết kế của dự án, không phải kết quả benchmark.

**Trạng thái thực tế:** repo mới có tài liệu, schema tham chiếu và cấu hình PostgreSQL local. Chưa triển khai các tích hợp hoặc chứng minh toàn bộ stack hoạt động cùng nhau.

## 1. Tiêu chí và cách tổ chức

Nhóm có hai người, khoảng 520 giờ công, Android là sản phẩm bàn giao, mỗi chuyến tối đa 10 thành viên. Cần ưu tiên khả năng giải thích, kiểm thử và hoàn thành luồng chính trong thời gian này.

Chọn **một backend chia module nghiệp vụ**, triển khai nhiều instance dùng chung PostgreSQL/Redis. Auth, Friends, Trips, Itinerary, Media, Chat và Notifications là module trong cùng ứng dụng. Cách này cho phép ghi nghiệp vụ, inbox và outbox trong một transaction; nhóm chưa phải quản lý giao dịch phân tán giữa nhiều microservice.

Monorepo giữ mobile, backend và tài liệu cạnh nhau để review thay đổi API cùng phía sử dụng. Mỗi phần vẫn có dependency và quy trình build riêng. Hai instance backend phục vụ mục tiêu kiểm thử realtime, worker và lỗi tiến trình; chưa tạo HA cho database hoặc Nginx.

## 2. Mobile và trạng thái giao diện

| Công nghệ | Vai trò và lý do chọn cho TripMate | Đánh đổi / việc cần kiểm chứng |
| --- | --- | --- |
| React Native | Xây các màn hình Android bằng component; cùng một cách tổ chức UI cho auth, bạn bè, chuyến và chat. Có đường mở rộng iOS nếu dự án tiếp tục | Map, camera và push vẫn cần hiểu cấu hình native; chưa cam kết bàn giao iOS |
| TypeScript | Mô tả DTO, loại tin nhắn và trạng thái request rõ ràng để giảm nhầm lẫn khi tích hợp API | Type chỉ kiểm tra ở lúc phát triển; JSON từ API vẫn cần validation phù hợp |
| Expo development build | Có bản app riêng chứa native module/cấu hình của dự án để thử map, camera và push sớm | Thay native dependency hoặc cấu hình có thể phải build lại; cần Android toolchain |
| Expo Router | Tổ chức màn hình và luồng điều hướng nhất quán; thuận tiện cho việc mở đúng trip/chat từ notification | Guard ở màn hình chỉ hỗ trợ UX; backend vẫn xác thực mọi request |
| expo-camera | Quét QR trong luồng kết bạn, tái sử dụng cơ chế permission/camera của Expo | Kiểm thử từ chối quyền, QR sai và đường nhập mã thay thế |
| expo-image-picker, expo-document-picker | Chọn ảnh/avatar hoặc PDF bằng giao diện thiết bị | MIME/đuôi file client gửi không chứng minh định dạng; backend kiểm tra bytes thực |
| expo-notifications | Quyền thông báo, Android channel, native token và xử lý notification trên app | Cần kiểm thử foreground/background và app mở từ push trên thiết bị thật |

Development build cho phép đưa native library/cấu hình riêng vào app. Lựa chọn này phù hợp vì TripMate cần kiểm chứng các tích hợp sớm. [Tài liệu Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

**TanStack Query** giữ dữ liệu đến từ server: danh sách trip, lịch trình, lịch sử chat và inbox; quản lý tải lại, cache và invalidation sau mutation. Khi WebSocket báo lịch thay đổi, app có thể làm mất hiệu lực query tương ứng để tải bản mới. Cache không thay thế kiểm tra version trên backend. [Tài liệu TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)

**Zustand** giữ state giao diện cần chia sẻ như trip đang chọn, bộ lọc hoặc trạng thái mở panel. Phân chia này tránh tự xây toàn bộ cơ chế tải lại dữ liệu server trong một store chung. Khi logout phải dọn cache/state thuộc người dùng cũ; token cần cơ chế lưu trữ an toàn riêng, chưa được quyết định bằng việc chọn Zustand. [Kho mã Zustand](https://github.com/pmndrs/zustand)

## 3. Backend Java và quản lý schema

| Công nghệ | Lý do chọn | Cách dùng và giới hạn |
| --- | --- | --- |
| Java 26 | Giữ lựa chọn đã chốt trong kế hoạch; mô hình kiểu dữ liệu rõ cho domain, DTO và service | Không coi số phiên bản mới là bằng chứng nhanh hơn. Phải chốt JDK vendor, bản vá và lịch hỗ trợ |
| Spring Boot 4.1 | Cùng một nền tảng cho REST, security, transaction, WebSocket và vận hành | Cần thử dependency thực tế, RAM và thời gian khởi động trên cấu hình VPS dự kiến |
| Maven | Quản lý dependency/build backend bằng cấu hình nhất quán cho máy dev và CI | Khi tạo skeleton cần Maven Wrapper; không phụ thuộc Maven cài riêng từng máy |
| Spring Security | Tập trung xác thực, mã hóa mật khẩu và các điểm kiểm soát request | Quyền thành viên theo trip, quyền media và thu hồi subscription vẫn là logic dự án phải viết |
| JPA | Ánh xạ entity và CRUD thông thường; giảm lặp khi làm các màn hình nghiệp vụ | Cần theo dõi query/N+1; SQL đặc thù như SKIP LOCKED, index biểu thức và deferred constraint phải xử lý rõ |
| Flyway | Đưa thay đổi schema thành migration có thứ tự, cùng đi qua dev/CI/server | Sau khi một migration đã áp dụng, tạo migration mới để sửa; Hibernate dùng ddl-auto=validate |

Theo tài liệu được kiểm tra ngày 17/09/2026, Spring Boot **4.1.1** hỗ trợ Java tới **26**. Điều này xác nhận khả năng tương thích được công bố, chưa xác nhận build của TripMate vì repo chưa có backend. [System requirements của Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html)

Java 26 là **non-LTS**; roadmap Oracle ghi mốc Premier Support tới tháng 09/2026, trong khi dự án bàn giao tháng 12. Vì vậy cần kiểm tra hỗ trợ của bản phân phối JDK sẽ dùng và ghi quyết định cập nhật trước deploy; tài liệu này giữ lựa chọn Java 26, chưa tự đổi sang một bản khác. [Java support roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)

Flyway phù hợp với việc hai người thay đổi database qua Git: schema tham chiếu hiện tại sẽ được chuyển thành migration khi dựng backend. File SQL trong docs chưa tự động trở thành migration. [Tài liệu migrations của Flyway](https://documentation.red-gate.com/flyway/flyway-concepts/migrations)

## 4. PostgreSQL và Redis

**PostgreSQL 17** giữ dữ liệu nghiệp vụ bền vững. TripMate có nhiều quan hệ cần bảo vệ: chủ chuyến phải có membership, attachment phải cùng trip/người gửi, lời mời đang chờ không được trùng. Transaction, FK, unique/partial index và constraint deferred giúp diễn đạt các yêu cầu này ngay trong schema. JSONB chỉ dùng cho draft AI và payload có cấu trúc; các quan hệ chính vẫn là bảng/cột.

Đánh đổi là nhóm phải hiểu khóa hàng, thứ tự transaction và migration. Schema không tự kiểm tra mọi quyền hoặc giới hạn nhiều hàng; xem [ERD](../TRIPMATE_ERD_V1.md) và [từ điển dữ liệu](database/DATA_DICTIONARY.md).

**Redis** phục vụ hai nhu cầu nhỏ, cụ thể: Pub/Sub chuyển sự kiện giữa các backend và key vị trí có TTL 60 giây. PostgreSQL lưu chat trước, outbox ghi cùng transaction, rồi worker mới publish. Pub/Sub có cơ chế giao at-most-once, nên client phải tải bù chat từ PostgreSQL sau reconnect. Không dùng Redis làm lịch sử chat duy nhất. [Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/)

Chưa thêm PostGIS vì v1 tìm địa điểm/tuyến qua provider và chưa có truy vấn địa lý nội bộ cần nó. Chưa thêm một message broker riêng vì quy mô hiện tại có thể kiểm chứng với outbox + Redis; đây là giới hạn phạm vi, không phải kết luận Redis thay thế mọi loại hàng đợi.

## 5. Realtime và push

**Spring WebSocket/STOMP** đưa chat, lịch thay đổi và vị trí tới app đang kết nối. STOMP cung cấp cách tổ chức destination/subscription để dễ chia phòng theo trip. Mỗi instance quản lý kết nối của mình; bridge Redis do dự án triển khai để chuyển sự kiện tới các instance khác. Không mặc định simple broker trong một instance tự đồng bộ sang instance khác. [STOMP trong Spring](https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html)

**FCM + Firebase Admin SDK** dùng cho thông báo tới Android khi app ở nền hoặc không giữ WebSocket. Backend gửi trực tiếp qua FCM để quản lý token, outbox và retry trong cùng hệ thống. Expo hỗ trợ lấy native device token cho cách gửi này. [Expo gửi qua FCM/APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom/), [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

Đánh đổi: nhóm phải xử lý vòng đời token, đổi tài khoản trên thiết bị, quyền notification, deep link và gửi lặp. FCM nhận request không chứng minh người dùng đã nhìn thấy thông báo. Inbox nằm trong PostgreSQL; thông báo chỉ chứa ID/nội dung chung và app kiểm tra lại quyền khi mở.

Outbox và push_deliveries tách riêng để một thiết bị lỗi không làm gửi lại tới mọi thiết bị đã thành công. Đây là lựa chọn kiến trúc của TripMate, được mô tả chi tiết trong ERD.

## 6. Map, địa điểm và tuyến đường

**react-native-maps + Google Maps SDK** hiển thị nền bản đồ và marker. **Places** cung cấp tìm kiếm/chi tiết địa điểm; **Routes** cung cấp quãng đường, thời gian và tuyến theo ngày. Dùng cùng hệ sinh thái giúp giới hạn số adapter và loại dữ liệu nhóm phải tích hợp.

Lý do chọn cho v1 là cần địa điểm thật cho Hà Nội, Đà Nẵng, TP.HCM và candidate set cho AI. Đây là giả định phù hợp cần kiểm chứng bằng các ca tìm kiếm/tuyến cụ thể, chưa phải kết quả so sánh chất lượng provider.

Đánh đổi gồm quota, billing, cấu hình API key và attribution. Place ID có ngoại lệ cho phép lưu lâu dài; không suy rộng quyền này sang toàn bộ tên/ảnh/rating/tọa độ trong response. Schema chỉ lưu định danh và dữ liệu do người dùng tạo; kiểm tra chính sách trước khi thêm cache. [Chính sách Places](https://developers.google.com/maps/documentation/places/web-service/policies)

## 7. Tệp và AI

**Cloudflare R2 Standard** lưu ảnh/PDF tách khỏi PostgreSQL và ổ đĩa từng VPS. Nhờ đó hai backend truy cập cùng object, còn DB giữ metadata/quyền. Bucket riêng tư, backend kiểm tra membership rồi stream tệp.

Đánh đổi là object storage và database không chung transaction: cần reserve dung lượng, trạng thái upload và job dọn tệp mồ côi. Trần 2 GB trong ứng dụng không tự giới hạn số lần gọi API. Hạn mức miễn phí được công bố áp dụng cho Standard và có quota thao tác; kiểm tra lại lúc triển khai. [Giá R2](https://developers.cloudflare.com/r2/pricing/)

**Groq qua HTTP adapter** là lựa chọn thử nghiệm cho sinh lịch AI, với model cấu hình qua môi trường để thay đổi mà không sửa nghiệp vụ. Ưu tiên kết quả JSON có cấu trúc; hỗ trợ structured output tùy model/chế độ. [Structured Outputs của Groq](https://console.groq.com/docs/structured-outputs)

Backend phải kiểm tra ID thuộc candidate set, thành phố, ngày/giờ và cả hai version khi apply. Đúng JSON không chứng minh lịch hợp lý. Mục tiêu đánh giá là 30 ca thực tế trong kế hoạch; timeout/lỗi provider phải giữ được luồng chỉnh lịch thủ công. Chưa chốt model và chưa coi tốc độ hay quota miễn phí là cam kết.

## 8. Hạ tầng và quan sát

| Công nghệ | Vì sao dùng trong TripMate | Đánh đổi / giới hạn |
| --- | --- | --- |
| Docker Compose | Mô tả service, mạng và volume để dựng môi trường nhất quán; phù hợp số service nhỏ | Mỗi máy chạy cấu hình của mình; không tự có điều phối cluster hay HA đa máy |
| Nginx | Một điểm vào HTTPS và phân phối request tới backend; cấu hình chuyển tiếp WebSocket | Một Nginx vẫn là điểm lỗi đơn; cần timeout/health behavior phù hợp |
| WireGuard | Kênh mạng riêng giữa VPS và nút cá nhân, dùng cho traffic quản trị/DB phù hợp | Cần quản lý khóa, route và firewall; VPN không tự thay thế xác thực ứng dụng |
| GitHub Actions + GHCR | Test/build từ commit, lưu Docker image để triển khai theo SHA và quay lại bản ứng dụng trước | Secrets/permission phải cấu hình; rollback image không tự đảo ngược migration |
| Actuator | Cung cấp health/metrics để kiểm tra từng backend | Không công khai mọi endpoint quản trị |
| Prometheus | Thu thập chuỗi thời gian của request, lỗi, độ trễ và tài nguyên | Dữ liệu giám sát tốn RAM/disk; retention ban đầu 7 ngày cần đo lại |
| Grafana | Dashboard để đọc số liệu và dùng làm bằng chứng kiểm thử | Dashboard không chứng minh tính sẵn sàng nếu chưa có tình huống lỗi thực tế |

Cơ sở về khả năng công cụ: [mô hình Compose](https://docs.docker.com/compose/intro/compose-application-model/), [Nginx load balancing](https://nginx.org/en/docs/http/load_balancing.html), [WireGuard](https://www.wireguard.com/), [GitHub Actions xuất bản image](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Actuator metrics và Prometheus](https://docs.spring.io/spring-boot/reference/actuator/metrics.html).

Máy cá nhân là nút staging/kiểm thử/backup hoặc backend bổ sung; demo chính phải tiếp tục chạy khi máy này tắt. Chi phí hai VPS đã cập nhật trong [dự toán](../TRIPMATE_PLAN.md); cần đo RAM thực tế trước khi quyết định phân bố monitoring.

## 9. Công cụ đọc và review database

**SQL** là nguồn chuẩn của ràng buộc vật lý. **DBML** giúp review quan hệ bằng sơ đồ; nó không chứa toàn bộ CHECK/default/partial index/deferred behavior. **DBeaver** giúp teammate xem schema thực tế được PostgreSQL tạo ra và thử truy vấn.

Ba cách nhìn bổ sung cho nhau: đọc từ điển để hiểu ý nghĩa, xem DBML để hiểu quan hệ, đối chiếu SQL/database để biết điều gì thực sự được cưỡng chế. Khi thay đổi schema, cập nhật cả tài liệu và script kiểm tra.

<a id="chot-phien-ban"></a>

## 10. Chốt phiên bản và kiểm chứng

1. Khi tạo skeleton, khóa JDK vendor/bản vá, Spring Boot patch, Maven Wrapper, Expo SDK và lockfile JavaScript; ghi phiên bản build Android riêng, không mặc định dùng JDK backend 26 cho Android.
2. Compose hiện dùng tag `postgres:17`, cho phép nhận bản vá trong major 17; ghi lại image digest/phiên bản thực tế khi chạy kiểm thử cần tái lập.
3. Kiểm chứng mobile gọi API và Flyway tạo schema từ database rỗng trước khi thêm nghiệp vụ.
4. Tuần 2 thử map, camera, FCM, R2 và JSON AI trên thiết bị thật bằng yêu cầu nhỏ.
5. Mọi cập nhật dependency phải đi kèm test/build phù hợp; không tự nâng major sát ngày demo.
6. Khi một lựa chọn không đạt tiêu chí, ghi bằng chứng và cập nhật quyết định trong tài liệu này cùng kế hoạch/API bị ảnh hưởng.

# Quy tắc kiến trúc và lập trình — TripMate

Áp dụng cho frontend, backend và code do AI tạo. Code mới phải tuân thủ tài liệu này; khi sửa code cũ, áp dụng trong phạm vi thay đổi, không tự refactor toàn bộ dự án.

**Bắt buộc:** frontend theo MVVM, backend theo Modular Monolith; định danh trong code dùng tiếng Anh, biến và hàm dùng `camelCase` như `userAccount`.

## 1. Phạm vi và nguồn chuẩn

- Tài liệu này quy định kiến trúc, cách tổ chức code và tiêu chí review; cấu trúc bên dưới là mục tiêu triển khai, không phải mô tả mọi thư mục đã tồn tại.
- [API contract](api/openapi.json) và [quy tắc phối hợp](api/TEAM_RULES.md) quy định giao tiếp frontend/backend, HTTP, lỗi, realtime và retry.
- [ERD](../TRIPMATE_ERD_V1.md) và [schema SQL](database/tripmate_v1.sql) quy định dữ liệu, ràng buộc và transaction.
- [Quyết định công nghệ](TECHNOLOGY_DECISIONS.md) quy định stack và cách chốt phiên bản. Không tự nâng dependency chỉ để áp dụng tài liệu này.
- Nếu phát hiện mâu thuẫn, nêu rõ trong PR và cập nhật nguồn chuẩn tương ứng; không âm thầm đổi contract hoặc schema theo sở thích đặt tên.

## 2. Quy tắc đặt tên

### 2.1. Ngôn ngữ và kiểu chữ

Định danh do nhóm tự đặt phải bằng tiếng Anh, rõ nghĩa, không dấu. Nội dung hiển thị cho người dùng và tài liệu có thể bằng tiếng Việt. Thuật ngữ nghiệp vụ phải nhất quán: không dùng lẫn `trip`, `tour` và `journey` cho cùng một khái niệm.

| Đối tượng | Quy tắc | Ví dụ |
| --- | --- | --- |
| Biến, tham số, thuộc tính | `camelCase` | `userAccount`, `tripId`, `createdAt` |
| Hàm, method | `camelCase`, bắt đầu bằng động từ | `getTripById`, `createTrip`, `validateEmail` |
| Boolean | Dùng `is`, `has`, `can`, `should` khi phù hợp | `isLoading`, `hasPermission`, `canEditTrip` |
| Danh sách | Danh từ số nhiều | `tripMembers`, `messages` |
| Class, interface, type, enum | `PascalCase` | `TripService`, `UserAccount`, `TripStatus` |
| React component và file component | `PascalCase` | `TripDetailsView.tsx`, `PrimaryButton.tsx` |
| React hook và file hook | `use` + `PascalCase` | `useTripDetailsViewModel.ts` |
| File TypeScript không phải component | `camelCase` | `tripApi.ts`, `tripTypes.ts` |
| File Java | Trùng tên public class/type | `TripController.java` |
| Thư mục frontend tự đặt | `camelCase` | `features/tripDetails/viewModels` |
| Java package | Chữ thường, không dấu gạch dưới | `com.tripmate.trip.application` |
| Hằng số toàn cục cố định, enum member | `UPPER_SNAKE_CASE` | `MAX_TRIP_MEMBERS`, `PENDING` |
| Biến môi trường | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Trường JSON | `camelCase`, đúng contract | `userId`, `nextCursor` |
| Bảng/cột database | `snake_case`, đúng schema | `trip_members`, `created_at` |

Ngoại lệ: tên file/route bắt buộc của framework như `_layout.tsx`, `[tripId].tsx`, file sinh tự động, tên override từ thư viện và wire format đã có phải giữ đúng quy ước nguồn. Không đổi tên cột SQL thành camelCase.

- `camelCase` viết thường chữ đầu; `PascalCase` viết hoa chữ đầu. Không dùng PascalCase cho biến thông thường.
- `const` cục bộ vẫn dùng camelCase, ví dụ `const userAccount = ...`; không phải mọi `const` đều là hằng số toàn cục.
- Viết acronym nhất quán: `userId`, `apiClient`, `httpStatus`, `TripDto`; giữ tên sẵn có của API/thư viện.
- Tránh `data1`, `tempData`, `obj`, `handleStuff` và tên tiếng Việt như `layDanhSachChuyenDi`. Tên ngắn như `i` chỉ dùng trong phạm vi rất nhỏ, rõ nghĩa.
- Nêu đơn vị khi có khả năng nhầm: `timeoutMs`, `distanceMeters`, `amountVnd`.
- Event handler dùng `handleSubmit`; callback prop dùng `onSubmit`. Test mô tả hành vi, ví dụ `rejectsTripUpdateWhenVersionConflicts`.

## 3. Frontend bắt buộc theo MVVM

### 3.1. Trách nhiệm từng phần

| Thành phần | Trách nhiệm | Không được làm |
| --- | --- | --- |
| Model | Kiểu dữ liệu, quy tắc thuần, adapter truy cập dữ liệu | Phụ thuộc View hoặc điều khiển UI |
| View | Render, style, accessibility, chuyển sự kiện đến ViewModel | Gọi HTTP trực tiếp hoặc chứa workflow nghiệp vụ |
| ViewModel | Cung cấp state và action cho View; điều phối dữ liệu, validation và thao tác | Chứa JSX, style hoặc truy cập trực tiếp native UI |

Luồng chính: `View → ViewModel → Model/API adapter → Backend`. State từ ViewModel được React render lại lên View. ViewModel có thể là custom hook; không bắt buộc tạo class hoặc một lớp repository chỉ để chuyển tiếp một lời gọi API.

### 3.2. Cấu trúc đề xuất

```text
frontend/
  src/
    features/
      trips/
        models/tripTypes.ts
        models/tripRules.ts
        api/tripApi.ts
        viewModels/useTripDetailsViewModel.ts
        views/TripDetailsView.tsx
        components/TripMemberItem.tsx
    shared/
      api/httpClient.ts
      components/
      hooks/
      theme/
      utils/
```

- Khi tích hợp Expo Router, file route là lớp ghép mỏng, đặt tại vị trí framework hỗ trợ và import View tương ứng. Không dồn logic vào route hoặc `App.tsx`.
- ViewModel trả về state/action có tên rõ ràng: `trip`, `isLoading`, `errorMessage`, `saveTrip`, `retry`.
- View giữ state trình bày cục bộ như animation hoặc mở/đóng menu. State form, validation và workflow của màn hình thuộc ViewModel khi cần điều phối.
- ViewModel dùng navigation adapter/callback để yêu cầu điều hướng; không import View và không trả về JSX.
- Component dùng chung nhận props; không tự đọc dữ liệu nghiệp vụ của một feature cụ thể.
- Không import nội bộ feature khác tùy tiện. Khi cần dùng chung, cung cấp public export rõ ràng hoặc chuyển phần thực sự dùng chung sang `shared`.

### 3.3. State và bất đồng bộ

- Khi bổ sung theo stack dự kiến: TanStack Query quản lý server state, cache và mutation; Zustand chỉ quản lý client state cần chia sẻ. Không sao chép cùng một nguồn dữ liệu server vào nhiều store.
- Mỗi màn hình có trạng thái loading, empty, success và error phù hợp; thao tác lưu phải có trạng thái submitting và chống gửi lặp.
- Query key phải chứa tài khoản, ID và bộ lọc cần thiết để tránh lẫn cache; dọn cache riêng tư khi logout hoặc mất quyền theo TEAM_RULES.
- Hủy request hoặc bỏ qua kết quả đã lỗi thời khi đổi tham số/unmount; dọn timer và subscription. Không để response cũ ghi đè state của màn hình mới.
- Retry, refresh token, optimistic update và xử lý version conflict tuân theo contract. Không tự giả định mutation có tính idempotent.
- Dùng type rõ ràng, bật TypeScript strict khi thiết lập cấu hình; tránh `any`, ép kiểu tùy tiện và non-null assertion để che lỗi. Dữ liệu bên ngoài cần được kiểm tra ở ranh giới thích hợp.
- Dùng theme/token cho màu, spacing và typography; text nhập liệu có label, nút có trạng thái disabled phù hợp và accessibility label khi cần.

### 3.4. HTTP client và xử lý lỗi frontend

- Mọi API adapter dùng chung `shared/api/httpClient.ts` để quản lý base URL có version, timeout, gắn access token và chuẩn hóa lỗi. Dùng fetch wrapper hoặc interceptor của thư viện đã chọn; không bắt buộc thêm thư viện middleware riêng.
- Chỉ gắn token vào request đến backend tin cậy; không tự mang Authorization header sang URL dịch vụ khác.
- Phân biệt lỗi HTTP có response, lỗi mạng, timeout, request bị hủy và response không hợp lệ. Lỗi cục bộ không được giả làm error code do backend trả; request bị hủy có chủ đích không hiện thông báo thất bại.
- Đọc đúng response JSON, 204 không body và binary. Nếu proxy trả HTML hoặc payload lỗi sai schema, dùng thông báo dự phòng; không để lỗi parse che mất HTTP status hoặc request ID sẵn có.
- Refresh token tập trung, single-flight, chỉ khi contract cho phép; request gốc thử lại tối đa một lần sau refresh. Request refresh không đi vào vòng tự refresh chính nó. Chặn kết quả refresh/request cũ khôi phục phiên sau logout hoặc đổi tài khoản.
- Chỉ có một nơi điều phối retry cho mỗi luồng; không bật retry chồng nhau trong HTTP client, TanStack Query và ViewModel. Mutation tuân theo quy tắc riêng của operation.
- HTTP client trả lỗi đã chuẩn hóa; ViewModel quyết định thông báo, lỗi từng field và hành động phục hồi; View hiển thị. Không bật toast toàn cục cho mọi lỗi rồi lại bật toast ở màn hình.
- Có Error Boundary tại ranh giới màn hình/ứng dụng phù hợp để hiển thị UI dự phòng khi cây React lỗi render. Error Boundary không thay thế xử lý lỗi API, event handler và tác vụ bất đồng bộ; các lỗi đó phải được xử lý trong luồng tương ứng.
- Middleware của state store chỉ thêm khi có nhu cầu rõ ràng, như persistence hoặc logging đã lọc dữ liệu; không dùng middleware store để nhét toàn bộ nghiệp vụ hay lưu token vào storage không an toàn.

## 4. Backend bắt buộc theo Modular Monolith

### 4.1. Nguyên tắc

- Một ứng dụng backend Spring Boot, một đơn vị build/deploy chính; có thể chạy nhiều replica cùng ứng dụng. Không tách microservice theo từng module trong phạm vi kiến trúc này.
- Chia module theo năng lực nghiệp vụ, ví dụ `identity`, `trip`, `itinerary`, `chat`, `media`, `notification`. Danh sách và quyền sở hữu dữ liệu phải được xác định khi triển khai từng module.
- Không tổ chức toàn backend thành các thư mục `controllers`, `services`, `repositories` chứa mọi nghiệp vụ trộn lẫn.
- Mỗi module sở hữu nghiệp vụ, dữ liệu và public API của mình. Module khác chỉ gọi public API hoặc nhận event đã định nghĩa; không truy cập repository/entity nội bộ.
- Dependency giữa các module phải có hướng rõ ràng, không tạo vòng phụ thuộc. Tách interface/module khi có nhu cầu thực tế, không tạo abstraction chỉ để đủ số lớp.

### 4.2. Cấu trúc đề xuất

```text
com.tripmate
  TripMateApplication.java
  trip/
    api/             # Public facade, contract và event dùng giữa module
    web/             # REST controller, request/response DTO
    application/     # Use case, điều phối, transaction
    domain/          # Entity/value object, quy tắc nghiệp vụ, port nếu cần
    infrastructure/  # JPA repository, persistence và adapter bên ngoài
  itinerary/
  identity/
  chat/
  media/
  notification/
  shared/            # Thành phần kỹ thuật dùng chung, phạm vi nhỏ
```

- Controller nhận request, validate hình dạng, lấy actor từ ngữ cảnh xác thực và gọi use case. Controller không truy cập repository trực tiếp.
- Application service điều phối use case và transaction; domain giữ quy tắc nghiệp vụ. Domain không phụ thuộc controller, HTTP DTO hay provider SDK.
- Infrastructure triển khai lưu trữ và tích hợp bên ngoài. Không để chi tiết Groq/R2/FCM lan vào controller hoặc module khác.
- Không bắt buộc tách domain entity và JPA entity khi chưa có lợi ích rõ ràng; dù dùng chung nội bộ, entity không được lộ qua REST hoặc public API giữa module.
- Dùng constructor injection; không dùng field injection. DTO request/response tách khỏi entity và chỉ chứa trường được phép nhận/trả.
- `shared` không trở thành nơi chứa nghiệp vụ của mọi module. Mỗi phần đưa vào đây phải có lý do dùng chung cụ thể.

### 4.3. Ranh giới module và transaction

- Có thể dùng chung một PostgreSQL, nhưng mỗi bảng có một module chịu trách nhiệm ghi. Không đọc/ghi bảng module khác qua repository, SQL tùy tiện hoặc quan hệ JPA vượt module; dùng facade/query API của module sở hữu.
- Khóa ngoại vật lý giữa bảng vẫn theo schema hiện có. Quyền sở hữu module không có nghĩa xóa constraint database.
- Một use case xuyên module có thể dùng transaction chung thông qua public facade khi cần tính nguyên tử. Xác định rõ bên điều phối, tránh mỗi module tự commit khiến nghiệp vụ dở dang.
- Kiểm tra quyền và invariant ở backend cho mỗi thao tác; validation frontend chỉ hỗ trợ trải nghiệm.
- Dùng lock/version/constraint phù hợp với ERD để xử lý cạnh tranh. Không thay thế bằng kiểm tra trước rồi ghi ngoài transaction.
- Không giữ transaction DB dài trong lúc gọi dịch vụ ngoài. Thiết kế ranh giới transaction, trạng thái trung gian và xử lý thất bại rõ ràng.
- Phát tác dụng phụ sau commit. Với sự kiện cần giao tin cậy như push theo contract, dùng transactional outbox và xử lý chống trùng; không xem event trong bộ nhớ là cơ chế giao tin bền vững.
- Không gọi HTTP giữa các module trong cùng tiến trình; gọi public API nội bộ. Giao tiếp với dịch vụ bên ngoài đi qua adapter.

### 4.4. Middleware và xử lý xuyên suốt backend

Middleware là cơ chế xử lý chung trong luồng request/response, không phải một lớp nghiệp vụ mới của Modular Monolith. Trong Spring, dùng cơ chế phù hợp thay vì bắt buộc tạo một thư mục tên `middleware`.

| Nhu cầu | Cơ chế và trách nhiệm |
| --- | --- |
| Request ID, timing, log request an toàn | Servlet Filter; có thể dùng `OncePerRequestFilter` khi phù hợp |
| Xác thực và bảo vệ endpoint | Spring Security với `SecurityFilterChain` |
| Xử lý quanh Spring MVC handler | `HandlerInterceptor` khi thực sự cần; không thay Spring Security làm hàng rào xác thực |
| Chuẩn hóa exception từ controller/use case | `@RestControllerAdvice` và `@ExceptionHandler` |
| Lỗi xác thực/phân quyền từ security chain | `AuthenticationEntryPoint` và `AccessDeniedHandler` |
| Rate limit và giới hạn request | Gateway/proxy hoặc filter theo thiết kế triển khai; trả lỗi theo contract |

- Ưu tiên thành phần có sẵn của framework. Middleware chỉ làm việc xuyên suốt như tracing, bảo mật và giới hạn lưu lượng; nghiệp vụ tạo chuyến, cập nhật lịch, kiểm tra quyền trên tài nguyên vẫn thuộc use case/module.
- Cấu hình thứ tự filter rõ ràng: request ID sẵn có trước thành phần cần ghi log/trả lỗi; xác thực trước bước yêu cầu actor đã xác thực. Tránh đăng ký một filter ở cả servlet container và security chain khiến chạy hai lần.
- Không giả định Controller Advice bắt được lỗi phát sinh trước DispatcherServlet. Security handler và custom filter phải có đường trả lỗi đúng contract; dùng chung cơ chế ghi error response khi cần.
- Request ID trong body phải khớp `X-Request-Id`, kể cả lỗi trước controller; dọn logging context khi kết thúc request. Không log request body nhạy cảm.
- Nếu phục vụ client trình duyệt, cấu hình CORS theo origin được phép và xử lý preflight đúng vị trí. CORS không thay thế xác thực/phân quyền; ứng dụng React Native không dựa vào CORS để bảo vệ API.
- Rate limit phải phù hợp nhiều replica nếu giới hạn áp dụng toàn hệ thống; khi trả 429, cung cấp `Retry-After` theo contract. Không coi bộ đếm trong RAM của một replica là giới hạn toàn hệ thống.

### 4.5. REST API và versioning

REST là phong cách thiết kế; TripMate bắt buộc dùng API hướng tài nguyên, đúng ngữ nghĩa HTTP và contract đã thống nhất. Version trong URL là quy ước của dự án, không phải điều kiện bắt buộc của mọi REST API.

- API nghiệp vụ public dùng prefix `/api/v1`. Ví dụ `GET /api/v1/trips` lấy danh sách, `POST /api/v1/trips` tạo chuyến; không đặt endpoint CRUD kiểu `/getTrips` hoặc `/createTrip`.
- Ưu tiên danh từ số nhiều cho collection, dùng path parameter xác định tài nguyên và query parameter cho lọc/sắp xếp/phân trang. Tài nguyên đơn như `/trips/{tripId}/itinerary` và action nghiệp vụ trong contract vẫn hợp lệ; không tự đổi endpoint đã thống nhất chỉ để ép về CRUD.
- `GET` chỉ đọc, không tạo tác dụng phụ nghiệp vụ; `POST` tạo tài nguyên hoặc thực hiện action; `PUT` biểu diễn thay thế; `PATCH` cập nhật một phần; `DELETE` xóa theo contract. Ngữ nghĩa idempotent không có nghĩa mọi lần gọi đều trả cùng status/body hoặc frontend được tự retry mọi thao tác.
- Chọn status theo từng operation: 200 khi có kết quả phù hợp, 201 khi tạo thành công, 202 khi đã nhận xử lý bất đồng bộ, 204 khi thành công không body. Không tự đổi status đã được OpenAPI quy định.
- Thành công JSON theo `{data, requestId}`, lỗi theo `{requestId, error}`. Ngoại lệ 204 và binary giữ đúng contract. Không dùng HTTP 200 để che lỗi nghiệp vụ.
- Mỗi endpoint mới phải được mô tả trong OpenAPI trước hoặc cùng implementation: method, path, auth, request/response, validation, status, error code và ví dụ. Không thêm trường envelope riêng cho từng module.
- Các endpoint cùng thế hệ contract dùng chung major version; không tăng version riêng cho mỗi endpoint, mỗi lần sửa code hoặc mỗi lần deploy.
- Sửa bug hoặc thêm thay đổi tương thích giữ `/api/v1` và cập nhật version tài liệu/changelog theo TEAM_RULES. `info.version` như `1.0.1` là version tài liệu contract, không biến URL thành `/api/v1.0.1`.
- Thay đổi phá vỡ tương thích phải có major version mới như `/api/v2` hoặc kế hoạch migration được hai phía review. Không âm thầm thay nghĩa v1; khi client cũ đã phát hành, xác định thời gian hỗ trợ song song, lịch ngừng v1 và cách nâng cấp client.
- Version API khác version bản ghi như `trip.version` hoặc `itinerary.version`; các version bản ghi dùng kiểm soát cập nhật đồng thời.
- Endpoint vận hành như health/metrics không phải API nghiệp vụ public; cấu hình đường dẫn và quyền truy cập riêng. Realtime/push tuân theo extension contract tương ứng, không tự thêm prefix REST vào topic/event.

## 5. Chất lượng code và xử lý lỗi

- Mỗi hàm/class có trách nhiệm rõ ràng; tách khi đang làm nhiều việc độc lập, không áp đặt số dòng cứng nhắc.
- Ưu tiên guard clause để giảm lồng điều kiện; không tạo generic framework cho nhu cầu chưa có.
- Không lặp lại quy tắc nghiệp vụ; gom logic dùng chung ở đúng chủ sở hữu. Giá trị cấu hình/nghiệp vụ phải có tên, tránh magic number.
- Không nuốt exception hoặc để catch rỗng; bổ sung ngữ cảnh cần thiết, chuyển đổi lỗi ở ranh giới thích hợp và giữ nguyên nguyên nhân phục vụ điều tra.
- Frontend xử lý theo `error.code`, có fallback cho lỗi chưa biết. Backend dùng cơ chế xử lý lỗi tập trung, đúng HTTP và response shape của contract.
- Comment giải thích lý do, invariant hoặc đánh đổi; không kể lại từng dòng code. TODO phải nói rõ việc còn thiếu, ưu tiên kèm issue.
- Không để code chết, khối code comment dài hoặc log debug trong code bàn giao.
- Thiết lập formatter/linter theo từng stack và commit cấu hình khi dựng công cụ. Dùng UTF-8, hạn chế thay đổi format ngoài phạm vi công việc.

### 5.1. Error handling tập trung

- Backend phân biệt lỗi đầu vào, lỗi xác thực/phân quyền, lỗi nghiệp vụ, lỗi dịch vụ ngoài và lỗi không dự kiến. Ánh xạ theo TEAM_RULES: 400 sai cú pháp, 422 sai field/nghiệp vụ, 401/403/404 theo quyền, 409 xung đột, 429 quá giới hạn, 503 tạm không phục vụ và 500 lỗi không dự kiến.
- Không bắt mọi exception rồi trả 400 hoặc 200. Không rải cùng một khối try/catch trả HTTP ở mỗi controller; use case phát lỗi có ý nghĩa, lớp web ánh xạ sang contract.
- Chỉ ánh xạ lỗi constraint database đã biết sang lỗi nghiệp vụ tương ứng; không coi mọi lỗi database là xung đột 409.
- Response lỗi giữ các trường của contract: `requestId`, `error.code`, `error.message`, `error.details` và `error.context` khi schema yêu cầu/cho phép. Không tự chuyển sang format khác do framework cung cấp.
- Lỗi 500 trả thông báo an toàn; stack trace và nguyên nhân chi tiết chỉ ghi ở hệ thống log được bảo vệ. Không trả SQL, tên bảng nội bộ, secret hoặc stack trace cho client.
- Ghi nhận lỗi tại ranh giới chịu trách nhiệm, kèm request ID; tránh log cùng một stack trace ở mọi tầng. Không nuốt lỗi khiến transaction commit một phần ngoài ý định.
- Khi dựng test, phải kiểm tra cả lỗi trước controller, validation, lỗi nghiệp vụ, lỗi bất ngờ và payload lỗi không hợp lệ ở frontend; xác nhận HTTP status, envelope, request ID và UI phục hồi phù hợp.

## 6. Dữ liệu, bảo mật và cấu hình

- Không commit secret, token, mật khẩu, keystore hoặc dữ liệu cá nhân thật. File `.env.example` chỉ chứa placeholder; cấu hình riêng theo môi trường.
- Token mobile lưu trong secure storage theo TEAM_RULES. Secret backend không được đóng gói trong app, kể cả đặt trong biến môi trường build frontend.
- Backend kiểm tra quyền trên từng tài nguyên; không tin `userId`, role hay nút ẩn do frontend cung cấp.
- Log có mức độ và request ID để truy vết; không log password, token, chat riêng tư, tọa độ hoặc toàn bộ request nhạy cảm.
- Query phải parameterized; file upload được kiểm tra kích thước, định dạng và quyền theo contract.
- Không dùng floating point cho tiền. Giữ bigint dạng chuỗi ở JSON và frontend theo contract; không ép sang JavaScript Number.
- Ngày, giờ, timezone, null và trường vắng mặt phải giữ đúng ngữ nghĩa contract.
- Thay đổi database qua migration Flyway khi backend được khởi tạo. Không sửa migration đã áp dụng ở môi trường dùng chung; tạo migration mới và đánh giá dữ liệu hiện có.
- Không dùng Hibernate tự sửa schema production; dùng validation và migration. Query danh sách cần phân trang, tránh N+1 và bổ sung index dựa trên truy vấn thực tế.

## 7. Kiểm thử và quy trình thay đổi

- Test phải chứng minh hành vi và rủi ro của thay đổi, không chỉ lặp lại implementation. Sửa bug logic cần regression test khi có thể.
- Frontend: unit test quy tắc thuần/ViewModel có logic; component test cho tương tác quan trọng; integration test cho lỗi API, cache và xác thực liên quan.
- Backend: unit test nghiệp vụ; integration test persistence, quyền, transaction và cạnh tranh trên PostgreSQL test khi hành vi phụ thuộc database.
- Bổ sung kiểm tra ranh giới module tự động khi dựng backend, ví dụ architecture test chặn import nội bộ và vòng phụ thuộc.
- Chạy contract validator và mock smoke test khi đổi contract; mock thành công không chứng minh backend thật đúng. Các ca nghiệm thu chi tiết nằm trong TEAM_RULES.
- PR tập trung vào một mục tiêu; mô tả vấn đề, thay đổi, kiểm thử và ảnh hưởng API/database. Không trộn refactor lớn không liên quan.
- Commit Git bắt buộc theo Conventional Commits và quy ước nhóm tại mục 7.1.
- Dependency mới phải có lý do, kiểm tra license/phù hợp stack và cập nhật lockfile. Không sửa file generate thủ công.
- Khi công cụ tương ứng đã thiết lập, CI phải chạy format/lint, typecheck/build, test và kiểm tra contract liên quan. Không ghi đã kiểm tra nếu chưa chạy hoặc công cụ chưa tồn tại.

### 7.1. Git commit — Conventional Commits

Bắt buộc áp dụng [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Nhóm bổ sung quy ước: type/scope viết thường, description bằng tiếng Anh, bắt đầu bằng động từ nguyên mẫu như `add`, `fix`, `remove`; không có dấu chấm cuối và tiêu đề tối đa 100 ký tự. Đây là quy ước riêng của TripMate, không phải tất cả đều do đặc tả bắt buộc.

Cấu trúc tiêu đề: `type(scope): description`. Scope có thể bỏ khi thay đổi không thuộc một phạm vi cụ thể; thêm `!` ngay trước dấu `:` khi có breaking change. Body/footer tùy chọn, tách nhau bằng dòng trống.

| Type | Dùng khi |
| --- | --- |
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `refactor` | Tổ chức lại code, không thêm tính năng hoặc sửa lỗi |
| `perf` | Cải thiện hiệu năng |
| `docs` | Chỉ sửa tài liệu |
| `test` | Thêm/sửa kiểm thử |
| `style` | Chỉ format code, không đổi hành vi; không dùng cho thay đổi giao diện có tác động sản phẩm |
| `build` | Thay đổi build hoặc dependency |
| `ci` | Thay đổi pipeline CI/CD |
| `chore` | Bảo trì khác không thuộc các nhóm trên |
| `revert` | Hoàn tác thay đổi; ghi SHA được hoàn tác trong body/footer |

- Scope chỉ phạm vi thay đổi, ví dụ `frontend`, `backend`, `auth`, `trips`, `itinerary`, `chat`, `media`, `api`, `db`, `deps`. Dùng nhất quán, không dùng tên người hoặc mã ticket làm scope.
- Mỗi commit tập trung vào một mục tiêu; tách thay đổi không liên quan. Tránh mô tả mơ hồ như `update code`, `fix bug`, `done` hoặc `WIP` trong lịch sử bàn giao.
- Body giải thích lý do và tác động khi cần; footer có thể tham chiếu issue bằng `Refs: #123` hoặc `Closes: #123` nếu thực sự giải quyết issue đó.
- Breaking change phải được đánh dấu theo chuẩn. Riêng nhóm yêu cầu cả `!` và footer `BREAKING CHANGE:` mô tả phần không tương thích và hướng migration. Quy tắc này áp dụng cho mọi type, kể cả `fix`, `refactor` hoặc `build`.
- Dấu breaking change trong commit không tự đổi URL API hay thay thế quy trình review contract. Version release và version API được quyết định theo quy trình tương ứng.
- Khi squash merge, tiêu đề PR và commit squash cuối cùng phải đúng convention; giữ nội dung breaking change và tham chiếu issue cần thiết. Merge commit tự sinh bởi Git có thể giữ format hệ thống; các commit thay đổi nội dung vẫn theo quy tắc trên.
- Khi thiết lập kiểm tra tự động, có thể dùng commitlint cùng hook `commit-msg` và CI. Hook local chỉ hỗ trợ sớm; CI phải kiểm tra các commit sẽ được giữ hoặc tiêu đề PR theo chiến lược merge. Tài liệu này chưa đồng nghĩa đã cài hook/CI kiểm tra commit.

Ví dụ:

```text
feat(trips): add trip details view model
fix(auth): prevent concurrent token refresh requests
refactor(backend): isolate trip persistence logic
docs: document architecture and coding standards
test(api): cover itinerary version conflicts
ci: validate pull request titles
```

Ví dụ breaking change (minh họa cú pháp, không phải thay đổi đã được duyệt):

```text
feat(api)!: replace the legacy trip response format

Align trip responses with the new contract.

BREAKING CHANGE: clients must migrate to the new trip response schema before upgrading.
Refs: #123
```

## 8. Checklist trước khi merge

- [ ] Biến/hàm tiếng Anh, camelCase; class/component PascalCase; ngoại lệ đúng framework/contract.
- [ ] Frontend tách View, ViewModel và Model; View không gọi HTTP trực tiếp.
- [ ] Backend chia theo nghiệp vụ; không truy cập nội bộ hoặc tạo dependency vòng giữa module.
- [ ] HTTP client dùng chung; refresh/retry không lặp vô hạn; Error Boundary và lỗi API được xử lý đúng phạm vi.
- [ ] Filter/security handler/Controller Advice trả lỗi nhất quán, có request ID và không lộ chi tiết nội bộ.
- [ ] Endpoint đúng REST contract và `/api/v1`; thay đổi breaking có kế hoạch version/migration.
- [ ] DTO, HTTP, lỗi, dữ liệu tiền/ngày giờ và retry đúng contract.
- [ ] Có xử lý loading/empty/error, request lỗi thời và gửi lặp khi liên quan.
- [ ] Kiểm tra quyền, transaction, cạnh tranh và migration phù hợp thay đổi.
- [ ] Không lộ secret hoặc dữ liệu riêng tư trong code/log/cache.
- [ ] Kiểm thử và các kiểm tra tự động liên quan đã chạy; ghi rõ phần chưa kiểm tra.
- [ ] Cập nhật tài liệu/contract/changelog khi thay đổi hành vi hoặc cấu trúc.
- [ ] Commit và tiêu đề PR khi squash đúng Conventional Commits; breaking change có dấu `!` và footer hướng dẫn migration.

Nếu một quy tắc không phù hợp trường hợp cụ thể, ghi rõ ngoại lệ, lý do và phạm vi trong PR để reviewer đánh giá. Không viện lý do “code cũ đang làm vậy” để bỏ qua ranh giới kiến trúc.

## 9. Tài liệu kỹ thuật tham khảo

- [Spring Security: kiến trúc filter chain](https://docs.spring.io/spring-security/reference/servlet/architecture.html).
- [Spring MVC: xử lý exception](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html).
- [React: Error Boundary và giới hạn xử lý lỗi](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).
- [RFC 9110: ngữ nghĩa HTTP](https://www.rfc-editor.org/rfc/rfc9110.html).

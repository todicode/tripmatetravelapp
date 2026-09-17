# API contract TripMate

Bộ giao tiếp để backend và frontend phát triển độc lập, phiên bản **1.0.0 — 17/09/2026**.

- [openapi.json](openapi.json): **66 operation REST**, request/response/schema, quyền, lỗi, ví dụ; STOMP và FCM trong x-realtime/x-push.
- [TEAM_RULES.md](TEAM_RULES.md): các điều hai bên bắt buộc tuân thủ và tiêu chí bàn giao.
- [CHANGELOG.md](CHANGELOG.md): lịch sử phiên bản contract.
- [mock-server.mjs](mock-server.mjs): HTTP mock local đọc trực tiếp examples trong JSON.
- [validate_contract.py](validate_contract.py): kiểm tra OpenAPI, references, schema và examples.
- [mock-server.test.mjs](mock-server.test.mjs): kiểm tra hành vi mock bằng HTTP thật trên cổng tạm.

Contract theo [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html), có thể import file vào Postman/Swagger Editor hoặc dùng công cụ sinh client tương thích. JSON là nguồn chuẩn; không có generator riêng để chạy đè sửa đổi của team.

## Frontend bắt đầu ngay

Cần Node.js 22 trở lên. Không cần npm install hoặc backend/database.

Từ thư mục gốc repo:

```powershell
node docs/api/mock-server.mjs
```

Mặc định bind 127.0.0.1:4010. Trỏ API client vào:

| Nơi gọi | Base URL |
| --- | --- |
| Máy tính | http://localhost:4010/api/v1 |
| Android Emulator chuẩn | http://10.0.2.2:4010/api/v1 |
| Điện thoại thật cùng LAN | http://<IP-LAN-máy-tính>:4010/api/v1 |

Với thiết bị thật, chủ động mở mock trên LAN:

```powershell
$env:MOCK_HOST = "0.0.0.0"
$env:MOCK_PORT = "4010"
node docs/api/mock-server.mjs
```

Chỉ dùng mạng phát triển, có thể cần firewall cho cổng 4010. Mock cho phép CORS để FE web/dev dùng được. Chỉ cấu hình HTTP cleartext cho development build nếu Android chặn; bản thật dùng HTTPS.

API có auth cần header `Authorization: Bearer mock-access-token`. Mock chỉ kiểm tra header có dạng Bearer, không xác thực JWT. /health và register/login/refresh không yêu cầu Bearer.

```powershell
$headers = @{ Authorization = "Bearer mock-access-token" }
Invoke-RestMethod http://localhost:4010/api/v1/trips -Headers $headers

# Màn hình danh sách rỗng
$headers["X-Mock-Example"] = "empty"
Invoke-RestMethod http://localhost:4010/api/v1/trips -Headers $headers
```

Chọn trạng thái lỗi bằng X-Mock-Status và tên example theo error.code. Ví dụ với PUT lịch: `X-Mock-Status: 409`, `X-Mock-Example: VERSION_CONFLICT`. Có thể ép lỗi mà không cần gửi request hợp lệ để dựng UI; header scenario chỉ dùng ở mock.

| Header mock | Cách dùng |
| --- | --- |
| X-Mock-Status | Mã HTTP đã khai báo tại operation, ví dụ 401/409/422/429/503 |
| X-Mock-Example | Tên trong content.application/json.examples; mặc định success hoặc example đầu |
| X-Mock-Delay-Ms | 0–5000 ms, thử loading/chờ/lỗi mạng giả lập bên client |

Các example hữu ích:

- List REST: success / empty.
- GET /trips/{tripId}/ai-drafts/{draftId}: success (GENERATING), ready, failed, expired, applied, stale.
- POST /trips/{tripId}/messages: success (TEXT), image, pdf.
- GET /trips/{tripId}/messages: deletedAttachment.
- POST /media: success hoặc avatar cho avatar; chatImage / chatPdf cho chat.
- Error responses: dùng tên code, ví dụ VERSION_CONFLICT, TRIP_FULL, MEDIA_SCOPE_MISMATCH, RATE_LIMITED.

ID fixture dùng chung:

| Entity | UUID |
| --- | --- |
| User An | 00000000-0000-4000-8000-000000000001 |
| User Bình | 00000000-0000-4000-8000-000000000003 |
| Trip Đà Nẵng | 00000000-0000-4000-8000-000000000010 |
| Place | 00000000-0000-4000-8000-000000000020 |
| Media | 00000000-0000-4000-8000-000000000040 |
| Draft | 00000000-0000-4000-8000-000000000051 |

**Mock là dữ liệu tĩnh**: POST/PATCH/DELETE không lưu state; GET sau mutation vẫn trả fixture. UUID path không đổi ID trong example. FE dùng mock để dựng màn hình/API adapter, không dùng để chứng minh workflow có trạng thái. Mock kiểm tra cấu trúc body/query/path theo tập keyword schema dùng trong contract; **không thực hiện quyền, version, TTL, nghiệp vụ, idempotency hay quota**.

Mốc thời gian của location được tính lại theo giờ mock chạy để thử TTL; trang chat rỗng giữ afterSeq được gửi. Các fixture khác giữ nguyên dữ liệu ví dụ.

Upload mock chỉ kiểm tra Content-Type, không parse magic bytes hoặc lưu file. Download trả ảnh PNG/PDF mẫu nhỏ, không phải tệp đã upload. Mock không có STOMP/FCM; dùng examples x-realtime/x-push trong adapter sự kiện của FE. Không thêm các header mock vào production client.

## Backend bắt đầu ngay

1. Import JSON để đọc DTO, operationId, x-permission, status và ví dụ.
2. Đọc TEAM_RULES, đặc biệt transaction/version/retry. Không xuất entity DB thành DTO.
3. Làm lần lượt auth → trip/membership → itinerary → các module khác theo kế hoạch. Endpoint chưa có dùng mock ở FE.
4. Response đi qua test schema của contract; test quyền và concurrency riêng.
5. Tích hợp từng module bằng base URL backend, không chờ toàn bộ API hoàn thành.

REST nhóm chính: catalog, auth/profile/device, QR/friendship, trip/membership/invitation/join code, places/saved places, itinerary, AI drafts/apply, routes, media, chat, notifications, location. Danh sách method/path đầy đủ nằm trong JSON, tránh duy trì thêm một bảng endpoint dễ lệch.

## Kiểm tra trước PR

Cần Python 3.10+ và Node.js 22+. Tạo môi trường Python riêng:

```powershell
python -m venv docs/api/.venv
docs/api/.venv/Scripts/python -m pip install -r docs/api/requirements.txt
docs/api/.venv/Scripts/python docs/api/validate_contract.py
node --test docs/api/mock-server.test.mjs
```

CI chạy hai bước này khi thay docs/api hoặc workflow. Validator kiểm tra OpenAPI 3.0.3, references, operationId duy nhất, examples của request/response/schema/event/push và một số quan hệ trong fixture. Nó không gọi backend hay các nhà cung cấp bên ngoài.

Mỗi thay đổi phải cập nhật JSON, examples, quy tắc/changelog liên quan; hai phía review thay đổi trước tích hợp. Không sửa tay một file generated client rồi để lệch contract.

Đã kiểm tra local ngày 17/09/2026: OpenAPI 3.0.3 hợp lệ, 66 operations / 127 schemas, 1.562 examples/tham số và 6 ca dữ liệu sai được kiểm tra; **75/75 kiểm tra HTTP mock đạt**. CI đã có cấu hình; chưa có kết quả chạy trên GitHub hay test backend thật.

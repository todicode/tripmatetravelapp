# Kiểm thử chuyến đi thủ công

## Chạy kiểm thử tự động

Bật Docker Desktop. Tại thư mục repo, PowerShell:

```powershell
.\scripts\test-trips.ps1 -JavaHome 'C:\Program Files\Java\jdk-26.0.2.1'
npm --prefix frontend run typecheck
npm --prefix frontend run test:trips
docs\api\.venv\Scripts\python.exe docs\api\validate_contract.py
node --test docs/api/mock-server.test.mjs
```

Script tạo PostgreSQL riêng, bật cả kiểm thử profile/social/chat/trips rồi xóa đúng các container nó tạo. Không đọc backend/.env và không kết nối database phát triển. Kết quả chi tiết ở `backend/target/surefire-reports`. Nếu chưa có venv contract, cài dependencies từ `docs/api/requirements.txt` trong một venv trước.

## Test API bằng phiên đăng nhập thật

Chạy backend bằng hướng dẫn hiện có, đăng nhập bằng `/api/v1/auth/login`. Dùng `data.accessToken` làm Bearer token, không đưa token vào tài liệu hoặc Git. Các endpoint dưới đây có prefix `/api/v1`.

1. `GET /cities`: lấy `code` điểm đến được hỗ trợ.
2. `POST /trips` với JSON bên dưới. Tạo UUID mới cho `clientRequestId` mỗi chuyến; khi thử lại cùng lần lưu, giữ nguyên UUID và payload.
3. Gọi lại cùng POST: phải trả cùng ID. Đổi tên nhưng giữ khóa cũ: `409 IDEMPOTENCY_CONFLICT`.
4. `GET /trips`, `GET /trips/{id}`, `GET /trips/{id}/itinerary`: đọc lại dữ liệu.
5. `PUT /trips/{id}/itinerary` với `expectedVersion` đọc từ lịch và đầy đủ `days`. Mục cũ giữ UUID, mục mới bỏ ID. Không gửi các trường chỉ có trong response như `status`, `position`, `origin`, `costSource`.
6. `PATCH /trips/{id}/itinerary/items/{itemId}/status` với `{"expectedVersion":"0","status":"ACTIVE"}`; dùng version thực tế, không luôn dùng `0`.
7. `PATCH /trips/{id}` với `expectedTripVersion` và `status: "CANCELLED"`; sửa lịch phải bị chặn. Đổi về `UPCOMING` để khôi phục; status được tính lại từ tiến độ.
8. `DELETE /trips/{id}?expectedTripVersion=...`: `204`, đọc lại hoặc xem qua nhóm trả `404`.
9. Lặp bằng tài khoản khác: không được đọc/sửa chuyến riêng. Thành viên nhóm được xem chuyến chia sẻ nhưng không được ghi nếu không có membership chuyến.

```json
{
  "clientRequestId": "36c445da-4092-4d6b-b076-bb7a679c4518",
  "title": "Cuối tuần Đà Lạt",
  "cityCode": "DALAT",
  "dateMode": "FLEXIBLE",
  "durationDays": 2,
  "startDate": null,
  "endDate": null,
  "days": [
    {
      "dayNumber": 1,
      "transportMode": "WALK",
      "note": null,
      "items": [{
        "kind": "PLACE",
        "placeId": null,
        "customTitle": "Quán cà phê muốn ghé",
        "startTime": null,
        "endTime": null,
        "note": "Chọn quán sau",
        "estimatedCostVnd": null,
        "placeSnapshot": { "name": "Quán cà phê muốn ghé", "provider": "MANUAL" }
      }]
    },
    { "dayNumber": 2, "transportMode": "WALK", "note": null, "items": [] }
  ]
}
```

Ngày cụ thể: `dateMode: "SPECIFIC"`, đi/về theo `YYYY-MM-DD`, số ngày bao gồm cả đầu và cuối, khớp `durationDays`. Khi tạo mới không chọn quá khứ. Giá trị bigint/version luôn là chuỗi.

Tìm địa điểm: `GET /places/search?cityCode=DALAT&q=cafe&limit=5`. API lưu nguồn OSM và trả UUID nội bộ. Khi thêm vào lịch dùng `placeId`; khi nhập tay dùng `placeSnapshot`, không gửi đồng thời cả hai. Provider lỗi trả `503 PLACES_UNAVAILABLE`, vẫn tạo được điểm thủ công. Endpoint nearby/detail khác trong contract nền chưa nằm trong đợt này.

## Checklist giao diện Android

- Tạo chuyến linh hoạt 1 ngày, 30 ngày; tạo chuyến có ngày cụ thể.
- Thêm điểm từ tìm kiếm và nhập tay; nhập tay không có marker giả trên bản đồ.
- Lưu, đóng/mở app, đăng nhập lại: tên, lịch và tiến độ còn nguyên.
- Chỉnh tên/ngày, thêm/xóa/chuyển/sắp xếp điểm; nút Lưu ghi lên server.
- Giảm ngày có điểm dừng: bị chặn, không mất dữ liệu. Ngày trống được giữ.
- Đổi điểm ACTIVE: điểm ACTIVE cũ thành COMPLETED, điểm mới thành ACTIVE.
- Hủy/khôi phục/xóa có xác nhận; chuyến hủy không cho chỉnh lịch.
- Tắt mạng khi lưu: giữ bản nháp. Nếu chưa rõ kết quả tạo, dùng “Kiểm tra lần lưu trước”; không tạo thêm chuyến.
- Hai phiên sửa cùng version: báo xung đột, không tự ghi đè. Tải lại yêu cầu xác nhận bỏ bản nháp.
- Đóng form có sửa chưa lưu: hỏi xác nhận. Đổi tài khoản không lộ dữ liệu tài khoản trước.
- Khách sạn, chi phí, checklist, bạn đồng hành ghi Sắp có và không nhận dữ liệu mới.
- Kiểm tra màn nhỏ, bàn phím, cỡ chữ lớn, dark mode và nút lưu không bị thanh điều hướng che.

## Kết quả tự động ngày 2026-10-11

- Backend: 151 ca đạt, 0 lỗi, 0 bỏ qua; PostgreSQL Docker riêng, gồm nâng cấp V9 → V10 và đăng nhập/JWT thật.
- Frontend: 105 ca node:test đạt, 0 bỏ qua (gồm launcher Android); script tripModel và TypeScript đạt.
- Contract: 108 mock tests đạt; validator đạt 95 operations, 181 schemas, 2428 examples, 6 negative checks.
- SQL tham chiếu chạy thành công trên database trống. Android/Hermes export thành công.

## Giới hạn xác minh hiện tại

Kiểm thử backend chạy HTTP/PostgreSQL thật; `TripAuthenticatedHttpTest` dùng đăng nhập/JWT thật. `TripHttpIntegrationTest` thay verifier token và Photon bằng test doubles để kiểm tra tập trung nghiệp vụ và lỗi provider. `PhotonClientTest` dùng HTTP server cục bộ; chưa xác nhận SLA/dữ liệu của dịch vụ Photon công cộng.

Máy không có thiết bị ADB; AVD Pixel_8 thất bại vì thiếu `kernel-ranchu`. Checklist Android trên chưa được đánh dấu đạt. Kiểm tra bundle và TypeScript không thay thế kiểm thử thao tác native.

## Cập nhật 2026-10-12

Đã chạy kiểm thử trực tiếp trên Pixel_8: xem [kết quả và các mục chưa đạt/chưa chạy](TRIP_ANDROID_ACCEPTANCE.md). Máy ảo đã hoạt động; lỗi kernel-ranchu ở lần kiểm tra trước không còn chặn. Chưa kết luận toàn bộ checklist UI đạt.

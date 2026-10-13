# Luồng sở thích cá nhân

Ngày 2026-10-02. Người dùng yêu cầu triển khai sau auth, tên và avatar. Frontend MVVM, backend modular monolith. Không triển khai cities/trips trong slice này.

## Contract và quyết định

- GET `/api/v1/interests` có Bearer, trả `{data:{items:[{code,label}]},requestId}`. Nhãn lấy từ database, không hardcode enum ở frontend.
- PATCH `/users/me`: `interestCodes` thiếu giữ nguyên; `[]` xóa hết; null/sai kiểu/trùng/quá 50/mã không tồn tại trả 422. Tên, avatar và sở thích cập nhật trong một transaction theo user JWT.
- Migration V4 tạo `interests`, `user_interests` theo schema thiết kế. Seed FOOD, NATURE, CULTURE và các nhóm UI teammate HIGHLIGHTS, MUSEUMS, HISTORY, SHOPPING. Không chạy schema ERD lên DB auth.
- UI ô chọn nhiều trong Chỉnh sửa hồ sơ theo style màn tạo chuyến đi. Có tải/lỗi/thử lại; không cho sửa sở thích trước khi tải được hồ sơ và danh mục; hủy không lưu; lỗi giữ draft. Không bắt buộc onboarding.
- Giữ thay đổi manifest/log/outputs có sẵn ngoài commit. Không push nếu chưa yêu cầu.

## Tasks

| Task | Phạm vi | Trạng thái |
| --- | --- | --- |
| ST-01 | Đối chiếu contract/schema/UI và ghi kế hoạch | Xong |
| ST-02 | Migration, seed và API danh mục có auth | Xong, `b18a174`, HTTP/PostgreSQL pass |
| ST-03 | Lưu/đọc sở thích, validation và transaction | Xong, `b37864e`, persistence/atomicity pass |
| ST-04 | Adapter, state, ViewModel và giao diện | Xong, `812245d`, TypeScript và frontend tests pass |
| ST-05 | HTTP/PostgreSQL, frontend, typecheck và bàn giao | Tự động xong; nghiệm thu UI native thủ công còn lại |

## Kiểm thử nghiệm thu

- GET danh mục cần đăng nhập; nhãn/code đúng dữ liệu seed.
- Chọn nhiều, tải lại/đăng nhập lại vẫn giữ; account khác không bị thay đổi.
- Bỏ hết; PATCH tên/avatar không chứa sở thích không làm mất lựa chọn.
- Payload sai không cập nhật một phần tên/avatar; các trường sửa chung rollback.
- Loading/retry, dirty/back, double tap, draft khi lỗi, response cũ/unmount/account switch.
- Ghi rõ kiểm thử tự động và phần native UI chưa thao tác.

## Kết quả và tiếp nối

- 65 backend tests pass, 0 failure/error/skipped, gồm HTTP/JWT và PostgreSQL 17 riêng chạy migration V1–V4. Không ghi dữ liệu test vào database auth thật.
- 40 frontend auth/profile tests pass; TypeScript và Metro Android export pass. Kiểm thử catalog lỗi/retry, draft, xóa tất cả, response sau unmount, omission và validation response.
- OpenAPI pass: 73 operations, 138 schemas, 1751 examples/parameters, 6 negative checks. Contract wire không thay đổi.
- Chưa thao tác native UI để nghiệm thu bố cục; chưa tích hợp sở thích cá nhân vào màn tạo chuyến đi. Màn tạo chuyến đi hiện vẫn dùng preferences local, xử lý ở slice trips.
- Avatar đã được người dùng xác nhận hoạt động trước khi bắt đầu slice này.

## Cách chạy và test thủ công

1. Khởi động lại backend bằng script `scripts/run-backend.ps1` đang dùng. Flyway tự chạy V4; không chạy lại SQL ERD và không xóa database.
2. Reload app trong Metro (`r`). Không thêm native dependency ở slice này.
3. Cá nhân → Chỉnh sửa hồ sơ → Sở thích du lịch. Chọn vài mục → Lưu. Mở lại màn, đăng nhập lại và kiểm tra lựa chọn còn nguyên.
4. Bỏ chọn tất cả → Lưu → mở lại phải rỗng. Đổi tên/avatar mà không đổi sở thích phải giữ lựa chọn.
5. Chọn rồi nhấn Back: xác nhận bỏ thay đổi, mở lại thấy dữ liệu cũ. Tắt mạng rồi lưu: giữ draft, không báo thành công. Đổi tài khoản phải thấy lựa chọn riêng.
6. Nếu tải sở thích lỗi, dùng Thử lại. Sửa tên/avatar trong lúc danh mục chưa tải được sẽ không gửi `interestCodes`, tránh xóa nhầm.

Postman (Bearer token):

```http
GET /api/v1/interests
GET /api/v1/users/me
PATCH /api/v1/users/me
Content-Type: application/json

{"interestCodes":["FOOD","NATURE"]}
```

Thử tiếp `{ "interestCodes": [] }`; mã `UNKNOWN`, null hoặc `['FOOD','FOOD']` (gửi JSON đúng với dấu nháy kép) phải trả 422. Payload tên hợp lệ kèm mã sai không được đổi tên. Thiếu token trả 401. Tên/nhãn danh mục nằm trong migration V4, đổi danh mục sau này bằng migration mới, không sửa migration đã áp dụng.

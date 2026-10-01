# Avatar: kế hoạch triển khai và bàn giao

Ngày 2026-10-01. Người dùng đã đồng ý triển khai: thư viện ảnh, crop có sẵn trên thiết bị, preview tròn trong màn Chỉnh sửa hồ sơ, nút xóa riêng và xác nhận. Không làm camera/menu/crop tùy chỉnh. Giữ MVVM và các thay đổi tên đã hoàn tất (`67dd921`).

## Phạm vi và contract

- POST `/media`: multipart đúng một file, `purpose=AVATAR`, không tripId. 1–10.000.000 bytes; JPEG/PNG/WebP, kiểm tra bytes và giải mã ảnh thực tế. Thành công 201 khi READY.
- PATCH `/users/me`: `avatarMediaId` thiếu giữ nguyên, null xóa; chỉ gắn AVATAR READY của chính user. Cho phép sửa tên cùng avatar trong một transaction. Gắn lại avatar hiện tại không attach lần hai. Avatar cũ tạo tombstone.
- GET metadata/content/thumbnail có Bearer và kiểm tra quyền; không public URL/token trong URL. Giai đoạn này hỗ trợ chính chủ; friends/trips chưa có module nên không giả lập quyền đó.
- Object storage theo tài liệu là Cloudflare R2 private. Credential chỉ ở backend; đang chờ người dùng xác nhận đã có bucket hay cần hướng dẫn. Không phụ thuộc credential thật để viết unit/integration tests với storage test double.
- Quota tổng 2.000.000.000 bytes, gồm thumbnail/PENDING; reserve có khóa DB. Dọn READY/PENDING/FAILED quá hạn 24h và object của tombstone bằng job có retry; không giữ transaction DB trong lúc gọi storage.
- Migration bổ sung media trong phạm vi AVATAR, giữ tên/cột tương thích ERD; chưa tạo trip/chat giả. Ghi rõ phần constraint trip sẽ bổ sung khi có module trip/chat.
- Crop dùng Expo image picker `allowsEditing`, tỉ lệ 1:1; kiểm tra khả năng thực tế Android/iOS theo thư viện. Client chọn ảnh chỉ tạo draft, chỉ báo thành công sau upload và PATCH. Upload lỗi/timeout không tự retry; PATCH lỗi giữ mediaId READY để thử lưu lại mà không upload trùng.
- State và cache ảnh theo account; refresh/logout/response cũ không trộn dữ liệu. Dọn ảnh tạm khi bỏ draft/logout.

## Tasks

| Task | Công việc | Trạng thái |
| --- | --- | --- |
| AV-01 | Khảo sát, chốt scope, kế hoạch, dependency/cấu hình storage | Đang làm |
| AV-02 | Migration, media/storage, validation, quota, upload/download/cleanup | Chưa làm |
| AV-03 | Gắn/xóa avatar qua PATCH hồ sơ, ownership và transaction | Chưa làm |
| AV-04 | Picker/crop, preview/xóa, upload flow MVVM và hiển thị ảnh xác thực | Chưa làm |
| AV-05 | Tests API/DB/state, typecheck/build, hướng dẫn R2 và nghiệm thu UI | Chưa làm |

Mỗi task cập nhật kết quả/commit; không stage AndroidManifest đang modified hoặc các log/outputs cũ. Chưa có yêu cầu push avatar.

## Nguồn cần đọc

- `docs/CODING_STANDARDS.md`, `docs/api/TEAM_RULES.md`, `docs/api/openapi.json`, `docs/database/tripmate_v1.sql`.
- `backend/src/main/java/com/tripmate/identity/{application,web,domain}`, `frontend/src/profile/*`, `frontend/src/auth/{api,session,useSessionViewModel}.ts`.
- `template_gui/src/screens/EditProfileScreen.jsx`: chỉ tham khảo style; giới hạn 1 MiB và local FileReader không phải contract production.
- `scripts/run-backend.ps1` hiện chỉ nạp một số biến email/port từ backend/.env; cần bổ sung nạp biến R2 khi tích hợp.
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Cloudflare R2 Java SDK](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-java/).

## Bằng chứng kiểm thử cần có

- Ảnh thật JPEG/PNG/WebP, giả MIME, file hỏng/quá lớn, kích thước pixel quá lớn; normalize/thumbnail và quota.
- Upload thất bại giữa chừng, storage delete lỗi, cleanup retry; quota không giải phóng trước khi object đã được xóa.
- A không đọc/gắn/xóa avatar B; token thiếu; scope sai; READY hết hạn; avatar đang gắn không DELETE trực tiếp.
- Name + avatar atomically; attach lại cùng ID; thay/xóa ảnh rồi GET/login lại.
- Hủy picker/crop, crop/lưu lỗi, double tap, dirty/back, logout/refresh giữa upload/download/PATCH; giữ draft và không báo thành công giả.
- API, PostgreSQL riêng, frontend tests, TypeScript, OpenAPI và Android build. Native UI/R2 thật phải ghi rõ đã kiểm tra hay chưa.

## Handoff hiện tại

Đã đọc source/contract và hỏi trạng thái bucket R2 qua câu hỏi bất đồng bộ. Chưa sửa code avatar. Task tiếp theo: hoàn tất AV-01 rồi AV-02. Không xem phần kế hoạch là tính năng đã triển khai.

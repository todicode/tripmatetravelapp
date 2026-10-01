# Avatar: kế hoạch triển khai và bàn giao

Ngày 2026-10-01. Người dùng đã đồng ý triển khai: thư viện ảnh, crop có sẵn trên thiết bị, preview tròn trong màn Chỉnh sửa hồ sơ, nút xóa riêng và xác nhận. Không làm camera/menu/crop tùy chỉnh. Giữ MVVM và các thay đổi tên đã hoàn tất (`67dd921`).

## Phạm vi và contract

- POST `/media`: multipart đúng một file, `purpose=AVATAR`, không tripId. 1–10.000.000 bytes; JPEG/PNG/WebP, kiểm tra bytes và giải mã ảnh thực tế. Thành công 201 khi READY.
- PATCH `/users/me`: `avatarMediaId` thiếu giữ nguyên, null xóa; chỉ gắn AVATAR READY của chính user. Cho phép sửa tên cùng avatar trong một transaction. Gắn lại avatar hiện tại không attach lần hai. Avatar cũ tạo tombstone.
- GET metadata/content/thumbnail có Bearer và kiểm tra quyền; không public URL/token trong URL. Giai đoạn này hỗ trợ chính chủ; friends/trips chưa có module nên không giả lập quyền đó.
- Object storage là Cloudflare R2 private. Người dùng chưa có bucket; hướng dẫn tại `R2_AVATAR_SETUP.md`. Credential chỉ ở backend. Unit/integration tests dùng storage test double.
- Quota tổng 2.000.000.000 bytes, gồm thumbnail/PENDING; reserve có khóa DB. Dọn READY/PENDING/FAILED quá hạn 24h và object của tombstone bằng job có retry; không giữ transaction DB trong lúc gọi storage.
- Migration bổ sung media trong phạm vi AVATAR, giữ tên/cột tương thích ERD; chưa tạo trip/chat giả. Ghi rõ phần constraint trip sẽ bổ sung khi có module trip/chat.
- Crop dùng Expo image picker `allowsEditing`, tỉ lệ 1:1; kiểm tra khả năng thực tế Android/iOS theo thư viện. Client chọn ảnh chỉ tạo draft, chỉ báo thành công sau upload và PATCH. Upload lỗi/timeout không tự retry; PATCH lỗi giữ mediaId READY để thử lưu lại mà không upload trùng.
- State và cache ảnh theo account; refresh/logout/response cũ không trộn dữ liệu. Dọn ảnh tạm khi bỏ draft/logout.

## Tasks

| Task | Công việc | Trạng thái |
| --- | --- | --- |
| AV-01 | Khảo sát, chốt scope, kế hoạch, dependency/cấu hình storage | Xong; `8869c78` |
| AV-02 | Migration, media/storage, validation, quota, upload/download/cleanup | Xong; `6b6ad4c`; HTTP/PostgreSQL tests pass |
| AV-03 | Gắn/xóa avatar qua PATCH hồ sơ, ownership và transaction | Xong; `2604951`; atomicity/ownership tests pass |
| AV-04 | Picker/crop, preview/xóa, upload flow MVVM và hiển thị ảnh xác thực | Xong; `30759dd`; TypeScript, frontend tests, Android build/Metro pass |
| AV-05 | Tests API/DB/state, typecheck/build, hướng dẫn R2 và nghiệm thu UI | Tự động và tài liệu xong; R2 thật/UI native còn chờ nghiệm thu |

Mỗi task cập nhật kết quả/commit. Manifest chỉ commit hai dòng loại permission camera/microphone; giữ thay đổi deep-link có sẵn và các log/outputs cũ ngoài commit. Chưa có yêu cầu push avatar.

## Nguồn cần đọc

- `docs/CODING_STANDARDS.md`, `docs/api/TEAM_RULES.md`, `docs/api/openapi.json`, `docs/database/tripmate_v1.sql`.
- `backend/src/main/java/com/tripmate/identity/{application,web,domain}`, `frontend/src/profile/*`, `frontend/src/auth/{api,session,useSessionViewModel}.ts`.
- `template_gui/src/screens/EditProfileScreen.jsx`: chỉ tham khảo style; giới hạn 1 MiB và local FileReader không phải contract production.
- `scripts/run-backend.ps1` đã nạp bốn biến R2 từ backend/.env.
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Cloudflare R2 Java SDK](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-java/).

## Bằng chứng kiểm thử cần có

- Ảnh thật JPEG/PNG/WebP, giả MIME, file hỏng/quá lớn, kích thước pixel quá lớn; normalize/thumbnail và quota.
- Upload thất bại giữa chừng, storage delete lỗi, cleanup retry; quota không giải phóng trước khi object đã được xóa.
- A không đọc/gắn/xóa avatar B; token thiếu; scope sai; READY hết hạn; avatar đang gắn không DELETE trực tiếp.
- Name + avatar atomically; attach lại cùng ID; thay/xóa ảnh rồi GET/login lại.
- Hủy picker/crop, crop/lưu lỗi, double tap, dirty/back, logout/refresh giữa upload/download/PATCH; giữ draft và không báo thành công giả.
- API, PostgreSQL riêng, frontend tests, TypeScript, OpenAPI và Android build. Native UI/R2 thật phải ghi rõ đã kiểm tra hay chưa.

## Handoff hiện tại

- Backend: 64 tests, 0 failure/error/skipped; HTTP/JWT/PostgreSQL thật trong container riêng, storage giả lập. Có kiểm thử hai upload đồng thời không vượt quota, lỗi upload/delete, cleanup retry và WebP/pixel limit.
- Frontend: 34 auth/profile tests và TypeScript pass. Android debug x86_64 build thành công; Metro export Android thành công. Native modules được autolink; merged manifest không có CAMERA/RECORD_AUDIO.
- OpenAPI: 73 operations, 138 schemas, 1751 examples và 6 negative checks pass.
- Bước tiếp theo: người dùng tạo R2 theo hướng dẫn, khởi động lại backend và build app; nghiệm thu upload/crop/thay/xóa trên thiết bị. Không cần viết lại AV-01 đến AV-04.

Người dùng chưa có R2 và đã yêu cầu hướng dẫn cấu hình. Code avatar và tests đã được viết; xem [R2_AVATAR_SETUP.md](R2_AVATAR_SETUP.md) để tạo bucket/credential local. Chưa có kết quả R2 thật hoặc thao tác crop trên thiết bị, không đánh dấu hai phần này hoàn tất.

Ảnh được chuẩn hóa ở backend về JPEG vuông tối đa 1024px, thumbnail 256px, đầu vào tối đa 40 triệu pixel. Quota tính theo bytes object thực sau chuẩn hóa. Frontend giữ thumbnail dưới dạng data URI trong bộ nhớ account, không chứa token trong URL; file picker tạm trong cache app được dọn khi đổi/bỏ draft. Camera/microphone bị loại khỏi manifest trong slice thư viện ảnh.

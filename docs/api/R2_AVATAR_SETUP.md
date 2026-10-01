# Cấu hình Cloudflare R2 cho avatar TripMate

Chỉ backend dùng R2. App gửi ảnh đến backend bằng Bearer token; bucket giữ private. Không đưa Access Key/Secret vào frontend hoặc gửi qua chat.

## 1. Tạo bucket và thông tin truy cập

1. Đăng nhập Cloudflare Dashboard → Storage & databases → R2 → Overview. Nếu chưa dùng R2, hoàn tất bước kích hoạt do Cloudflare hiển thị. Xem [hướng dẫn bắt đầu chính thức](https://developers.cloudflare.com/r2/get-started/).
2. Tạo bucket `tripmate-media-dev`, dùng Standard, giữ private; không bật public development URL hoặc gắn public domain.
3. Trong phần API Tokens của R2, tạo token với quyền **Object Read & Write**, giới hạn cho bucket vừa tạo. Xem [hướng dẫn tạo credential S3](https://developers.cloudflare.com/r2/api/tokens/).
4. Lưu **Access Key ID**, **Secret Access Key** và **S3 endpoint** được cung cấp. Endpoint thường là `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; dùng endpoint đúng của bucket/account, không dùng URL public hay URL có tên bucket ở cuối.

## 2. Điền vào backend/.env

Thêm các dòng sau vào file local `backend/.env` (không commit file này):

```dotenv
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=tripmate-media-dev
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
```

Giữ nguyên các dòng database/JWT/email đang dùng. `backend/.env.example` đã có tên biến mẫu. `scripts/run-backend.ps1` đã được cập nhật để nạp bốn biến trên; khởi động lại backend sau khi sửa file. Không cần cấu hình CORS trên bucket cho luồng này vì app gọi backend, không gọi trực tiếp R2.

Trong Git Bash, tại root repo:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-backend.ps1 -JavaHome 'C:\Program Files\Java\jdk-26.0.2.1'
```

Lần khởi động đầu áp dụng migration V3 cho bảng media/quota; không chạy file ERD SQL lên database auth. Nếu chưa cấu hình R2, đăng nhập và sửa tên vẫn hoạt động, upload sẽ trả 503.

## 3. Build lại app và kiểm tra

Có thêm native modules nên cần chạy `npm run android` trong `frontend/`, không chỉ reload Metro.

1. Đăng nhập → Cá nhân → Chỉnh sửa hồ sơ → Thay ảnh đại diện.
2. Chọn một ảnh, căn/cắt bằng giao diện có sẵn, kiểm tra preview tròn và bấm Lưu thay đổi.
3. Kiểm tra ảnh trên màn Cá nhân, đóng/mở app và đăng nhập lại.
4. Trong R2 bucket, kiểm tra có ảnh và thumbnail dưới prefix `avatars/`. Tệp riêng tư được app tải qua backend; không cần mở public access.
5. Thay ảnh khác rồi thử Xóa ảnh đại diện → xác nhận → Lưu thay đổi. Avatar cũ bị đánh dấu xóa; job dọn object chạy theo chu kỳ một phút và retry nếu R2 lỗi. File READY không được gắn vào hồ sơ sẽ hết hạn sau 24h.
6. Thử hủy chọn ảnh, mất mạng và double tap; lỗi phải giữ draft, không báo thành công giả. Upload xong mà PATCH lỗi thì lần thử lưu sau dùng lại mediaId READY.

## 4. Kiểm tra API trong Postman

- POST `/api/v1/media`, Bearer token, Body → form-data: `purpose` kiểu Text = `AVATAR`, `file` kiểu File. Để Postman tự tạo Content-Type/boundary. Mong đợi 201 và `data.id`.
- PATCH `/api/v1/users/me` với JSON `{ "avatarMediaId": "UUID_VUA_NHAN" }`; có thể gửi thêm `displayName`.
- GET `/api/v1/media/UUID/thumbnail` kèm Bearer trả binary JPEG; GET `/api/v1/users/me` trả avatarMediaId hiện tại.
- Xóa bằng PATCH `{ "avatarMediaId": null }`. DELETE trực tiếp media đang gắn bị từ chối 409.
- Tài khoản khác không được đọc hoặc gắn ảnh này. Giai đoạn này chỉ hỗ trợ quyền chính chủ, chưa có friend/trip context.

Nếu 503: kiểm tra đủ bốn biến, quyền token, bucket/endpoint và kết nối từ máy backend. Không gửi nguyên file .env hoặc log chứa credential khi báo lỗi. Tests local dùng object storage giả lập chỉ xác minh logic; cần hoàn tất các bước trên để xác nhận R2 thật.

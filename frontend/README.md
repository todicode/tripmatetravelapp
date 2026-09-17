# TripMate Frontend

Thư mục triển khai ứng dụng Android TripMate. Màn hình đăng nhập mẫu đã được dựng bằng Expo/React Native trong `App.tsx`.

Stack theo kế hoạch: React Native, TypeScript, Expo development build, Expo Router, TanStack Query và Zustand.

## Tài liệu bắt đầu

- [Kế hoạch, màn hình và phân công](../TRIPMATE_PLAN.md).
- [Lựa chọn công nghệ và chốt phiên bản](../docs/TECHNOLOGY_DECISIONS.md).
- [API contract JSON](../docs/api/openapi.json).
- [Quy tắc phối hợp backend/frontend](../docs/api/TEAM_RULES.md).
- [Mock API và các tình huống mẫu](../docs/api/README.md).

## Làm việc trước khi backend hoàn thành

Từ thư mục gốc repo, với Node.js 22 trở lên:

```powershell
node docs/api/mock-server.mjs
```

Mock chạy tại http://localhost:4010/api/v1. Android Emulator chuẩn dùng http://10.0.2.2:4010/api/v1. Hướng dẫn thiết bị thật, header auth và lựa chọn trạng thái lỗi nằm trong tài liệu mock.

Mock trả dữ liệu mẫu, không lưu thay đổi sau mutation và không có broker STOMP/FCM. Dùng để dựng màn hình và API adapter; kiểm thử workflow có trạng thái khi tích hợp backend.

## Công việc đầu tiên

1. Tạo project Expo/TypeScript ngay trong thư mục này, chọn phiên bản và commit lockfile.
2. Thêm cấu hình base URL theo môi trường để chuyển mock/local/staging.
3. Tạo API adapter theo contract, thống nhất loading/empty/error/retry và xử lý version conflict.
4. Tích hợp từng module khi backend sẵn sàng; không tự chuyển về mock khi API thật lỗi.

## Chạy màn hình hiện tại trên Android emulator

### Yêu cầu

- Node.js 22 trở lên
- Android Studio với Android SDK, Android SDK Platform Tools và một Android Emulator
- JDK đi kèm Android Studio (có thể chọn trong **Settings → Build Tools → Gradle → Gradle JDK**)

### Cài dependency

```powershell
cd frontend
npm install
```

### Chạy bằng Expo

```powershell
npm start
```

Mở Android Emulator trước, sau đó nhấn `a` trong cửa sổ Expo. Cách này sẽ tự khởi động Metro và cài app debug nếu thiết bị đã kết nối.

## Build và chạy bằng nút Run của Android Studio

Thư mục native đã được commit tại `frontend/android`. Trong Android Studio chọn **Open**, mở đúng thư mục này (không mở thư mục repo gốc), chờ Gradle Sync hoàn tất, chọn một emulator đang chạy rồi nhấn **Run ▶**. Android Studio sẽ cài APK debug và mở màn hình TripMate.

Ở lần mở đầu, Android Studio có thể hỏi tải Android SDK hoặc Gradle component; chấp nhận cài đặt và chờ hoàn tất. Nếu build còn giữ output cũ, chọn **Build → Clean Project**, sau đó **Build → Rebuild Project**.

Sau khi sửa `App.tsx`, chạy lại bundler từ thư mục `frontend`:

```powershell
npm start
```

Nếu thay đổi thư viện native hoặc `app.json`, chạy `npx expo prebuild --platform android` lại trước khi bấm Run.

Màn hình hiện tại là UI mẫu; các nút đăng nhập/Google hiển thị thông báo chờ API thật.

Không commit node_modules, token, keystore hoặc API secret của backend. Khi tạo ứng dụng, thêm .gitignore và file cấu hình mẫu tương ứng.

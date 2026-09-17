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
- JDK 17 (chọn cùng JDK trong **Settings → Build Tools → Gradle → Gradle JDK** nếu dùng Android Studio)

### Cài dependency

```powershell
cd frontend
npm.cmd ci
```

### Chạy bằng Expo

```powershell
adb devices
npm.cmd run android
```

Mở Android Emulator trước và kiểm tra `adb devices` hiển thị trạng thái `device`. `npm.cmd run android` build APK debug, cài lên emulator và khởi động Metro. Giữ terminal chạy trong khi dùng app. Dùng đuôi `.cmd` để tránh lỗi PowerShell chặn `npm.ps1`/`npx.ps1`.

`npm.cmd run android` tự chọn JDK 17 trong `.expo/toolchains` và chỉ đặt `JAVA_HOME`/`PATH` cho tiến trình build frontend. Không cần đặt lại biến khi mở terminal mới; Java mặc định của hệ thống và backend không bị thay đổi. Trên máy hiện tại JDK 17 đã nằm trong thư mục này (không commit).

Máy khác có thể giải nén JDK 17 vào `.expo/toolchains/<thư-mục-jdk>`, hoặc cấu hình biến `ANDROID_JAVA_HOME` trỏ tới JDK 17 riêng cho Android. Nếu không có JDK trong thư mục dự án, script thử `JAVA_HOME` hiện tại và chỉ chấp nhận JDK 17. Nếu đặt `ANDROID_JAVA_HOME`, script chỉ dùng đường dẫn đó. Các tham số Expo vẫn truyền được, ví dụ `npm.cmd run android -- --no-bundler`.

JDK 25 đi kèm Android Studio trên máy này gây lỗi Prefab/CMake `A restricted method in java.lang.System has been called`. Khi chạy bằng nút Run của Android Studio, vẫn cần chọn JDK 17 trong cấu hình Gradle JDK của IDE; script npm không thay đổi cấu hình IDE.

`npm.cmd start` chỉ khởi động Metro; nhấn `a` trong chế độ Expo Go không build APK native. Sau khi đã cài APK debug, có thể dùng `npm.cmd start -- --lan`, chạy `adb reverse tcp:8081 tcp:8081` rồi mở TripMate trên emulator.

## Build và chạy bằng nút Run của Android Studio

Thư mục native đã được commit tại `frontend/android`. Trong Android Studio chọn **Open**, mở đúng thư mục này (không mở thư mục repo gốc), chờ Gradle Sync hoàn tất, chọn một emulator đang chạy rồi nhấn **Run ▶**. Android Studio sẽ cài APK debug và mở màn hình TripMate.

Ở lần mở đầu, Android Studio có thể hỏi tải Android SDK hoặc Gradle component; chấp nhận cài đặt và chờ hoàn tất. Nếu build còn giữ output cũ, chọn **Build → Clean Project**, sau đó **Build → Rebuild Project**.

Sau khi sửa `App.tsx`, chạy lại bundler từ thư mục `frontend`:

```powershell
npm.cmd start -- --lan
```

Nếu thay đổi thư viện native hoặc `app.json`, chạy `npx.cmd expo prebuild --platform android` lại trước khi bấm Run. Expo SDK 57 tạo lại thư mục native mặc định; lưu các thay đổi native thủ công trước khi chạy. Đồng bộ dependency bằng `npx.cmd expo install --fix` khi nâng Expo SDK.

Màn hình hiện tại là UI mẫu; các nút đăng nhập/Google hiển thị thông báo chờ API thật.

Không commit node_modules, token, keystore hoặc API secret của backend. Khi tạo ứng dụng, thêm .gitignore và file cấu hình mẫu tương ứng.

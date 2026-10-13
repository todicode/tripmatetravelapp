# TripMate Frontend

Quy tắc triển khai bắt buộc: [MVVM, đặt tên và chất lượng code](../docs/CODING_STANDARDS.md).

Ứng dụng Android TripMate dùng Expo development build, React Native và TypeScript. `App.tsx` chỉ ghép provider và màn auth; state, validation và workflow nằm trong ViewModel.

Stack hiện có dùng React hooks/Context, SecureStore cho refresh token và AsyncStorage cho dữ liệu cục bộ theo tài khoản. Chưa dùng Expo Router, TanStack Query hoặc Zustand.

## MVVM và kiểm tra chất lượng

`View → ViewModel → Model/API adapter → Backend`. Auth nằm trong `src/auth`, hồ sơ trong `src/profile`, chuyến đi trong `src/trips`; API có xác thực dùng chung SessionManager và HTTP adapter. View chỉ render và chuyển sự kiện. Không đưa HTTP, workflow lưu hoặc validation nghiệp vụ vào JSX.

```powershell
npm ci
npm run format:check
npm run typecheck
npm test
npx expo export --platform android
```

Prettier được pin trong devDependencies; `npm run format` chuẩn hóa source và scripts, không chạm Android hoặc file môi trường. Kiểm thử adapter với backend thật dùng `npm run test:backend`: đặt `TRIPMATE_TEST_BASE_URL`, `TRIPMATE_TEST_EMAIL`, `TRIPMATE_TEST_PASSWORD`, `TRIPMATE_TEST_OTHER_EMAIL`, `TRIPMATE_TEST_OTHER_PASSWORD` cho hai tài khoản test trên database riêng. Script tạo và xóa chuyến thử nghiệm, cập nhật rồi khôi phục hồ sơ; không chạy với tài khoản/dữ liệu thật.

Kết quả Android và giới hạn kiểm chứng: [báo cáo refactor](../docs/FRONTEND_REFACTOR_PLAN.md).

## Chạy trên tất cả emulator đang bật

Mở các emulator trong Android Studio, chờ máy khởi động xong, rồi chạy trong thư mục `frontend`:

```powershell
npm run android:all
```

Lệnh tự tìm các emulator đang kết nối qua ADB, build một APK debug cho các kiến trúc cần thiết, cài cập nhật và mở TripMate trên từng máy. Không xóa dữ liệu đăng nhập; không chọn điện thoại thật hoặc emulator offline. Nếu không có emulator đang bật, lệnh báo lỗi và không tự mở máy mới.

Các máy dùng chung Metro trên cổng 8081: script dùng lại server đang chạy hoặc khởi động một server mới. Giữ terminal Metro mở khi test; backend cần chạy riêng. Đăng nhập tài khoản khác nhau trên từng máy để test chat. `npm run android` vẫn dùng luồng chạy Android cũ. Kiểm tra script bằng `npm run test:android`.

## Chat nhóm qua API

Tab **Nhóm** và mục **Tạo nhóm** dùng `/api/v1/group-conversations` trên backend thật. Nhóm tồn tại độc lập với chuyến đi; lịch sử được lưu trên server và tải lại khi đăng nhập.

- Tạo nhóm với tối đa 99 bạn bè và người tạo; gửi văn bản, tải tin cũ, xem số chưa đọc và đánh dấu các tin đang hiển thị đã đọc.
- Tin gửi lỗi có nút thử lại dùng đúng UUID/nội dung cũ. Bong bóng nối theo từng người gửi, tự kéo xuống sau khi gửi và giữ vị trí khi đang xem tin cũ.
- Mở thông tin nhóm để xem thành viên. Trưởng nhóm đổi tên, thêm/xóa thành viên, chuyển quyền, gỡ liên kết chuyến đi hoặc lưu trữ nhóm; thành viên khác có thể rời nhóm. Thao tác quản lý gửi `expectedVersion`, khi xung đột sẽ tải lại trạng thái và hiển thị lỗi, không tự lặp mutation.
- Nhóm đã lưu trữ chỉ xem lịch sử. Khi bị xóa/rời nhóm, danh sách và lịch sử cache được dọn sau lần phản hồi API xác nhận mất quyền.
- Nhóm và cá nhân dùng chung một WebSocket STOMP. Tin nhóm đến ngay, thay đổi nhóm làm mới danh sách và mất quyền sẽ xóa lịch sử cache. Sau reconnect, REST tải bù tin; khi socket hoạt động app đối soát mỗi 30 giây, khi mất kết nối thì polling foreground mỗi 3 giây cho tin và 10 giây cho danh sách.
- Chuyến đi được liên kết từ server có màn hình xem chỉ đọc, hỗ trợ ngày linh hoạt và giờ nullable. Danh sách chọn chuyến dùng ID từ backend.

Chạy `npm run typecheck`, `npm run test:groups` và `npm run test:messages` để kiểm tra. Test thủ công bằng hai tài khoản đã kết bạn: tạo nhóm trên máy A, mở tab Nhóm trên máy B, gửi qua lại, thử thêm/xóa thành viên và chuyển trưởng nhóm. Backend phải chạy phiên bản có migration V8/V9. Không cần cài dependency mới cho tính năng này.

## UI được port từ template_gui

- Màn hình sau đăng nhập dùng component React Native và các hook ViewModel; giữ nguyên luồng auth và cấu trúc API hiện có.
- Khám phá có tìm kiếm địa điểm, danh sách lưu theo tài khoản trên thiết bị và định vị khi người dùng cấp quyền. “Gần bạn” sắp xếp các địa điểm đã lưu theo khoảng cách.
- Tạo chuyến đi hỗ trợ ngày cụ thể/linh hoạt từ 1–30 ngày và lịch trình thủ công. Khách sạn, chi phí, checklist và thêm thành viên hiện hiển thị “Sắp có”. Màn hình lịch trình dùng chung cho chuyến đi mới/đã lưu, bản đồ 35%, nội dung 65%.
- Theme sáng/tối và tùy chọn thông báo được lưu trên thiết bị. Bản đồ tiếp tục dùng WebView Leaflet/OpenStreetMap, tìm kiếm Photon và định tuyến OSRM; không gửi token auth đến các dịch vụ này.
- Chuyến đi, lịch trình, tiến độ, hồ sơ, kết bạn và nhắn tin dùng API thật, dữ liệu lưu trên server. Danh sách địa điểm yêu thích vẫn lưu cục bộ theo tài khoản. AI và thông báo push chưa triển khai; không chèn dữ liệu người dùng hoặc tin nhắn mẫu.
- Có thêm AsyncStorage và expo-location: chạy `npm install`, sau đó `npm run android` để build lại development client. Chỉ tải lại JavaScript trên bản cài cũ sẽ thiếu native module.

Kiểm tra: `npm run typecheck`, `node scripts/check-trips.cjs`, `node scripts/check-chat.cjs`, `npx expo export --platform android`. Cần thiết bị/emulator để nghiệm thu bố cục và gesture native.

## Nhắn tin cá nhân

- Trong **Tin nhắn → Bạn bè**, nhấn tên hoặc nút nhắn tin để tạo/mở cuộc trò chuyện với bạn bè qua API. Tab **Tất cả** tải các cuộc trò chuyện đã lưu, tin cuối và số tin chưa đọc từ backend.
- Chat cá nhân có lịch sử phân trang, gửi văn bản giữ nguyên nội dung, trạng thái đang gửi/lỗi và nút thử lại. Retry giữ nguyên `clientMessageId` và nội dung để không tạo tin trùng khi timeout. Số thứ tự được giữ dưới dạng chuỗi/BigInt.
- Khi app ở foreground, chat cá nhân nhận sự kiện tức thì qua WebSocket/STOMP `/ws`, xác thực bằng token trong CONNECT và subscribe queue riêng của tài khoản. Mất kết nối sẽ tự reconnect, tải bù lịch sử và dùng polling dự phòng (tin mới mỗi 3 giây, danh sách mỗi 10 giây khi mở chat); kết nối tốt đối soát REST mỗi 30 giây. Chưa có thông báo push. Mốc đã đọc chỉ cập nhật từ tin đang hiển thị, không xóa badge chỉ vì mở cuộc trò chuyện.
- Hủy kết bạn giữ lịch sử, khóa ô nhập/gửi khi backend báo không còn quyền. Không lưu nội dung chat cá nhân xuống AsyncStorage; phiên chat được tách theo tài khoản và bỏ qua phản hồi đến muộn sau đăng xuất.
- Luồng nhóm tiếp tục dùng implementation cũ, chưa tích hợp API nhóm. Chat cá nhân trước mắt chỉ có văn bản; chưa đồng bộ ghim chuyến đi, ảnh/tệp hoặc cuộc gọi.
- Backend cần khởi động lại để Flyway áp dụng V7. API và ví dụ: [DIRECT_MESSAGING.md](../docs/api/DIRECT_MESSAGING.md). Kiểm tra: `npm run test:messages`, `npm run test:friends`, `npm run test:auth`, `npm run typecheck`, `node scripts/check-chat.cjs` và `npx expo export --platform android`.
- Chạy `npm install` để thêm STOMP client rồi khởi động lại backend và Metro. Socket tự lấy cùng host/port với API (`http` → `ws`, `https` → `wss`), dùng đường dẫn `/ws` và không đưa token vào URL. Nếu có reverse proxy, cần cho phép WebSocket upgrade ở `/ws`. Bản realtime hiện dùng một backend instance; nhóm và bridge nhiều instance chưa triển khai.

## Phiên đăng nhập

- “Ghi nhớ tôi” lưu refresh token và thời hạn trong SecureStore; access token chỉ ở bộ nhớ. Bỏ chọn thì phiên chỉ tồn tại trong lần chạy app. Đăng ký thành công mặc định ghi nhớ phiên.
- Khi mở app, refresh token đã lưu được đổi lấy phiên mới. Lỗi mạng hiển thị nút thử lại; token hết hạn/bị thu hồi đưa về đăng nhập.
- `src/auth/session.ts` điều phối refresh một lần cho các request đồng thời, tự refresh trước khi access token hết hạn và thử lại đúng một lần khi API xác thực trả `401`. Các API cần đăng nhập mới phải đi qua `SessionManager.request`, không tự gửi token cũ.
- `useSessionViewModel` nối SecureStore, vòng đời ứng dụng, đăng xuất và đổi mật khẩu. Đăng xuất luôn đóng phiên cục bộ; nếu máy chủ không thể xác nhận thu hồi, UI thông báo lỗi. Đổi mật khẩu thành công xóa phiên cục bộ và yêu cầu đăng nhập lại.
- Đăng ký/reset/đổi mật khẩu dùng giới hạn 8–128 ký tự và tối đa 72 byte UTF-8. Hai luồng OTP hiển thị thời gian chờ gửi lại theo phản hồi máy chủ.

Kiểm thử tự động: `npm run test:auth`, `npm run typecheck`, và `backend/mvnw.cmd test`.

Nghiệm thu trên thiết bị với backend và email thật: đăng ký OTP (sai/hết hạn/gửi lại), Google, ghi nhớ bật/tắt rồi force-stop/mở lại, access token hết hạn, mở lại khi mất mạng rồi thử lại, logout, reset/đổi mật khẩu và thử phiên cũ trên thiết bị thứ hai. Các bài test tự động không thay thế kiểm tra Google SDK, SecureStore native và email thực tế.

## Tài liệu tham khảo

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

Các nút Google, đăng nhập email, đăng ký và OTP đều dùng backend thật ở port `8080`; xem [hướng dẫn chạy auth](../docs/GOOGLE_AUTH_QUICKSTART.md). Mock API ở port `4010` chỉ còn dùng để thử contract riêng, không được app gọi.

Không commit node_modules, token, keystore hoặc API secret của backend. Khi tạo ứng dụng, thêm .gitignore và file cấu hình mẫu tương ứng.

## Chuyến đi và lịch trình thủ công

Luồng chuyến đi đã dùng API và PostgreSQL, hỗ trợ ngày linh hoạt/cụ thể, chỉnh lịch và tiến độ. Xem [kế hoạch và trạng thái](../docs/api/TRIP_IMPLEMENTATION_PLAN.md) và [hướng dẫn test API/UI](../docs/api/TRIP_TESTING.md). Các thao tác Android chính đã được kiểm thử; các ca còn lại ghi trong biên bản TRIP_ANDROID_ACCEPTANCE.md.

Bản đồ chuyến đi dùng OpenStreetMap Standard với cache WebView, attribution và định danh TripMate. Chỉ tải các tile đang xem; không có tải bản đồ offline. Dịch vụ công cộng không có SLA; trước khi mở rộng lưu lượng cần chọn nhà cung cấp phù hợp. [Chính sách tile OSM](https://operations.osmfoundation.org/policies/tiles/).

Kết quả thao tác Android và các ca chưa nghiệm thu: [TRIP_ANDROID_ACCEPTANCE.md](../docs/api/TRIP_ANDROID_ACCEPTANCE.md).

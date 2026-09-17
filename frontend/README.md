# TripMate Frontend

Thư mục triển khai ứng dụng Android TripMate. Hiện mới có README để giữ cấu trúc trên Git; chưa có project Expo, package.json hay ứng dụng để chạy.

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

Không commit node_modules, token, keystore hoặc API secret của backend. Khi tạo ứng dụng, thêm .gitignore và file cấu hình mẫu tương ứng.

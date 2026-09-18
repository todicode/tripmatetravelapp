# TripMate

Quy tắc triển khai bắt buộc: [MVVM frontend, Modular Monolith backend và coding standards](docs/CODING_STANDARDS.md).

Ứng dụng Android hỗ trợ nhóm bạn lập kế hoạch du lịch: quản lý chuyến đi, lịch trình thủ công và bản nháp AI, địa điểm/bản đồ, kết bạn qua QR, chat ảnh/PDF, thông báo và chia sẻ vị trí khi chủ động bật.

## Trạng thái dự án

Repo đang ở giai đoạn **kế hoạch và thiết kế database v1**. Đã có schema PostgreSQL tham chiếu, sơ đồ DBML, bộ kiểm tra ràng buộc và cấu hình database local. Đã có [API contract v1 và mock local](docs/api/README.md) để hai phía phát triển song song. Backend và mobile chưa được triển khai; chưa có API nghiệp vụ thật hay APK để chạy.

Phạm vi v1: một thành phố Việt Nam mỗi chuyến, 1–5 ngày, tối đa 10 thành viên tính cả owner. Mục tiêu bàn giao: 15/12/2026.

## Đọc tài liệu theo thứ tự

1. [Kế hoạch, phạm vi và timeline](TRIPMATE_PLAN.md).
2. [Lý do chọn công nghệ và các đánh đổi](docs/TECHNOLOGY_DECISIONS.md).
3. [Thiết kế ERD và quy tắc nghiệp vụ/transaction](TRIPMATE_ERD_V1.md).
4. [Từ điển dữ liệu: từng cột, quan hệ và index của 23 bảng](docs/database/DATA_DICTIONARY.md).
5. [API contract JSON, mock local và cách tích hợp](docs/api/README.md).
6. [Quy tắc backend/frontend bắt buộc tuân thủ](docs/api/TEAM_RULES.md).
7. [Dựng PostgreSQL local và xem ERD bằng DBeaver](docs/database/DBEAVER_LOCAL.md).

## Công nghệ dự kiến

| Phần | Lựa chọn |
| --- | --- |
| Android | React Native, TypeScript, Expo development build, Expo Router |
| State | TanStack Query và Zustand |
| Backend | Java 26, Spring Boot 4.1, Maven, Spring Security, JPA, Flyway |
| Dữ liệu | PostgreSQL 17; Redis cho Pub/Sub và vị trí có TTL |
| Tích hợp | Google Maps/Places/Routes, Groq, Cloudflare R2, Firebase Cloud Messaging |
| Vận hành | Docker Compose, Nginx, WireGuard, GitHub Actions/GHCR, Actuator, Prometheus/Grafana |

Đây là lựa chọn trong kế hoạch, chưa phải danh sách dependency đã build thành công. Xem [quy tắc chốt phiên bản](docs/TECHNOLOGY_DECISIONS.md#chot-phien-ban) trước khi tạo bộ khung ứng dụng.

## Cấu trúc repo

```text
README.md
TRIPMATE_PLAN.md                 Kế hoạch dự án
TRIPMATE_ERD_V1.md               Thiết kế và transaction nghiệp vụ
docs/
  TECHNOLOGY_DECISIONS.md        Lý do chọn công nghệ
  api/
    openapi.json               Contract REST + payload realtime/push
    TEAM_RULES.md              Quy tắc phối hợp backend/frontend
    README.md                  Chạy mock và kiểm tra contract
    mock-server.mjs            HTTP mock độc lập backend
  database/
    DATA_DICTIONARY.md           Giải thích schema cho thành viên nhóm
    tripmate_v1.sql              Nguồn chuẩn về cấu trúc và ràng buộc vật lý
    tripmate_v1.dbml             Sơ đồ có thể import vào công cụ DBML
    verify_tripmate_v1.sql       Kiểm tra constraint với fixture rollback
    compose.erd.yml              PostgreSQL local để review ERD
    .env.erd.example             Mẫu cấu hình, không chứa mật khẩu thật
    DBEAVER_LOCAL.md             Hướng dẫn dựng và kiểm tra database
```

[backend/](backend/README.md) và [frontend/](frontend/README.md) đã được Git theo dõi bằng README hướng dẫn riêng; ứng dụng Spring Boot và Expo chưa được khởi tạo.

## Chạy database local

Cần Docker Desktop đang chạy Linux containers. Tại thư mục gốc repo, dùng PowerShell:

```powershell
# Chỉ tạo khi chưa có file local; giữ nguyên mật khẩu đang dùng nếu đã dựng DB.
if (-not (Test-Path docs/database/.env.erd.local)) {
    Copy-Item docs/database/.env.erd.example docs/database/.env.erd.local
}
```

Mở `docs/database/.env.erd.local`, tự đặt giá trị `TRIPMATE_DB_PASSWORD`, rồi chạy:

```powershell
docker compose --env-file docs/database/.env.erd.local -f docs/database/compose.erd.yml up -d --wait
```

Kết nối PostgreSQL tại `127.0.0.1:5433`, database `tripmate_erd`, user `tripmate`. Schema được nạp **chỉ khi volume khởi tạo lần đầu**. File `.env.erd.local` được Git bỏ qua.

Xem [hướng dẫn đầy đủ và cách chạy bộ kiểm tra](docs/database/DBEAVER_LOCAL.md). SQL hiện là tài liệu tham chiếu, chưa phải migration Flyway và không được chạy lại trực tiếp lên database có dữ liệu.

## Công việc tiếp theo

Triển khai theo [API contract v1](docs/api/openapi.json), dựng Spring Boot/Flyway và Expo, rồi tích hợp từng module. Frontend có thể chạy ngay `node docs/api/mock-server.mjs` từ gốc repo và dùng `http://localhost:4010/api/v1` trong lúc backend phát triển. Tiêu chí nghiệm thu và phân công nằm trong [kế hoạch tuần 1](TRIPMATE_PLAN.md).

# TripMate Backend

Quy tắc triển khai bắt buộc: [Modular Monolith, đặt tên và chất lượng code](../docs/CODING_STANDARDS.md).

Thư mục triển khai backend TripMate. Hiện mới có README để giữ cấu trúc trên Git; chưa có ứng dụng Spring Boot, pom.xml hay Maven Wrapper để chạy.

Stack theo kế hoạch: Java 26, Spring Boot 4.1, Maven, Spring Security, JPA, Flyway và PostgreSQL 17. Redis, WebSocket/STOMP và các dịch vụ bên ngoài được bổ sung theo module.

## Tài liệu bắt đầu

- [Kế hoạch và phân công](../TRIPMATE_PLAN.md).
- [Lựa chọn công nghệ và chốt phiên bản](../docs/TECHNOLOGY_DECISIONS.md).
- [API contract JSON](../docs/api/openapi.json).
- [Quy tắc phối hợp backend/frontend](../docs/api/TEAM_RULES.md).
- [ERD và transaction nghiệp vụ](../TRIPMATE_ERD_V1.md).
- [Database local và DBeaver](../docs/database/DBEAVER_LOCAL.md).

## Công việc đầu tiên

1. Tạo bộ khung Spring Boot/Maven ngay trong thư mục này và thêm Maven Wrapper.
2. Chốt phiên bản dependency, cấu hình môi trường local và database phát triển riêng.
3. Chuyển schema tham chiếu thành migration Flyway; dùng Hibernate ddl-auto=validate.
4. Triển khai API theo contract, bổ sung test quyền/transaction và tích hợp từng module với frontend.

Không commit mật khẩu, token, API key, tệp cấu hình bí mật hoặc thư mục build. Khi tạo ứng dụng, thêm .gitignore và file cấu hình mẫu tương ứng.

Frontend có thể dùng [mock API](../docs/api/README.md) trong thời gian backend đang triển khai.

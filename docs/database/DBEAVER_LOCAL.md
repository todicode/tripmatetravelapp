# PostgreSQL local và DBeaver — TripMate ERD v1

PostgreSQL lưu và xử lý database; DBeaver kết nối để xem bảng, dữ liệu và sơ đồ quan hệ. Hướng dẫn này dành cho môi trường review ERD, chưa phải backend ứng dụng.

## 1. Chuẩn bị trên máy mới

Cài Docker Desktop và DBeaver, mở Docker Desktop ở chế độ Linux containers. Clone repo, rồi mở PowerShell tại thư mục gốc repo (ví dụ `D:\travelapp`).

Tạo cấu hình từ mẫu nếu chưa có file local:

```powershell
if (-not (Test-Path docs/database/.env.erd.local)) {
    Copy-Item docs/database/.env.erd.example docs/database/.env.erd.local
}
```

Mở `docs/database/.env.erd.local`, điền một mật khẩu riêng cho database local sau dấu `=` của `TRIPMATE_DB_PASSWORD`. Mẫu cố ý để trống; Compose sẽ từ chối chạy khi chưa có giá trị. Có thể dùng chuỗi ngẫu nhiên chữ/số để tránh ký tự bị Compose diễn giải.

File local không được đưa lên Git. Không ghi đè mật khẩu đang dùng nếu máy đã khởi tạo database.

Khởi động:

```powershell
docker compose --env-file docs/database/.env.erd.local -f docs/database/compose.erd.yml up -d --wait
```

Lần đầu cần tải image `postgres:17`. SQL được nạp từ `tripmate_v1.sql` khi volume còn mới; sau khi thành công có 23 bảng và 55 khóa ngoại, chưa có dữ liệu demo.

## 2. Kết nối DBeaver

| Trường | Giá trị |
| --- | --- |
| Database/driver | PostgreSQL |
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `tripmate_erd` |
| Username | `tripmate` |
| Password | Giá trị bạn đặt trong `.env.erd.local`, không gồm tên biến hoặc dấu `=` |

Chọn **Database → New Database Connection → PostgreSQL**, nhập thông tin, chọn **Test Connection**, rồi **Finish**. Nếu thiếu JDBC driver, DBeaver sẽ đề nghị tải. Xem [hướng dẫn tạo connection của DBeaver](https://dbeaver.com/docs/dbeaver/Create-Connection/).

Trong Database Navigator, mở connection → database → Schemas → public → Tables. Tùy thiết lập, một cấp database có thể được ẩn. Mở schema hoặc bảng, chọn tab **Diagram**; dùng Refresh nếu cây chưa cập nhật. DBeaver dựng quan hệ từ FK thực tế. Xem [hướng dẫn ER diagram](https://dbeaver.com/docs/dbeaver/ER-Diagrams/).

Đọc [từ điển dữ liệu](DATA_DICTIONARY.md) song song với sơ đồ; bắt đầu ở `trips → trip_members → itineraries → itinerary_days → itinerary_items`. Bảng trống là bình thường. Những chỉnh sửa dữ liệu bạn commit trong DBeaver sẽ ghi vào database local.

## 3. Bật, dừng và kiểm tra

```powershell
# Khởi động lại
docker compose --env-file docs/database/.env.erd.local -f docs/database/compose.erd.yml up -d --wait

# Xem trạng thái
docker compose --env-file docs/database/.env.erd.local -f docs/database/compose.erd.yml ps

# Dừng; vẫn giữ volume và dữ liệu
docker compose --env-file docs/database/.env.erd.local -f docs/database/compose.erd.yml stop
```

Volume có tên `tripmate_erd_v1_local_pgdata`. Cổng chỉ mở trên `127.0.0.1:5433` của máy hiện tại.

Sửa SQL rồi restart **không cập nhật schema đã khởi tạo**. Đổi biến mật khẩu cũng không đổi password của tài khoản PostgreSQL đã tồn tại. Khi phát triển backend, quản lý thay đổi bằng migration Flyway; không xóa volume để xử lý lỗi mà chưa kiểm tra dữ liệu cần giữ.

## 4. Chạy bộ kiểm tra ràng buộc

Dùng database local vừa khởi tạo, chưa có dữ liệu nghiệp vụ; không chạy trên production. Script dùng dữ liệu giả, bật `ON_ERROR_STOP` và rollback fixture. Script có lệnh riêng của `psql`, nên chạy bằng lệnh dưới đây thay vì dán toàn bộ vào SQL editor thông thường của DBeaver:

```powershell
Get-Content -Raw -Encoding UTF8 docs/database/verify_tripmate_v1.sql |
    docker compose --env-file docs/database/.env.erd.local -f docs/database/compose.erd.yml exec -T postgres psql -X -U tripmate -d tripmate_erd -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
    throw "Database constraint checks failed."
}
```

Kết quả mong đợi: **22 thông báo PASS**, không có ERROR, cuối cùng hiển thị `table_count = 23` và `foreign_key_count = 55`. Hai số đếm cuối là thông tin đối chiếu; script hiện chưa tự assert chúng. Sau rollback, fixture không được lưu lại.

Các ca này kiểm tra constraint database. Giới hạn 10 thành viên, quyền ACTIVE, tranh chấp cập nhật lịch, FCM và R2 vẫn cần test backend sau khi triển khai.

## 5. Các file liên quan

| File | Vai trò |
| --- | --- |
| [compose.erd.yml](compose.erd.yml) | Service PostgreSQL, port, volume, healthcheck và init SQL |
| [.env.erd.example](.env.erd.example) | Mẫu được commit để người mới tự tạo cấu hình |
| `.env.erd.local` | Mật khẩu riêng từng máy, được Git bỏ qua |
| [.gitignore](.gitignore) | Quy tắc bỏ qua file local |
| [tripmate_v1.sql](tripmate_v1.sql) | Schema tham chiếu, nguồn chuẩn của constraint/index |
| [tripmate_v1.dbml](tripmate_v1.dbml) | Sơ đồ thiết kế |
| [verify_tripmate_v1.sql](verify_tripmate_v1.sql) | Kiểm tra với fixture rollback |
| [DATA_DICTIONARY.md](DATA_DICTIONARY.md) | Ý nghĩa từng cột, quan hệ và cách dùng index |
| [TRIPMATE_ERD_V1.md](../../TRIPMATE_ERD_V1.md) | Quy tắc nghiệp vụ và thứ tự transaction |

## 6. Nếu kết nối lỗi

- **Docker engine/pipe không tồn tại:** mở Docker Desktop, đợi engine sẵn sàng và kiểm tra chế độ Linux containers.
- **Thiếu env file hoặc password rỗng:** làm bước 1 và đặt giá trị trong file local.
- **Connection refused:** kiểm tra service postgres, host `127.0.0.1` và port `5433`.
- **Port already allocated:** có dịch vụ khác dùng 5433; nếu đổi port trong Compose phải đổi cả connection DBeaver.
- **Password authentication failed:** đối chiếu mật khẩu đã dùng khi khởi tạo volume; chỉ sửa env không đổi tài khoản DB cũ.
- **Không thấy bảng:** chọn đúng database/schema, kiểm tra log init và Refresh.
- **Relation already exists:** không chạy lại DDL trên database đã được init.

# Bằng chứng CSDL Prisma + SQLite (YC2)

- `dev.db`: CSDL SQLite được tạo bằng đúng 4 Prisma migrations hiện hành và seed đủ 10 bảng nghiệp vụ.
- `yc2-sqlite-evidence.txt`: kết quả kiểm tra schema, dữ liệu và truy vấn tính tiền dạy, có đối chiếu tính tay = SQL.
- `verify_sqlite.py`: script đọc/kiểm tra bằng chứng an toàn; không xóa hay tạo lại CSDL.

## Tái lập trên máy có Internet (cách chuẩn, khuyến nghị)
```bash
cd source/teacher-payroll-app
npm install
npm run db:deploy                    # áp dụng toàn bộ migration
npm run db:seed                       # nạp dữ liệu mẫu
npm run dev                           # app đọc/ghi dữ liệu qua SQLite
```

## Mở nhanh CSDL để kiểm tra
```bash
sqlite3 prisma/dev.db ".tables"
sqlite3 prisma/dev.db "SELECT id, fullName FROM Teacher;"
```

## Kiểm tra lại file bằng chứng trong repository

```bash
python evidence/db-sqlite/verify_sqlite.py --check-only
```

Bỏ `--check-only` để đồng thời cập nhật `yc2-sqlite-evidence.txt`. Script trả mã
lỗi nếu thiếu bảng/cột/index, vi phạm khóa ngoại, có hệ số bằng cấp không hợp lệ
hoặc còn dữ liệu Selenium bị rò rỉ.

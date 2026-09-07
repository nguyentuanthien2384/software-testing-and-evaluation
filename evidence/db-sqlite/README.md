# Bằng chứng CSDL Prisma + SQLite (YC2)

- `dev.db`: CSDL SQLite được tạo bằng toàn bộ Prisma migrations hiện hành và seed đủ 10 bảng nghiệp vụ.
- `yc2-sqlite-evidence.txt`: kết quả kiểm tra schema, dữ liệu và truy vấn tính tiền dạy theo công thức nhân, có đối chiếu tính tay = SQL.
- `verify_sqlite.py`: script đọc/kiểm tra bằng chứng an toàn; không xóa hay tạo lại CSDL.

Quy tắc dữ liệu hiện hành yêu cầu mọi chỉ số số học tham gia tính tiền phải lớn
hơn `0`. Hệ số lớp là hệ số nhân `0,9 / 1,0 / 1,1 / 1,2`; các khoảng sĩ số
tương ứng bắt đầu từ `1` sinh viên. Công thức được kiểm chứng là:

```text
tiền dạy = số tiết × hệ số học phần × hệ số lớp × định mức tiết × hệ số bằng cấp
```

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
lỗi nếu thiếu bảng/cột/index/migration, vi phạm khóa ngoại, có bất kỳ chỉ số
nghiệp vụ nào không lớn hơn `0`, sai bộ hệ số lớp chuẩn hoặc còn dữ liệu
Selenium bị rò rỉ.

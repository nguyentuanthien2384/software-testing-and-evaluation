# Bằng chứng CSDL Prisma + SQLite (YC2)

- `dev.db`: CSDL SQLite đã được tạo theo đúng lược đồ `prisma/schema.prisma` và seed đủ 10 bảng.
- `yc2-sqlite-evidence.txt`: log tạo bảng + seed + truy vấn tính tiền dạy (join 7 bảng), có đối chiếu tính tay = SQL.
- `verify_sqlite.py`: script Python tái lập bằng chứng (không cần Prisma engine).

## Tái lập trên máy có Internet (cách chuẩn, khuyến nghị)
```bash
cd source/teacher-payroll-app
npm install
npx prisma migrate dev --name init   # tạo prisma/dev.db + bảng
npm run db:seed                       # nạp dữ liệu mẫu
npm run dev                           # app đọc/ghi dữ liệu qua SQLite
```

## Mở nhanh CSDL để kiểm tra
```bash
sqlite3 prisma/dev.db ".tables"
sqlite3 prisma/dev.db "SELECT id, fullName FROM Teacher;"
```

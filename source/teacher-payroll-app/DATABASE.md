# Hướng dẫn CSDL (Prisma + SQLite) – YC2

## Lần đầu thiết lập
```bash
npm install                 # tự chạy prisma generate (postinstall)
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Kiến trúc
- `prisma/schema.prisma`: 10 model + quan hệ khoá ngoại.
- `src/lib/db.ts`: PrismaClient singleton.
- `src/lib/repository.ts`: getAllData / replaceAllData / computePayrollLines.
- API: `GET/PUT /api/state`, `GET /api/teachers`, `GET /api/reports`, `POST /api/payroll`.
- `src/lib/use-app-data.ts`: nạp từ `/api/state` và ghi (write-through) xuống SQLite.

## Scripts
| Lệnh | Tác dụng |
| --- | --- |
| `npm run db:migrate` | Tạo/áp migration (dev) |
| `npm run db:seed` | Nạp dữ liệu mẫu |
| `npm run db:reset` | Reset CSDL + seed lại |
| `npm run db:deploy` | Áp migration ở môi trường production |

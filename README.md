# N01_G7

Gói này là bản đã được bổ sung trực tiếp vào source code cho hai yêu cầu:

- **YC7**: Test tự động bằng Selenium WebDriver.
- **YC8**: Test hiệu năng bằng Apache JMeter.

Dự án chính là “Phần mềm tính tiền dạy cho giáo viên”, xây dựng bằng Next.js/TypeScript, có unit test Jest, bộ Selenium WebDriver và bộ JMeter baseline performance test.

## Thành phần chính

- `source/teacher-payroll-app`: source Next.js/TypeScript hoàn chỉnh.
- `tests/selenium-js`: bộ YC7 Selenium WebDriver hoàn chỉnh bằng JavaScript/Mocha/Page Object.
- `tests/selenium`: script Selenium Python ban đầu, giữ lại để tham khảo/chạy nhanh.
- `tests/jmeter`: bộ YC8 JMeter baseline, dữ liệu CSV, script chạy non-GUI và performance gate.
- `.github/workflows/yc7-yc8-qa.yml`: workflow CI mẫu chạy Selenium + JMeter.
- `scripts/run-yc7-yc8.sh`: script chạy toàn bộ YC7 + YC8 local.
- `docs`: tài liệu đặc tả, SQA/Test Plan, checklist, report Selenium/JMeter, review chéo.
- `evidence`: nơi lưu minh chứng chạy test, screenshot, coverage, JMeter result.
- `original`: file yêu cầu và test case gốc.

## Màn hình đã có trong source

1. Trang chủ/dashboard.
2. Quản lý bằng cấp.
3. Quản lý khoa.
4. Quản lý giáo viên.
5. Thống kê giáo viên.
6. Quản lý học phần.
7. Quản lý kỳ học.
8. Quản lý lớp học phần.
9. Phân công giảng viên.
10. Thiết lập định mức tiết.
11. Thiết lập hệ số giáo viên.
12. Thiết lập hệ số lớp.
13. Tính tiền dạy.
14. Báo cáo tiền dạy theo giáo viên/khoa/toàn trường.
15. Hệ thống/reset dữ liệu demo.

## Chạy app

```bash
cd source/teacher-payroll-app
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Chạy unit test

```bash
cd source/teacher-payroll-app
npm test
npm run coverage
```

## Chạy YC7 Selenium WebDriver

Terminal 1:

```bash
cd source/teacher-payroll-app
npm install
npm run dev
```

Terminal 2:

```bash
cd tests/selenium-js
npm install
BASE_URL=http://127.0.0.1:3000 BROWSER=chrome npm run test:junit
```

Kết quả:

- JUnit XML: `tests/selenium-js/reports/junit/yc7-selenium-results.xml`
- Screenshot khi lỗi: `evidence/screenshots/*.png`

## Chạy YC8 JMeter

Điều kiện: app đang chạy tại `http://127.0.0.1:3000`, máy đã cài JMeter.

```bash
bash tests/jmeter/run-yc8.sh
```

Kết quả:

- Raw result: `evidence/jmeter-results/yc8-payroll-results.jtl`
- HTML dashboard: `evidence/jmeter-results/html-report/index.html`
- Performance gate: console output từ `tests/jmeter/check-thresholds.mjs`

## Chạy toàn bộ YC7 + YC8 local

Điều kiện: máy có Node.js, Java và JMeter trong PATH.

```bash
npm run qa:yc7-yc8
```

Script này sẽ build app, start app, chờ `/api/health`, chạy Selenium WebDriver, sau đó chạy JMeter baseline.

## CI/CD

Workflow mẫu đã được thêm tại:

```text
.github/workflows/yc7-yc8-qa.yml
```

Workflow này thực hiện:

1. Cài Node.js và Java.
2. Build và start Next.js app.
3. Chạy YC7 Selenium WebDriver trên Chrome headless.
4. Cài JMeter.
5. Chạy YC8 JMeter baseline.
6. Upload JUnit XML, screenshot, `.jtl`, HTML dashboard và app log thành artifact.

## Lưu ý nộp bài

Bản này đã bổ sung trực tiếp mã test và cấu hình vào source zip. Khi nộp hoặc demo, nhóm nên chạy lại `npm run qa:yc7-yc8`, mở HTML dashboard JMeter và lưu screenshot/log vào thư mục `evidence/`.


## Cập nhật v4 — CSDL Prisma + SQLite (YC2)

Đã bổ sung backend thật bằng Prisma + SQLite (khớp đặc tả). Thiết lập:

```bash
cd source/teacher-payroll-app
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Xem chi tiết: `source/teacher-payroll-app/DATABASE.md` và bằng chứng `evidence/db-sqlite/`.

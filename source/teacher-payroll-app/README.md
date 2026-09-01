# N01_G7 - Phần mềm tính tiền dạy cho giáo viên

Bản hoàn chỉnh theo báo cáo/đặc tả Nhóm 11. Source này triển khai các màn hình CRUD và luồng nghiệp vụ chính đã mô tả trong tài liệu: quản lý bằng cấp, khoa, giáo viên, học phần, kỳ học, lớp học phần, phân công giảng viên, thiết lập định mức/hệ số, tính tiền dạy và báo cáo.

## Công nghệ

- Next.js App Router
- React + TypeScript
- Prisma + SQLite làm nguồn dữ liệu chính; LocalStorage chỉ là bản sao xem tạm khi mất kết nối
- Phiên đăng nhập bằng cookie HttpOnly được ký tại máy chủ và phân quyền API
- Jest cho unit test nghiệp vụ
- Selenium WebDriver cho YC7 tại `../../tests/selenium-js`
- Apache JMeter cho YC8 tại `../../tests/jmeter`

## Chạy dự án

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`.

Sao chép `.env.example` thành `.env` và đổi `AUTH_SESSION_SECRET`, `ADMIN_PASSWORD`, `TESTER_PASSWORD` trước khi triển khai. Hai tài khoản mặc định cho môi trường demo là `admin/admin@123` và `tester/tester@123`.

Các tính năng chính gồm CRUD danh mục có kiểm tra nghiệp vụ, tạo nhiều lớp tự tăng mã, sao chép hệ số từ năm trước, khóa kỳ học, trạng thái khoa, thống kê giáo viên/lớp học phần, tính tiền an toàn và báo cáo CSV hoặc in/lưu PDF.

## Chạy kiểm thử nghiệp vụ bằng Jest

```bash
npm test
npm run coverage
```

## Chạy YC7 Selenium WebDriver

Từ thư mục gốc dự án:

```bash
cd tests/selenium-js
npm install
BASE_URL=http://127.0.0.1:3000 BROWSER=chrome npm run test:junit
```

UI đã được bổ sung `data-testid` để selector Selenium ổn định hơn.

## Chạy YC8 JMeter

Từ thư mục gốc dự án, sau khi app đang chạy:

```bash
bash tests/jmeter/run-yc8.sh
```

## Ghi chú nộp bài

Dự án này là bản demo hoàn chỉnh về giao diện, logic nghiệp vụ và kiểm thử tự động. Khi nộp chính thức, nhóm nên chạy lại unit test, Selenium, JMeter, chụp ảnh minh chứng và lưu vào thư mục `evidence/`.

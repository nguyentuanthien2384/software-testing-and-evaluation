# N01_G11 - Phần mềm tính tiền dạy cho giáo viên

Bản hoàn chỉnh theo báo cáo/đặc tả Nhóm 11. Source này triển khai các màn hình CRUD và luồng nghiệp vụ chính đã mô tả trong tài liệu: quản lý bằng cấp, khoa, giáo viên, học phần, kỳ học, lớp học phần, phân công giảng viên, thiết lập định mức/hệ số, tính tiền dạy và báo cáo.

## Công nghệ

- Next.js App Router
- React + TypeScript
- LocalStorage làm kho dữ liệu demo để chạy ngay, không cần cấu hình CSDL
- Jest cho unit test nghiệp vụ
- Selenium WebDriver cho YC7 tại `../../tests/selenium-js`
- Apache JMeter cho YC8 tại `../../tests/jmeter`

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

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

# YC7 - Selenium WebDriver automated tests

Bộ test này bổ sung YC7 ở mức có thể chạy tự động bằng Selenium WebDriver, dùng JavaScript/Mocha để đồng bộ với source Next.js hiện tại.

## Nội dung đã triển khai

- Page Object cho Dashboard, CRUD, Payroll và Reports.
- Smoke/regression suite cho các luồng chính:
  - mở dashboard;
  - thêm mới bằng cấp;
  - kiểm tra trang giáo viên;
  - tính tiền dạy thủ công theo dữ liệu hợp lệ;
  - mở báo cáo tiền dạy.
- Selector ổn định bằng `data-testid` đã được bổ sung vào UI.
- Ảnh chụp màn hình khi test fail, lưu về `evidence/screenshots`.
- JUnit XML cho CI, lưu tại `tests/selenium-js/reports/junit`.

## Cài đặt

Từ thư mục gốc dự án:

```bash
cd tests/selenium-js
npm install
```

## Chạy local

Terminal 1:

```bash
cd source/teacher-payroll-app
npm install
npm run dev
```

Terminal 2:

```bash
cd tests/selenium-js
BASE_URL=http://127.0.0.1:3000 BROWSER=chrome npm run test:junit
```

Có thể đổi browser:

```bash
BROWSER=firefox npm run test:junit
BROWSER=edge npm run test:junit
```

Mặc định test chạy headless. Để xem trình duyệt thật:

```bash
HEADLESS=false BROWSER=chrome npm test
```

## Kết quả đầu ra

- JUnit XML: `tests/selenium-js/reports/junit/yc7-selenium-results.xml`
- Screenshot khi lỗi: `evidence/screenshots/*.png`

## Ghi chú về browser driver

Selenium 4 có thể tự tìm/tải driver bằng Selenium Manager khi môi trường có Internet. Nếu máy demo hoặc máy lab không có Internet, cài sẵn ChromeDriver/GeckoDriver và truyền đường dẫn:

```bash
CHROMEDRIVER_PATH=/path/to/chromedriver CHROME_BINARY=/path/to/chrome npm run test:junit
```

Trên Linux dùng Chromium, bộ test tự dò một số đường dẫn phổ biến như `/usr/bin/chromium`.

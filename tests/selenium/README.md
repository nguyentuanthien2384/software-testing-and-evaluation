# Selenium WebDriver

Thư mục này giữ script Python Selenium ban đầu để chạy nhanh smoke test. Bộ YC7 hoàn chỉnh hơn đã được bổ sung tại `tests/selenium-js` với Page Object, JUnit XML, screenshot khi fail và cấu hình phù hợp CI.

## Cách chạy script Python cũ

Terminal 1:

```bash
cd source/teacher-payroll-app
npm install
npm run dev
```

Terminal 2:

```bash
pip install selenium webdriver-manager
python tests/selenium/selenium_teacher_payroll_test.py
```

Script tự đăng nhập bằng tài khoản demo quản trị, mặc định chạy headless và luôn
dọn bản ghi bằng cấp tạm của chính lần chạy. Có thể đặt `HEADLESS=false` để xem
trình duyệt hoặc `BASE_URL` để đổi địa chỉ ứng dụng.

## Khuyến nghị cho YC7

Dùng bộ mới:

```bash
cd tests/selenium-js
npm install
BASE_URL=http://127.0.0.1:3000 BROWSER=chrome npm run test:junit
```

Kết quả JUnit XML nằm ở `tests/selenium-js/reports/junit`; screenshot lỗi nằm ở `evidence/screenshots`.


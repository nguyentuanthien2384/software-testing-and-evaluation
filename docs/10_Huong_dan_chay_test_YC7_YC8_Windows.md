# Hướng dẫn chạy test tự động YC7 (Selenium) & YC8 (JMeter) trên Windows

Tài liệu hướng dẫn chạy 2 bộ kiểm thử tự động trên Windows/PowerShell.

- **YC7**: kiểm thử giao diện (UI) tự động bằng Selenium WebDriver + Mocha.
- **YC8**: kiểm thử hiệu năng (performance) bằng Apache JMeter.

---

## 0. Yêu cầu môi trường

| Thành phần | Bắt buộc cho | Ghi chú |
|---|---|---|
| Node.js 20+ | YC7, YC8 (gate) | đã có (v22) |
| Google Chrome | YC7 | Selenium Manager tự tải chromedriver khớp |
| Java 8+ (khuyến nghị 11+) | YC8 | JMeter cần Java |
| Apache JMeter 5.6.3 | YC8 | đã tải sẵn ở `tools/apache-jmeter-5.6.3` |

> Lưu ý quan trọng: **chạy test trên bản build production** (`npm run build` + `npm run start`), KHÔNG chạy trên `npm run dev`. Chế độ dev có Fast Refresh/HMR gây remount component làm test UI chập chờn.

---

## 1. Khởi động ứng dụng (bắt buộc trước khi test)

Mở 1 cửa sổ PowerShell và để chạy nền:

```powershell
cd source\teacher-payroll-app
npm install
npm run build
npm run start    # chạy tại http://localhost:3000
```

Kiểm tra app sống:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing
```

---

## 2. Chạy YC7 - Selenium

Mở PowerShell thứ 2:

```powershell
# Cách nhanh (script đã viết sẵn)
./scripts/run-yc7.ps1

# Tùy chọn
./scripts/run-yc7.ps1 -BaseUrl http://127.0.0.1:3000 -Browser chrome
./scripts/run-yc7.ps1 -Headless:$false   # xem trình duyệt thật
```

Hoặc chạy thủ công:

```powershell
cd tests\selenium-js
npm install
$env:BASE_URL="http://127.0.0.1:3000"; $env:BROWSER="chrome"; npm run test:junit
```

Bộ test gồm 12 ca:
- **login.e2e.mjs** (6 ca): đăng nhập admin/tester, sai mật khẩu, chặn truy cập khi chưa đăng nhập, phân quyền form admin/tester.
- **yc7.smoke.e2e.mjs** (6 ca): dashboard, CRUD bằng cấp, trang giáo viên, tính tiền dạy, báo cáo.

Kết quả:
- JUnit XML: `tests/selenium-js/reports/junit/yc7-selenium-results.xml`
- Ảnh chụp khi fail: `evidence/screenshots/*.png`

---

## 3. Chạy YC8 - JMeter

App phải đang chạy. Mở PowerShell:

```powershell
# Dùng JMeter đã tải sẵn trong repo
./scripts/run-yc8.ps1 -JMeterBin "tools\apache-jmeter-5.6.3\bin\jmeter.bat"

# Tùy chỉnh tải
./scripts/run-yc8.ps1 -JMeterBin "tools\apache-jmeter-5.6.3\bin\jmeter.bat" -Users 50 -Ramp 20 -Loops 10

# Tùy chỉnh ngưỡng pass/fail
./scripts/run-yc8.ps1 -JMeterBin "tools\apache-jmeter-5.6.3\bin\jmeter.bat" -MaxAverageMs 800 -MaxP95Ms 1500 -MaxErrorRate 0.5
```

Endpoint được kiểm thử: `GET /api/health`, `POST /api/payroll`, `GET /api/reports`.

Ngưỡng mặc định (gate):
- Average ≤ 1000 ms
- P95 ≤ 2000 ms
- Error rate ≤ 1%

Kết quả:
- Raw JTL: `evidence/jmeter-results/yc8-payroll-results.jtl`
- HTML dashboard: `evidence/jmeter-results/html-report/index.html`
- Tóm tắt + kết luận gate in ra console.

---

## 4. Cài JMeter trên máy khác (nếu chưa có)

```powershell
# Tải và giải nén thủ công
Invoke-WebRequest "https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.3.zip" -OutFile "tools\apache-jmeter-5.6.3.zip"
Expand-Archive "tools\apache-jmeter-5.6.3.zip" -DestinationPath "tools" -Force
```

Sau đó dùng `-JMeterBin "tools\apache-jmeter-5.6.3\bin\jmeter.bat"`.

---

## 5. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `'next' is not recognized` | thiếu dependency | `npm install` trong `source/teacher-payroll-app` |
| Test UI chập chờn, input trống | chạy trên `npm run dev` (HMR) | chạy trên `npm run build` + `npm run start` |
| Selenium không tìm thấy driver | máy không có Internet | cài sẵn chromedriver và set `CHROMEDRIVER_PATH` |
| JMeter `Problem loading XML` | sai cấu trúc `.jmx` | đã sửa trong repo (mỗi phần tử có `<hashTree/>` theo sau) |
| `Không tìm thấy JMeter` | jmeter chưa cài/không trong PATH | truyền `-JMeterBin` trỏ tới `jmeter.bat` |

---

## 5b. Test bằng phần mềm có giao diện (GUI)

### YC8 - JMeter GUI (khuyến nghị)

Mở JMeter ở chế độ giao diện, nạp sẵn test plan:

```powershell
./scripts/open-jmeter-gui.ps1
# hoặc
tools\apache-jmeter-5.6.3\bin\jmeter.bat -t tests\jmeter\teacher_payroll_baseline.jmx
```

Trong cửa sổ JMeter:
1. Bảo đảm app đang chạy tại `http://127.0.0.1:3000`.
2. (Tùy chọn) Thêm Listener để xem kết quả: chuột phải vào **Thread Group** → Add → Listener → **Summary Report** / **View Results Tree** / **Graph Results**.
3. (Tùy chọn) Chỉnh số lượng user/loops trực tiếp trong **Baseline Load Profile**.
4. Bấm nút **Start (▶ màu xanh)** trên thanh công cụ để chạy.
5. Xem số liệu (Average, P95, Throughput, % Error) ngay trong Listener.

> Lưu ý: chạy hiệu năng thật nên dùng chế độ non-GUI (`run-yc8.ps1`); GUI phù hợp để xây/sửa kịch bản và quan sát trực quan.

### YC7 - xem trình duyệt tự thao tác

Chạy bộ test hiện có nhưng hiện trình duyệt thật (không headless):

```powershell
./scripts/run-yc7.ps1 -Headless:$false
```

### YC7 - Test Explorer trong Cursor/VS Code

1. Cài extension **Mocha Test Explorer** (hoặc **Test Explorer UI**).
2. Mở thư mục `tests/selenium-js`.
3. Chạy từng test bằng nút ▶ trong cây test ở thanh bên (đặt `BASE_URL`, `BROWSER` trong cấu hình nếu cần).

### YC7 - Selenium IDE (ghi & phát lại, không cần code)

1. Cài tiện ích **Selenium IDE** cho Chrome/Edge.
2. Mở app, bấm record, thao tác đăng nhập/CRUD/tính tiền, lưu lại.
3. Bấm phát lại để chạy tự động. Đây là bộ kịch bản riêng, độc lập với code Mocha hiện có.

---

## 6. Kết quả tham chiếu (đã chạy thực tế)

- YC7: **12/12 PASS**.
- YC8 (20 users, 5 loops = 300 samples): avg ≈ 9.5 ms, p95 ≈ 28 ms, error 0% → **gate PASSED**.

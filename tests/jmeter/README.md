# YC8 - JMeter performance test

Thư mục này triển khai YC8 bằng Apache JMeter cho các API chính của ứng dụng tính tiền dạy.

## File chính

- `teacher_payroll_baseline.jmx`: test plan baseline có tham số hóa.
- `data/payroll.csv`: dữ liệu đầu vào cho `POST /api/payroll`.
- `user.properties`: cấu hình lưu `.jtl` dạng CSV và HTML dashboard.
- `check-thresholds.mjs`: gate hiệu năng đọc `.jtl`, kiểm tra average, p95, error rate và throughput.
- `run-yc8.sh`: script chạy non-GUI và sinh report.

## Endpoint được kiểm thử

- `GET /api/health`
- `POST /api/payroll`
- `GET /api/reports`

## Chạy local

Điều kiện: app đang chạy tại `http://127.0.0.1:3000` và máy đã cài JMeter.

```bash
bash tests/jmeter/run-yc8.sh
```

Hoặc chạy trực tiếp:

```bash
jmeter \
  -q tests/jmeter/user.properties \
  -n \
  -t tests/jmeter/teacher_payroll_baseline.jmx \
  -Jprotocol=http \
  -Jhost=127.0.0.1 \
  -Jport=3000 \
  -Jusers=50 \
  -Jramp=20 \
  -Jloops=10 \
  -JmaxResponseMs=2000 \
  -JdataFile=tests/jmeter/data/payroll.csv \
  -l evidence/jmeter-results/yc8-payroll-results.jtl \
  -e -o evidence/jmeter-results/html-report
```

## Gate mặc định

`check-thresholds.mjs` dùng ngưỡng mặc định:

- Average <= 1000 ms
- P95 <= 2000 ms
- Error rate <= 1%
- Throughput toàn bài >= 10 request/giây
- Mỗi API/login cũng phải đạt riêng các ngưỡng average, P95 và error rate ở trên
- Kết quả phải có đủ bốn nhãn và đúng số mẫu của cấu hình users/loops
- Mẫu cuối cùng không được cũ quá 60 phút

Với cấu hình mặc định 50 users × 10 loops, gate yêu cầu đúng 1.550 mẫu:
50 lần đăng nhập và 500 mẫu cho từng API health, payroll, reports. Thời lượng dùng để
tính throughput chạy từ thời điểm bắt đầu mẫu đầu tiên đến thời điểm kết thúc mẫu cuối
cùng (`timeStamp + elapsed`). Vì vậy file JTL cũ hoặc file bị dừng giữa chừng không thể
được chấm đạt nhầm.

Có thể override bằng biến môi trường:

```bash
MAX_AVERAGE_MS=800 MAX_P95_MS=1500 MAX_ERROR_RATE=0.5 MIN_THROUGHPUT=20 bash tests/jmeter/run-yc8.sh
```

Có thể đổi thời hạn của artifact bằng `MAX_ARTIFACT_AGE_MINUTES`. Đặt giá trị này
bằng `0` chỉ khi cần chấm lại một artifact lịch sử có chủ đích.

Kiểm thử riêng bộ chấm ngưỡng (không khởi động app và không chạy tải):

```bash
npm run test:jmeter-checker
```

## Kết quả đầu ra

- Raw result: `evidence/jmeter-results/yc8-payroll-results.jtl`
- HTML dashboard: `evidence/jmeter-results/html-report/index.html`
- Summary gate: in trực tiếp ra console hoặc log CI.


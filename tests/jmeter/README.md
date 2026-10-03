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

Các payload tiền dạy chỉ dùng chỉ số lớn hơn `0` và bộ hệ số lớp dương
`0,9 / 1,0 / 1,1 / 1,2`. Assertion đối chiếu cả số tiết quy đổi và thành tiền
theo công thức:

```text
số tiết quy đổi = số tiết × hệ số học phần × hệ số lớp
thành tiền = số tiết quy đổi × định mức tiết × hệ số bằng cấp
```

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
- Không chấp nhận cột trùng, dòng sai cấu trúc, dữ liệu số trống hay trạng thái success không phải true/false
- Không chấp nhận thời điểm kết thúc vượt quá một phút trong tương lai (cho phép lệch đồng hồ nhỏ)

Gate so sánh chỉ số chưa làm tròn với ngưỡng; số làm tròn hai chữ số chỉ dùng để
hiển thị. Kiểm thử bộ chấm không phụ thuộc cấu hình tải trong biến môi trường.

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

Để kiểm tra tải đồng thời cao hơn baseline, chạy `JMETER_USERS=50 JMETER_RAMP=1
JMETER_LOOPS=100 bash tests/jmeter/run-yc8.sh`. Xác minh đỉnh `allThreads` trong JTL;
50 luồng tạo trong 20 giây có thể lần lượt hoàn tất trước khi luồng kế tiếp chạy.
Parser hỗ trợ field CSV được quote chứa dấu phẩy, dấu nháy kép và nhiều dòng.
HTTP keep-alive được bật để các luồng tái sử dụng kết nối, tránh hết cổng tạm trên
máy phát tải khi mỗi request tạo một kết nối mới.

Kiểm thử riêng bộ chấm ngưỡng (không khởi động app và không chạy tải):

```bash
npm run test:jmeter-checker
```

Kiểm định assertion của cả hai JMX bằng JMeter thật và HTTP fixture (cần Java,
JMeter; đặt `JMETER_HOME` nếu không dùng bản trong `tools/apache-jmeter-5.6.3`):

```bash
npm run test:jmeter-assertions
```

Các fixture xác minh tiền sai gấp 10 lần, số tiết sai phần thập phân, numeric
string, thiếu trường và JSON hỏng đều fail; numeric JSON đúng vẫn pass.

## Kết quả đầu ra

- Raw result: `evidence/jmeter-results/yc8-payroll-results.jtl`
- HTML dashboard: `evidence/jmeter-results/html-report/index.html`
- Summary gate: in trực tiếp ra console hoặc log CI.


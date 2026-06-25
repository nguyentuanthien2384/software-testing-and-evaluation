# Test case - Chức năng Đăng nhập & Phân quyền (Login / RBAC)

- **Module:** Authentication & Authorization
- **Ứng dụng:** `source/teacher-payroll-app` (Next.js 15, App Router)
- **Trang đăng nhập:** `/login`
- **Tài khoản demo:**
  - `admin` / `admin@123` — vai trò **Quản trị viên (admin)**
  - `tester` / `tester@123` — vai trò **Kiểm thử viên (tester)**

---

## 1. Ma trận phân quyền (RBAC)

| Quyền | Mô tả | admin | tester |
|---|---|:---:|:---:|
| `data:view` | Xem danh mục, danh sách dữ liệu | ✅ | ✅ |
| `data:manage` | Thêm / sửa / xoá dữ liệu | ✅ | ❌ |
| `payroll:calculate` | Tính tiền dạy | ✅ | ✅ |
| `reports:view` | Xem & xuất báo cáo | ✅ | ✅ |
| `system:reset` | Reset dữ liệu hệ thống | ✅ | ❌ |

> tester ở chế độ **chỉ đọc + kiểm thử**: xem được mọi trang dữ liệu, chạy tính tiền và xem báo cáo, nhưng không thấy form thêm/sửa, không có nút Sửa/Xoá, không thấy menu "Hệ thống" và không reset được dữ liệu.

---

## 2. Test case kiểm thử thủ công (Manual)

### 2.1. Đăng nhập

| ID | Tiêu đề | Tiền điều kiện | Các bước | Dữ liệu | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-LOGIN-01 | Admin đăng nhập đúng | Đã đăng xuất | Mở `/login` → nhập user/pass → bấm Đăng nhập | admin / admin@123 | Chuyển về `/`; topbar hiện "Quản trị viên" |
| TC-LOGIN-02 | Tester đăng nhập đúng | Đã đăng xuất | Như trên | tester / tester@123 | Chuyển về `/`; topbar hiện "Kiểm thử viên" |
| TC-LOGIN-03 | Sai mật khẩu | Đã đăng xuất | Nhập đúng user, sai pass → Đăng nhập | admin / sai123 | Hiện lỗi "Tên đăng nhập hoặc mật khẩu không đúng."; vẫn ở `/login` |
| TC-LOGIN-04 | Tài khoản không tồn tại | Đã đăng xuất | Nhập user lạ → Đăng nhập | abc / abc | Hiện lỗi sai thông tin đăng nhập |
| TC-LOGIN-05 | Bỏ trống trường | Đã đăng xuất | Để trống user hoặc pass → Đăng nhập | (rỗng) | Hiện lỗi "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." |
| TC-LOGIN-06 | Username không phân biệt hoa/thường | Đã đăng xuất | Nhập "ADMIN" + pass đúng | ADMIN / admin@123 | Đăng nhập thành công |
| TC-LOGIN-07 | Mật khẩu phân biệt hoa/thường | Đã đăng xuất | Nhập pass viết hoa | admin / ADMIN@123 | Đăng nhập thất bại |
| TC-LOGIN-08 | Giữ phiên sau khi tải lại | Đã đăng nhập | F5 / mở lại tab | — | Vẫn đăng nhập, không bị đẩy ra `/login` |
| TC-LOGIN-09 | Chặn truy cập khi chưa đăng nhập | Đã đăng xuất | Gõ thẳng URL `/teachers` | — | Tự động chuyển hướng về `/login` |
| TC-LOGIN-10 | Đăng xuất | Đã đăng nhập | Bấm "Đăng xuất" ở topbar | — | Về `/login`; gõ lại `/` bị chặn |

### 2.2. Phân quyền

| ID | Vai trò | Các bước | Kết quả mong đợi |
|---|---|---|---|
| TC-RBAC-01 | admin | Mở `/teachers` | Thấy form thêm/sửa + nút Sửa/Xoá |
| TC-RBAC-02 | tester | Mở `/teachers` | Thấy thông báo "Chế độ chỉ xem"; KHÔNG có form, KHÔNG có cột Thao tác |
| TC-RBAC-03 | admin | Xem sidebar | Có menu "Hệ thống" |
| TC-RBAC-04 | tester | Xem sidebar | KHÔNG có menu "Hệ thống" |
| TC-RBAC-05 | tester | Gõ thẳng URL `/system` | Hiện "Chỉ tài khoản quản trị viên mới được reset dữ liệu hệ thống." |
| TC-RBAC-06 | admin | Mở `/system` | Có nút "Reset dữ liệu demo" |
| TC-RBAC-07 | tester | Mở `/payroll` | Tính tiền dạy được (quyền `payroll:calculate`) |
| TC-RBAC-08 | tester | Mở `/reports` | Xem & xuất báo cáo được (quyền `reports:view`) |

---

## 3. Unit test (Jest) - đã tự động hoá

File: `src/lib/__tests__/auth.test.ts` (chạy bằng `npm test`).

| Mã test | Nội dung kiểm thử |
|---|---|
| TC01 | admin đăng nhập đúng → role = admin |
| TC02 | tester đăng nhập đúng → role = tester |
| TC03 | username chuẩn hoá (trim + lowercase) |
| TC04 | sai mật khẩu → báo lỗi đúng thông điệp |
| TC05 | tài khoản không tồn tại → thất bại |
| TC06 | bỏ trống username → lỗi nhập thiếu |
| TC07 | bỏ trống password → lỗi nhập thiếu |
| TC08 | mật khẩu phân biệt hoa/thường |
| TC09 | hệ thống chỉ có đúng 2 tài khoản demo |
| TC10 | admin có toàn bộ quyền |
| TC11 | tester không có `data:manage` và `system:reset` |
| TC12 | chưa đăng nhập (null) → không có quyền |
| TC13 | `userCan` đúng theo vai trò người dùng |
| TC14 | admin có nhiều quyền hơn tester |

---

## 4. Data-testid hỗ trợ kiểm thử tự động (Selenium)

| Phần tử | data-testid |
|---|---|
| Trang login | `login-page` |
| Ô tên đăng nhập | `login-username` |
| Ô mật khẩu | `login-password` |
| Nút đăng nhập | `login-submit` |
| Thông báo lỗi | `login-error` |
| Thông tin user (topbar) | `topbar-user`, `topbar-user-name`, `topbar-user-role` |
| Nút đăng xuất | `logout-button` |
| Thông báo chỉ xem (tester) | `<entity>-readonly-notice` |
| Reset hệ thống (admin) | `system-reset-button` |
| Từ chối reset (tester) | `system-reset-denied` |

-- Sửa đúng bản ghi mẫu đã bị lệch trong các CSDL tồn tại.
-- Điều kiện đầy đủ giữ nguyên mọi cấu hình khác do quản trị viên thiết lập.
UPDATE "ClassCoefficient"
SET "coefficient" = -0.1
WHERE "id" = 'CCOEF-2024-01'
  AND "year" = '2024-2025'
  AND "minStudents" = 0
  AND "maxStudents" = 40
  AND "coefficient" = 0.2;

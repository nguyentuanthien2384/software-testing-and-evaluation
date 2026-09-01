-- Bổ sung trạng thái nghiệp vụ còn thiếu trong đặc tả.
ALTER TABLE "Department" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Đang hoạt động';
ALTER TABLE "Semester" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Mở';

-- Tăng cường toàn vẹn dữ liệu ở tầng CSDL, không chỉ dựa vào giao diện.
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");
CREATE UNIQUE INDEX "Semester_name_year_key" ON "Semester"("name", "year");
CREATE UNIQUE INDEX "TeachingClass_code_key" ON "TeachingClass"("code");
CREATE UNIQUE INDEX "Assignment_classId_key" ON "Assignment"("classId");
CREATE UNIQUE INDEX "ClassCoefficient_year_minStudents_maxStudents_key" ON "ClassCoefficient"("year", "minStudents", "maxStudents");

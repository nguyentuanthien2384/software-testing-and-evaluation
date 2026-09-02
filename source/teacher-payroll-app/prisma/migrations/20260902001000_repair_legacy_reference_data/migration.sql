-- Remove the one legacy placeholder degree that violates the current
-- positive-coefficient rule. The reference guards keep this migration safe
-- if the row has since been put into use.
DELETE FROM "Degree"
WHERE "id" = 'DEG-005'
  AND "name" = 'Giảng Viên'
  AND "shortName" = 'GV'
  AND "coefficient" = 0
  AND NOT EXISTS (
    SELECT 1 FROM "Teacher" WHERE "Teacher"."degreeId" = "Degree"."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "DegreeCoefficient" WHERE "DegreeCoefficient"."degreeId" = "Degree"."id"
  );

-- The status columns were added after these historical semesters already
-- existed, so SQLite assigned the generic default "Mở". Restore their
-- canonical locked status only when every identifying field still matches.
UPDATE "Semester"
SET "status" = 'Đã khóa'
WHERE "status" = 'Mở'
  AND (
    (
      "id" = 'SEM-2024-1'
      AND "name" = 'Học kỳ 1'
      AND "year" = '2024-2025'
      AND "startDate" = '2024-09-01'
      AND "endDate" = '2024-12-31'
    )
    OR
    (
      "id" = 'SEM-2024-2'
      AND "name" = 'Học kỳ 2'
      AND "year" = '2024-2025'
      AND "startDate" = '2025-01-01'
      AND "endDate" = '2025-05-31'
    )
  );

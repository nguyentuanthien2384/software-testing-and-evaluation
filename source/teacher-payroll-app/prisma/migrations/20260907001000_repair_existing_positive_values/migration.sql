-- Repair legacy rows that could have been inserted before positive-value
-- validation existed. The values below are conservative minimums; users can
-- replace them with the correct business values through the validated UI.
UPDATE "Degree"
SET "coefficient" = 0.1
WHERE "coefficient" <= 0;

UPDATE "Subject"
SET
  "credits" = CASE WHEN "credits" <= 0 THEN 1 ELSE "credits" END,
  "totalHours" = CASE WHEN "totalHours" <= 0 THEN 1 ELSE "totalHours" END,
  "coefficient" = CASE WHEN "coefficient" <= 0 THEN 0.1 ELSE "coefficient" END
WHERE "credits" <= 0 OR "totalHours" <= 0 OR "coefficient" <= 0;

UPDATE "TeachingClass"
SET "studentCount" = 1
WHERE "studentCount" <= 0;

UPDATE "Assignment"
SET "teachingHours" = 0.01
WHERE "teachingHours" <= 0;

UPDATE "PaymentRate"
SET "amount" = 1
WHERE "amount" <= 0;

UPDATE "DegreeCoefficient"
SET "coefficient" = 0.1
WHERE "coefficient" <= 0;

UPDATE "ClassCoefficient"
SET "minStudents" = 1
WHERE "minStudents" <= 0;

UPDATE "ClassCoefficient"
SET "maxStudents" = "minStudents"
WHERE "maxStudents" <= 0 OR "maxStudents" < "minStudents";

UPDATE "ClassCoefficient"
SET "coefficient" = 0.1
WHERE "coefficient" <= 0;

-- Restore the eight shipped reference rows to the canonical positive factors.
-- These identifiers belong to the demo/reference dataset shown in the UI and
-- must be consistent across academic years after the semantic conversion.
UPDATE "ClassCoefficient" SET "minStudents" = 1,   "maxStudents" = 40,  "coefficient" = 0.9 WHERE "id" = 'CCOEF-2024-01' AND "year" = '2024-2025';
UPDATE "ClassCoefficient" SET "minStudents" = 41,  "maxStudents" = 80,  "coefficient" = 1.0 WHERE "id" = 'CCOEF-2024-02' AND "year" = '2024-2025';
UPDATE "ClassCoefficient" SET "minStudents" = 81,  "maxStudents" = 120, "coefficient" = 1.1 WHERE "id" = 'CCOEF-2024-03' AND "year" = '2024-2025';
UPDATE "ClassCoefficient" SET "minStudents" = 121, "maxStudents" = 300, "coefficient" = 1.2 WHERE "id" = 'CCOEF-2024-04' AND "year" = '2024-2025';
UPDATE "ClassCoefficient" SET "minStudents" = 1,   "maxStudents" = 40,  "coefficient" = 0.9 WHERE "id" = 'CCOEF-2025-01' AND "year" = '2025-2026';
UPDATE "ClassCoefficient" SET "minStudents" = 41,  "maxStudents" = 80,  "coefficient" = 1.0 WHERE "id" = 'CCOEF-2025-02' AND "year" = '2025-2026';
UPDATE "ClassCoefficient" SET "minStudents" = 81,  "maxStudents" = 120, "coefficient" = 1.1 WHERE "id" = 'CCOEF-2025-03' AND "year" = '2025-2026';
UPDATE "ClassCoefficient" SET "minStudents" = 121, "maxStudents" = 300, "coefficient" = 1.2 WHERE "id" = 'CCOEF-2025-04' AND "year" = '2025-2026';

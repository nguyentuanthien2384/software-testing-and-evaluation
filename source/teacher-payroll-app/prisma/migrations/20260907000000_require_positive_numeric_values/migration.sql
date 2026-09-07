-- Class coefficients used to be stored as additive adjustments
-- (-0.1, 0, 0.1, ...). Convert them to strictly-positive multipliers
-- (0.9, 1.0, 1.1, ...) before enforcing the new validation rule.
UPDATE "ClassCoefficient"
SET "coefficient" = CASE
  WHEN "coefficient" + 1 > 0 THEN "coefficient" + 1
  ELSE 0.1
END;

-- A real teaching class must contain at least one student. Move legacy
-- lower bounds from 0 to 1 so the configured ranges match that rule.
UPDATE "ClassCoefficient"
SET "minStudents" = 1
WHERE "minStudents" <= 0;

-- Keep the invariant at the storage boundary as a final safeguard. The
-- application validates first and returns field-specific Vietnamese errors;
-- these triggers protect direct database writes and future code paths.
CREATE TRIGGER "Degree_positive_insert"
BEFORE INSERT ON "Degree"
WHEN NEW."coefficient" <= 0
BEGIN
  SELECT RAISE(ABORT, 'Degree.coefficient must be greater than 0');
END;

CREATE TRIGGER "Degree_positive_update"
BEFORE UPDATE OF "coefficient" ON "Degree"
WHEN NEW."coefficient" <= 0
BEGIN
  SELECT RAISE(ABORT, 'Degree.coefficient must be greater than 0');
END;

CREATE TRIGGER "Subject_positive_insert"
BEFORE INSERT ON "Subject"
WHEN NEW."credits" <= 0 OR NEW."totalHours" <= 0 OR NEW."coefficient" <= 0
BEGIN
  SELECT RAISE(ABORT, 'Subject numeric values must be greater than 0');
END;

CREATE TRIGGER "Subject_positive_update"
BEFORE UPDATE OF "credits", "totalHours", "coefficient" ON "Subject"
WHEN NEW."credits" <= 0 OR NEW."totalHours" <= 0 OR NEW."coefficient" <= 0
BEGIN
  SELECT RAISE(ABORT, 'Subject numeric values must be greater than 0');
END;

CREATE TRIGGER "TeachingClass_positive_insert"
BEFORE INSERT ON "TeachingClass"
WHEN NEW."studentCount" <= 0
BEGIN
  SELECT RAISE(ABORT, 'TeachingClass.studentCount must be greater than 0');
END;

CREATE TRIGGER "TeachingClass_positive_update"
BEFORE UPDATE OF "studentCount" ON "TeachingClass"
WHEN NEW."studentCount" <= 0
BEGIN
  SELECT RAISE(ABORT, 'TeachingClass.studentCount must be greater than 0');
END;

CREATE TRIGGER "Assignment_positive_insert"
BEFORE INSERT ON "Assignment"
WHEN NEW."teachingHours" <= 0
BEGIN
  SELECT RAISE(ABORT, 'Assignment.teachingHours must be greater than 0');
END;

CREATE TRIGGER "Assignment_positive_update"
BEFORE UPDATE OF "teachingHours" ON "Assignment"
WHEN NEW."teachingHours" <= 0
BEGIN
  SELECT RAISE(ABORT, 'Assignment.teachingHours must be greater than 0');
END;

CREATE TRIGGER "PaymentRate_positive_insert"
BEFORE INSERT ON "PaymentRate"
WHEN NEW."amount" <= 0
BEGIN
  SELECT RAISE(ABORT, 'PaymentRate.amount must be greater than 0');
END;

CREATE TRIGGER "PaymentRate_positive_update"
BEFORE UPDATE OF "amount" ON "PaymentRate"
WHEN NEW."amount" <= 0
BEGIN
  SELECT RAISE(ABORT, 'PaymentRate.amount must be greater than 0');
END;

CREATE TRIGGER "DegreeCoefficient_positive_insert"
BEFORE INSERT ON "DegreeCoefficient"
WHEN NEW."coefficient" <= 0
BEGIN
  SELECT RAISE(ABORT, 'DegreeCoefficient.coefficient must be greater than 0');
END;

CREATE TRIGGER "DegreeCoefficient_positive_update"
BEFORE UPDATE OF "coefficient" ON "DegreeCoefficient"
WHEN NEW."coefficient" <= 0
BEGIN
  SELECT RAISE(ABORT, 'DegreeCoefficient.coefficient must be greater than 0');
END;

CREATE TRIGGER "ClassCoefficient_positive_insert"
BEFORE INSERT ON "ClassCoefficient"
WHEN NEW."minStudents" <= 0
  OR NEW."maxStudents" <= 0
  OR NEW."coefficient" <= 0
  OR NEW."maxStudents" < NEW."minStudents"
BEGIN
  SELECT RAISE(ABORT, 'ClassCoefficient numeric values must be valid and greater than 0');
END;

CREATE TRIGGER "ClassCoefficient_positive_update"
BEFORE UPDATE OF "minStudents", "maxStudents", "coefficient" ON "ClassCoefficient"
WHEN NEW."minStudents" <= 0
  OR NEW."maxStudents" <= 0
  OR NEW."coefficient" <= 0
  OR NEW."maxStudents" < NEW."minStudents"
BEGIN
  SELECT RAISE(ABORT, 'ClassCoefficient numeric values must be valid and greater than 0');
END;

-- The UI displays class coefficients with one decimal place, so prevent a
-- directly-written value such as 0.95 from being displayed as 1.0 while the
-- payroll engine still calculates with 0.95.
CREATE TRIGGER "ClassCoefficient_step_insert"
BEFORE INSERT ON "ClassCoefficient"
WHEN ABS(NEW."coefficient" * 10 - ROUND(NEW."coefficient" * 10)) > 0.000000001
BEGIN
  SELECT RAISE(ABORT, 'ClassCoefficient.coefficient must use step 0.1');
END;

CREATE TRIGGER "ClassCoefficient_step_update"
BEFORE UPDATE OF "coefficient" ON "ClassCoefficient"
WHEN ABS(NEW."coefficient" * 10 - ROUND(NEW."coefficient" * 10)) > 0.000000001
BEGIN
  SELECT RAISE(ABORT, 'ClassCoefficient.coefficient must use step 0.1');
END;

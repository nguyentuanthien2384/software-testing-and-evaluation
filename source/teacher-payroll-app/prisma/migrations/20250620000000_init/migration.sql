-- CreateTable
CREATE TABLE "Degree" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "shortName" TEXT NOT NULL, "coefficient" REAL NOT NULL, "createdAt" TEXT NOT NULL);
CREATE TABLE "Department" ("id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "createdAt" TEXT NOT NULL);
CREATE TABLE "Teacher" ("id" TEXT NOT NULL PRIMARY KEY, "fullName" TEXT NOT NULL, "dateOfBirth" TEXT NOT NULL, "phone" TEXT NOT NULL, "email" TEXT NOT NULL, "status" TEXT NOT NULL, "departmentId" TEXT NOT NULL, "degreeId" TEXT NOT NULL,
  CONSTRAINT "Teacher_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Teacher_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "Degree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "Subject" ("id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "credits" INTEGER NOT NULL, "totalHours" INTEGER NOT NULL, "coefficient" REAL NOT NULL);
CREATE TABLE "Semester" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "year" TEXT NOT NULL, "startDate" TEXT NOT NULL, "endDate" TEXT NOT NULL);
CREATE TABLE "TeachingClass" ("id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "semesterId" TEXT NOT NULL, "studentCount" INTEGER NOT NULL, "note" TEXT NOT NULL,
  CONSTRAINT "TeachingClass_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingClass_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "Assignment" ("id" TEXT NOT NULL PRIMARY KEY, "teacherId" TEXT NOT NULL, "classId" TEXT NOT NULL, "teachingHours" REAL NOT NULL, "note" TEXT NOT NULL,
  CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "TeachingClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "PaymentRate" ("id" TEXT NOT NULL PRIMARY KEY, "year" TEXT NOT NULL, "amount" REAL NOT NULL, "effectiveDate" TEXT NOT NULL);
CREATE TABLE "DegreeCoefficient" ("id" TEXT NOT NULL PRIMARY KEY, "year" TEXT NOT NULL, "degreeId" TEXT NOT NULL, "coefficient" REAL NOT NULL,
  CONSTRAINT "DegreeCoefficient_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "Degree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "ClassCoefficient" ("id" TEXT NOT NULL PRIMARY KEY, "year" TEXT NOT NULL, "minStudents" INTEGER NOT NULL, "maxStudents" INTEGER NOT NULL, "coefficient" REAL NOT NULL);
-- Unique indexes
CREATE UNIQUE INDEX "Degree_shortName_key" ON "Degree"("shortName");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");
CREATE UNIQUE INDEX "PaymentRate_year_key" ON "PaymentRate"("year");
CREATE UNIQUE INDEX "DegreeCoefficient_year_degreeId_key" ON "DegreeCoefficient"("year", "degreeId");

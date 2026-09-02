"""Verify the checked-in YC2 SQLite evidence without mutating any database.

The evidence database itself is produced by the real Prisma migrations and
seed command. This script intentionally performs read-only verification and
regenerates the human-readable calculation report.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path


HERE = Path(__file__).resolve().parent
DOMAIN_TABLES = [
    "Degree",
    "Department",
    "Teacher",
    "Subject",
    "Semester",
    "TeachingClass",
    "Assignment",
    "PaymentRate",
    "DegreeCoefficient",
    "ClassCoefficient",
]
REQUIRED_COLUMNS = {
    "Department": {"status"},
    "Semester": {"status"},
}
REQUIRED_INDEXES = {
    "Teacher_email_key",
    "Semester_name_year_key",
    "TeachingClass_code_key",
    "Assignment_classId_key",
    "ClassCoefficient_year_minStudents_maxStudents_key",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify YC2 SQLite evidence")
    parser.add_argument("--db", type=Path, default=HERE / "dev.db")
    parser.add_argument("--output", type=Path, default=HERE / "yc2-sqlite-evidence.txt")
    parser.add_argument("--check-only", action="store_true", help="print but do not rewrite the report")
    return parser.parse_args()


def verify_schema(cursor: sqlite3.Cursor) -> list[str]:
    errors: list[str] = []
    tables = {
        row[0]
        for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }
    for table in [*DOMAIN_TABLES, "_prisma_migrations"]:
        if table not in tables:
            errors.append(f"missing table: {table}")

    for table, required in REQUIRED_COLUMNS.items():
        columns = {row[1] for row in cursor.execute(f'PRAGMA table_info("{table}")')}
        for column in sorted(required - columns):
            errors.append(f"missing column: {table}.{column}")

    indexes = {
        row[0]
        for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
    }
    for index in sorted(REQUIRED_INDEXES - indexes):
        errors.append(f"missing unique index: {index}")
    return errors


def payroll_rows(cursor: sqlite3.Cursor) -> list[sqlite3.Row]:
    return cursor.execute(
        """
        SELECT
          t.id AS teacherId,
          t.fullName,
          s.year,
          cls.code AS classCode,
          sub.name AS subjectName,
          a.teachingHours,
          sub.coefficient AS subjectCoefficient,
          cc.coefficient AS classCoefficient,
          pr.amount AS rate,
          dc.coefficient AS degreeCoefficient,
          ROUND(a.teachingHours * (sub.coefficient + cc.coefficient), 2) AS convertedHours,
          ROUND(
            a.teachingHours * (sub.coefficient + cc.coefficient)
            * pr.amount * dc.coefficient,
            0
          ) AS amount
        FROM Assignment AS a
        JOIN TeachingClass AS cls ON cls.id = a.classId
        JOIN Subject AS sub ON sub.id = cls.subjectId
        JOIN Semester AS s ON s.id = cls.semesterId
        JOIN Teacher AS t ON t.id = a.teacherId
        JOIN PaymentRate AS pr ON pr.year = s.year
        JOIN DegreeCoefficient AS dc
          ON dc.year = s.year AND dc.degreeId = t.degreeId
        JOIN ClassCoefficient AS cc
          ON cc.year = s.year
         AND cls.studentCount BETWEEN cc.minStudents AND cc.maxStudents
        ORDER BY t.id, s.year, cls.code
        """
    ).fetchall()


def build_report(cursor: sqlite3.Cursor, rows: list[sqlite3.Row]) -> str:
    report = [
        "=" * 92,
        "YC2 EVIDENCE - SQLite migrated/seeded by Prisma + payroll verification",
        "Database: evidence/db-sqlite/dev.db",
        f"Migrations applied: {cursor.execute('SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL').fetchone()[0]}",
        "Records seeded:",
    ]
    for table in DOMAIN_TABLES:
        count = cursor.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        report.append(f"   - {table}: {count}")

    report.extend(["=" * 92, "PAYROLL BY ASSIGNMENT:"])
    totals: defaultdict[tuple[str, str], float] = defaultdict(float)
    names: dict[str, str] = {}
    for row in rows:
        names[row["teacherId"]] = row["fullName"]
        totals[(row["teacherId"], row["year"])] += row["amount"]
        report.append(
            f"{row['teacherId']} | {row['classCode']:<12} | {row['year']} | "
            f"hours={row['teachingHours']:g} | subject={row['subjectCoefficient']:g} | "
            f"class={row['classCoefficient']:+g} | degree={row['degreeCoefficient']:g} | "
            f"converted={row['convertedHours']:g} | amount={row['amount']:,.0f} VND"
        )

    report.extend(["-" * 92, "TOTAL BY TEACHER AND ACADEMIC YEAR:"])
    for (teacher_id, year), amount in sorted(totals.items()):
        report.append(f"   {teacher_id} - {names[teacher_id]:<20} | {year}: {amount:>15,.0f} VND")

    gv1_total = sum(row["amount"] for row in rows if row["teacherId"] == "GV0001")
    report.extend(
        [
            "-" * 92,
            "INTERNAL CHECK:",
            "   GV0001 CSDL101.01 = 45*(1.0+0.0)*143000*2.0 = 12,870,000",
            "   GV0001 ATTT301.01 = 45*(1.2+0.0)*143000*2.0 = 15,444,000",
            f"   Manual total = 28,314,000 | SQLite = {gv1_total:,.0f} -> "
            f"{'MATCH' if gv1_total == 28_314_000 else 'MISMATCH'}",
        ]
    )
    return "\n".join(report) + "\n"


def main() -> int:
    args = parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    database = args.db.resolve()
    if not database.is_file():
        raise SystemExit(f"Evidence database not found: {database}")

    connection = sqlite3.connect(f"{database.as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        cursor = connection.cursor()
        errors = verify_schema(cursor)
        integrity = cursor.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            errors.append(f"integrity_check: {integrity}")
        foreign_key_errors = cursor.execute("PRAGMA foreign_key_check").fetchall()
        if foreign_key_errors:
            errors.append(f"foreign_key_check: {len(foreign_key_errors)} violation(s)")
        invalid_degrees = cursor.execute("SELECT COUNT(*) FROM Degree WHERE coefficient <= 0").fetchone()[0]
        if invalid_degrees:
            errors.append(f"degree coefficients <= 0: {invalid_degrees}")
        leaked_rows = cursor.execute(
            "SELECT COUNT(*) FROM Degree WHERE id LIKE 'DEG-CONFLICT-%' OR name LIKE '%Selenium%'"
        ).fetchone()[0]
        if leaked_rows:
            errors.append(f"leaked Selenium degrees: {leaked_rows}")
        class_adjustment = cursor.execute(
            "SELECT coefficient FROM ClassCoefficient WHERE id = 'CCOEF-2024-01'"
        ).fetchone()
        if class_adjustment is None or abs(class_adjustment[0] - (-0.1)) > 1e-9:
            errors.append("CCOEF-2024-01 must have coefficient -0.1")
        unlocked_historical = cursor.execute(
            "SELECT COUNT(*) FROM Semester WHERE id IN ('SEM-2024-1', 'SEM-2024-2') AND status <> 'Đã khóa'"
        ).fetchone()[0]
        if unlocked_historical:
            errors.append(f"historical semesters not locked: {unlocked_historical}")
        rows = payroll_rows(cursor)
        assignment_count = cursor.execute("SELECT COUNT(*) FROM Assignment").fetchone()[0]
        if len(rows) != assignment_count:
            errors.append(f"payroll rows {len(rows)} != assignments {assignment_count}")
        if errors:
            raise SystemExit("SQLite evidence verification failed:\n- " + "\n- ".join(errors))

        report = build_report(cursor, rows)
    finally:
        connection.close()

    if not args.check_only:
        args.output.resolve().write_text(report, encoding="utf-8")
    print(report, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

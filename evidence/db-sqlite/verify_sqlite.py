import sqlite3, os, json, textwrap

DB="/home/claude/yc2/dev.db"
if os.path.exists(DB): os.remove(DB)
con=sqlite3.connect(DB); con.execute("PRAGMA foreign_keys=ON"); cur=con.cursor()

DDL = """
CREATE TABLE Degree (id TEXT PRIMARY KEY, name TEXT NOT NULL, shortName TEXT NOT NULL UNIQUE, coefficient REAL NOT NULL, createdAt TEXT NOT NULL);
CREATE TABLE Department (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE TABLE Teacher (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, dateOfBirth TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, status TEXT NOT NULL,
  departmentId TEXT NOT NULL REFERENCES Department(id), degreeId TEXT NOT NULL REFERENCES Degree(id));
CREATE TABLE Subject (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, credits INTEGER NOT NULL, totalHours INTEGER NOT NULL, coefficient REAL NOT NULL);
CREATE TABLE Semester (id TEXT PRIMARY KEY, name TEXT NOT NULL, year TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL);
CREATE TABLE TeachingClass (id TEXT PRIMARY KEY, code TEXT NOT NULL, subjectId TEXT NOT NULL REFERENCES Subject(id), semesterId TEXT NOT NULL REFERENCES Semester(id), studentCount INTEGER NOT NULL, note TEXT NOT NULL);
CREATE TABLE Assignment (id TEXT PRIMARY KEY, teacherId TEXT NOT NULL REFERENCES Teacher(id), classId TEXT NOT NULL REFERENCES TeachingClass(id), teachingHours REAL NOT NULL, note TEXT NOT NULL);
CREATE TABLE PaymentRate (id TEXT PRIMARY KEY, year TEXT NOT NULL UNIQUE, amount REAL NOT NULL, effectiveDate TEXT NOT NULL);
CREATE TABLE DegreeCoefficient (id TEXT PRIMARY KEY, year TEXT NOT NULL, degreeId TEXT NOT NULL REFERENCES Degree(id), coefficient REAL NOT NULL, UNIQUE(year,degreeId));
CREATE TABLE ClassCoefficient (id TEXT PRIMARY KEY, year TEXT NOT NULL, minStudents INTEGER NOT NULL, maxStudents INTEGER NOT NULL, coefficient REAL NOT NULL);
"""
cur.executescript(DDL)

D=json.load(open("/home/claude/yc2/data.json", encoding="utf-8"))
def ins(table, rows, cols):
    q=f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join('?'*len(cols))})"
    cur.executemany(q, [[r[c] for c in cols] for r in rows])
ins("Degree", D["degrees"], ["id","name","shortName","coefficient","createdAt"])
ins("Department", D["departments"], ["id","code","name","description","createdAt"])
ins("Teacher", D["teachers"], ["id","fullName","dateOfBirth","phone","email","status","departmentId","degreeId"])
ins("Subject", D["subjects"], ["id","code","name","credits","totalHours","coefficient"])
ins("Semester", D["semesters"], ["id","name","year","startDate","endDate"])
ins("TeachingClass", D["classes"], ["id","code","subjectId","semesterId","studentCount","note"])
ins("Assignment", D["assignments"], ["id","teacherId","classId","teachingHours","note"])
ins("PaymentRate", D["paymentRates"], ["id","year","amount","effectiveDate"])
ins("DegreeCoefficient", D["degreeCoefficients"], ["id","year","degreeId","coefficient"])
ins("ClassCoefficient", D["classCoefficients"], ["id","year","minStudents","maxStudents","coefficient"])
con.commit()

# Payroll query: join assignment->class->subject/semester, teacher->degree, rate by year, class coef by year+studentCount, degree coef by year+degree
SQL="""
SELECT t.id, t.fullName, dg.shortName AS degree, s.year,
       a.teachingHours AS hours, sub.coefficient AS subjCoef,
       cc.coefficient AS classCoef, pr.amount AS rate, dc.coefficient AS degCoef,
       ROUND(a.teachingHours*(sub.coefficient+cc.coefficient),2) AS converted,
       ROUND(a.teachingHours*(sub.coefficient+cc.coefficient)*pr.amount*dc.coefficient,0) AS amount,
       cls.code AS classCode, sub.name AS subjName
FROM Assignment a
JOIN TeachingClass cls ON cls.id=a.classId
JOIN Subject sub ON sub.id=cls.subjectId
JOIN Semester s ON s.id=cls.semesterId
JOIN Teacher t ON t.id=a.teacherId
JOIN Degree dg ON dg.id=t.degreeId
JOIN PaymentRate pr ON pr.year=s.year
JOIN DegreeCoefficient dc ON dc.year=s.year AND dc.degreeId=t.degreeId
JOIN ClassCoefficient cc ON cc.year=s.year AND cls.studentCount BETWEEN cc.minStudents AND cc.maxStudents
ORDER BY t.id, classCode;
"""
rows=cur.execute(SQL).fetchall()
out=[]
out.append("="*78)
out.append("YC2 EVIDENCE - CSDL SQLite that + truy van tinh tien day (Prisma data model)")
out.append("DB: prisma/dev.db (sqlite) | Tables: 10 | Records seeded:")
for tb in ["Degree","Department","Teacher","Subject","Semester","TeachingClass","Assignment","PaymentRate","DegreeCoefficient","ClassCoefficient"]:
    n=cur.execute(f"SELECT COUNT(*) FROM {tb}").fetchone()[0]
    out.append(f"   - {tb}: {n}")
out.append("="*78)
out.append("KET QUA TINH TIEN DAY THEO TUNG LOP (join 7 bang, tinh truc tiep tren SQLite):")
out.append("-"*78)
hdr=f"{'GV':<7}{'Ten':<18}{'Lop':<13}{'Tiet':>5}{'HsHP':>6}{'HsLop':>7}{'DinhMuc':>9}{'HsBC':>6}{'QuyDoi':>8}{'ThanhTien':>13}"
out.append(hdr); out.append("-"*78)
from collections import defaultdict
tot=defaultdict(float); names={}
for r in rows:
    tid,name,deg,year,hours,sc,cc,rate,dc,conv,amt,code,subn=r
    names[tid]=name; tot[tid]+=amt
    out.append(f"{tid:<7}{name[:17]:<18}{code:<13}{hours:>5.0f}{sc:>6.1f}{cc:>7.1f}{rate:>9.0f}{dc:>6.1f}{conv:>8.1f}{amt:>13,.0f}")
out.append("-"*78)
out.append("TONG TIEN DAY THEO GIAO VIEN:")
for tid in sorted(tot):
    out.append(f"   {tid} - {names[tid]:<20}: {tot[tid]:>15,.0f} d")
# verify two known cases
out.append("-"*78)
out.append("KIEM CHUNG NOI BO (tinh tay = SQL):")
gv1=[r for r in rows if r[0]=='GV0001']
s1=sum(r[10] for r in gv1)
out.append(f"   GV0001: CSDL101.01 = 45*(1.0+0)*143000*2.0 = 12,870,000")
out.append(f"           ATTT301.01 = 45*(1.2+0)*143000*2.0 = 15,444,000")
out.append(f"           Tong tay = 28,314,000 | SQL = {s1:,.0f} -> {'KHOP' if s1==28314000 else 'LECH'}")
con.close()
report="\n".join(out)
open("/home/claude/yc2/yc2-sqlite-evidence.txt","w",encoding="utf-8").write(report)
print(report)

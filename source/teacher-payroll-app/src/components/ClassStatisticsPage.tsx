'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/lib/use-app-data';
import { StatCard } from './StatCard';

export function ClassStatisticsPage() {
  const { data } = useAppData();
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const rows = useMemo(() => data.classes
    .filter((item) => (!semesterId || item.semesterId === semesterId) && (!subjectId || item.subjectId === subjectId))
    .map((item) => {
      const subject = data.subjects.find((candidate) => candidate.id === item.subjectId);
      const semester = data.semesters.find((candidate) => candidate.id === item.semesterId);
      const assignment = data.assignments.find((candidate) => candidate.classId === item.id);
      const teacher = assignment ? data.teachers.find((candidate) => candidate.id === assignment.teacherId) : undefined;
      return { ...item, subjectName: subject?.name ?? 'Không xác định', semesterName: semester ? `${semester.name} ${semester.year}` : 'Không xác định', teacherName: teacher ? `${teacher.id} - ${teacher.fullName}` : 'Chưa phân công' };
    }), [data, semesterId, subjectId]);

  const assignedCount = rows.filter((item) => item.teacherName !== 'Chưa phân công').length;
  const bySubject = data.subjects
    .map((subject) => ({ name: subject.name, count: rows.filter((item) => item.subjectId === subject.id).length }))
    .filter((item) => item.count > 0);

  return (
    <main className="page" data-testid="class-statistics-page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">UC2.5</p>
          <h1>Thống kê lớp học phần</h1>
          <p>Theo dõi số lớp, sĩ số và tình trạng phân công theo kỳ học hoặc học phần.</p>
        </div>
      </div>

      <section className="stat-grid">
        <StatCard title="Lớp phù hợp" value={rows.length} />
        <StatCard title="Đã phân công" value={assignedCount} />
        <StatCard title="Chưa phân công" value={rows.length - assignedCount} />
        <StatCard title="Tổng sinh viên" value={rows.reduce((sum, item) => sum + item.studentCount, 0)} />
      </section>

      <section className="panel">
        <div className="toolbar start">
          <select aria-label="Lọc lớp theo kỳ học" data-testid="class-statistics-semester-filter" value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>
            <option value="">Tất cả kỳ học</option>
            {data.semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name} - {semester.year}</option>)}
          </select>
          <select aria-label="Lọc lớp theo học phần" data-testid="class-statistics-subject-filter" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            <option value="">Tất cả học phần</option>
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table data-testid="class-statistics-table">
            <thead><tr><th>Mã lớp</th><th>Học phần</th><th>Kỳ học</th><th>Sĩ số</th><th>Giảng viên phụ trách</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5}>Không có lớp học phần phù hợp.</td></tr>}
              {rows.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.subjectName}</td><td>{row.semesterName}</td><td>{row.studentCount}</td><td>{row.teacherName}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Phân bố theo học phần</h2>
        <ul className="summary-list">
          {bySubject.length === 0 && <li><span>Không có dữ liệu</span><strong>0</strong></li>}
          {bySubject.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.count} lớp</strong></li>)}
        </ul>
      </section>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { getAge } from '@/lib/payroll';
import { useAppData } from '@/lib/use-app-data';
import { StatCard } from './StatCard';

export function TeacherStatisticsPage() {
  const { data } = useAppData();
  const [departmentId, setDepartmentId] = useState('');
  const [degreeId, setDegreeId] = useState('');

  const filteredTeachers = useMemo(
    () => data.teachers.filter((teacher) => (!departmentId || teacher.departmentId === departmentId) && (!degreeId || teacher.degreeId === degreeId)),
    [data.teachers, departmentId, degreeId]
  );

  const byDepartment = data.departments.map((department) => ({
    name: department.name,
    count: data.teachers.filter((teacher) => teacher.departmentId === department.id).length
  }));

  const byDegree = data.degrees.map((degree) => ({
    name: degree.shortName,
    count: data.teachers.filter((teacher) => teacher.degreeId === degree.id).length
  }));

  return (
    <main className="page">
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">UC1.4</p>
          <h1>Thống kê giáo viên</h1>
          <p>Lọc và thống kê số lượng giáo viên theo khoa, bằng cấp hoặc kết hợp cả hai tiêu chí.</p>
        </div>
      </div>

      <section className="stat-grid">
        <StatCard title="Tổng giáo viên" value={data.teachers.length} />
        <StatCard title="Đang giảng dạy" value={data.teachers.filter((teacher) => teacher.status === 'Đang giảng dạy').length} />
        <StatCard title="Số khoa" value={data.departments.length} />
        <StatCard title="Số bằng cấp" value={data.degrees.length} />
      </section>

      <section className="panel">
        <div className="toolbar start">
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">Tất cả khoa</option>
            {data.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select value={degreeId} onChange={(event) => setDegreeId(event.target.value)}>
            <option value="">Tất cả bằng cấp</option>
            {data.degrees.map((degree) => <option key={degree.id} value={degree.id}>{degree.name}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Mã GV</th><th>Họ tên</th><th>Khoa</th><th>Bằng cấp</th><th>Tuổi</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 && <tr><td colSpan={6}>Không tìm thấy giáo viên nào phù hợp với bộ lọc.</td></tr>}
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.id}</td>
                  <td>{teacher.fullName}</td>
                  <td>{data.departments.find((item) => item.id === teacher.departmentId)?.name}</td>
                  <td>{data.degrees.find((item) => item.id === teacher.degreeId)?.shortName}</td>
                  <td>{getAge(teacher.dateOfBirth)}</td>
                  <td>{teacher.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>Thống kê theo khoa</h2>
          <ul className="summary-list">
            {byDepartment.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.count}</strong></li>)}
          </ul>
        </div>
        <div className="panel">
          <h2>Thống kê theo bằng cấp</h2>
          <ul className="summary-list">
            {byDegree.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.count}</strong></li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}

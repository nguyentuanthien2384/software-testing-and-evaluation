import { validateLockedSemesterTransition, validateTeacherAssignmentTransition } from '../app-data-validation';
import { initialData } from '../initial-data';
import type { AppData } from '../types';

type Mutation = (data: AppData) => void;

describe('locked semester state transitions', () => {
  test.each([
    ['change a locked class', (data) => { data.classes[0].studentCount += 1; }, 'Không thể thay đổi hoặc xóa lớp'],
    ['delete a locked class', (data) => { data.classes.splice(0, 1); }, 'Không thể thay đổi hoặc xóa lớp'],
    ['move a locked class to an open semester', (data) => { data.classes[0].semesterId = 'SEM-2025-1'; }, 'Không thể thay đổi hoặc xóa lớp'],
    ['add a class to a locked semester', (data) => {
      data.classes.push({ ...data.classes[0], id: 'CLS-NEW', code: 'NEW.01' });
    }, 'Không thể thêm hoặc chuyển lớp'],
    ['move an open class to a locked semester', (data) => { data.classes[4].semesterId = 'SEM-2024-1'; }, 'Không thể thêm hoặc chuyển lớp'],
    ['change a locked assignment', (data) => { data.assignments[0].teachingHours += 1; }, 'Không thể thay đổi hoặc xóa phân công'],
    ['delete a locked assignment', (data) => { data.assignments.splice(0, 1); }, 'Không thể thay đổi hoặc xóa phân công'],
    ['move a locked assignment to an open class', (data) => { data.assignments[0].classId = 'CLS-DTU-01'; }, 'Không thể thay đổi hoặc xóa phân công'],
    ['add an assignment to a locked class', (data) => {
      data.assignments.push({ ...data.assignments[0], id: 'ASG-NEW' });
    }, 'Không thể thêm hoặc chuyển phân công'],
    ['move an open assignment to a locked class', (data) => { data.assignments[4].classId = 'CLS-CSDL-01'; }, 'Không thể thêm hoặc chuyển phân công'],
    ['unlock and modify in the same request', (data) => {
      data.semesters[0].status = 'Mở';
      data.classes[0].note = 'Changed during unlock';
    }, 'Không thể thay đổi hoặc xóa lớp']
  ] as Array<[string, Mutation, string]>)('reject %s', (_name, mutate, expectedError) => {
    const current = structuredClone(initialData);
    const currentSnapshot = structuredClone(current);
    const next = structuredClone(current);
    mutate(next);
    const nextSnapshot = structuredClone(next);
    const errors = validateLockedSemesterTransition(current, next);
    expect(errors.some((error) => error.includes(expectedError))).toBe(true);
    expect(current).toEqual(currentSnapshot);
    expect(next).toEqual(nextSnapshot);
  });

  test.each([
    ['unchanged data', () => undefined],
    ['reordered records', (data) => { data.classes.reverse(); data.assignments.reverse(); }],
    ['modify an open class and assignment', (data) => {
      data.classes[4].note = 'Allowed';
      data.assignments[4].teachingHours += 1;
    }],
    ['unlock without changing historical records', (data) => { data.semesters[0].status = 'Mở'; }]
  ] as Array<[string, Mutation]>)('allow %s', (_name, mutate) => {
    const current = structuredClone(initialData);
    const next = structuredClone(current);
    mutate(next);
    expect(validateLockedSemesterTransition(current, next)).toEqual([]);
  });

  test('allow editing only after a separate successful unlock', () => {
    const current = structuredClone(initialData);
    current.semesters[0].status = 'Mở';
    const next = structuredClone(current);
    next.classes[0].note = 'Allowed after unlock';
    expect(validateLockedSemesterTransition(current, next)).toEqual([]);
  });
});

describe('inactive teachers retain history but cannot receive changed assignments', () => {
  test.each(['Tạm nghỉ', 'Nghỉ việc'] as const)('preserve existing assignments when the teacher becomes %s', (status) => {
    const current = structuredClone(initialData);
    const next = structuredClone(current);
    next.teachers[0].status = status;
    expect(validateTeacherAssignmentTransition(current, next)).toEqual([]);
  });

  test.each([
    ['a newly created assignment', (data) => { data.assignments.push({ ...data.assignments[0], id: 'ASG-NEW' }); }],
    ['a reassigned teacher', (data) => { data.assignments[4].teacherId = 'GV0001'; }],
    ['changed hours on a historical assignment', (data) => { data.assignments[0].teachingHours += 1; }]
  ] as Array<[string, Mutation]>)('reject %s for an inactive teacher', (_name, mutate) => {
    const current = structuredClone(initialData);
    const next = structuredClone(current);
    next.teachers[0].status = 'Nghỉ việc';
    mutate(next);
    expect(validateTeacherAssignmentTransition(current, next)).toHaveLength(1);
    expect(validateTeacherAssignmentTransition(current, next)[0]).toContain('trạng thái là Nghỉ việc');
  });

  test('allow removing an old assignment for an inactive teacher', () => {
    const current = structuredClone(initialData);
    const next = structuredClone(current);
    next.teachers[0].status = 'Tạm nghỉ';
    next.assignments = next.assignments.filter((item) => item.teacherId !== 'GV0001');
    expect(validateTeacherAssignmentTransition(current, next)).toEqual([]);
  });
});

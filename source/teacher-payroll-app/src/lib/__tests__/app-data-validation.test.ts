import { getSemesterStatus, isValidAcademicYear, validateAppData, validateEntityMutation } from '../app-data-validation';
import { initialData } from '../initial-data';
import type { AppData } from '../types';

function copyData(): AppData {
  return structuredClone(initialData);
}

type DataMutation = (data: AppData) => void;

const positiveInvariantCases: Array<[string, DataMutation, string]> = [
  [
    'hệ số bằng cấp gốc bằng 0',
    (data) => { data.degrees[0].coefficient = 0; },
    'Hệ số bằng cấp DEG-TS phải lớn hơn 0.'
  ],
  [
    'số tín chỉ bằng 0',
    (data) => { data.subjects[0].credits = 0; },
    'Số tín chỉ của SUB-CSDL phải là số nguyên lớn hơn 0.'
  ],
  [
    'tổng số tiết học phần bằng 0',
    (data) => { data.subjects[0].totalHours = 0; },
    'Số tiết của SUB-CSDL phải là số nguyên lớn hơn 0.'
  ],
  [
    'hệ số học phần bằng 0',
    (data) => { data.subjects[0].coefficient = 0; },
    'Hệ số học phần SUB-CSDL phải lớn hơn 0.'
  ],
  [
    'sĩ số lớp bằng 0',
    (data) => { data.classes[0].studentCount = 0; },
    'Sĩ số lớp CLS-CSDL-01 phải là số nguyên lớn hơn 0.'
  ],
  [
    'số tiết phân công bằng 0',
    (data) => { data.assignments[0].teachingHours = 0; },
    'Số tiết của phân công ASG-001 phải lớn hơn 0.'
  ],
  [
    'định mức bằng 0',
    (data) => { data.paymentRates[0].amount = 0; },
    'Định mức RATE-2024 phải lớn hơn 0.'
  ],
  [
    'hệ số giáo viên theo năm bằng 0',
    (data) => { data.degreeCoefficients[0].coefficient = 0; },
    'Hệ số giáo viên DCOEF-2024-TS phải lớn hơn 0.'
  ],
  [
    'sĩ số bắt đầu của khoảng bằng 0',
    (data) => { data.classCoefficients[0].minStudents = 0; },
    'Sĩ số từ của CCOEF-2024-01 phải là số nguyên lớn hơn 0.'
  ],
  [
    'sĩ số kết thúc của khoảng bằng 0',
    (data) => { data.classCoefficients[0].maxStudents = 0; },
    'Sĩ số đến của CCOEF-2024-01 phải lớn hơn hoặc bằng sĩ số từ.'
  ],
  [
    'hệ số lớp bằng 0',
    (data) => { data.classCoefficients[0].coefficient = 0; },
    'Hệ số lớp CCOEF-2024-01 phải lớn hơn 0.'
  ]
];

describe('validateAppData', () => {
  test('chấp nhận dữ liệu mẫu hợp lệ', () => {
    expect(validateAppData(copyData())).toEqual({ ok: true, data: initialData });
  });

  test('từ chối thuộc tính ngoài snapshot để phiên bản lưu và đọc lại luôn khớp nhau', () => {
    const data = { ...copyData(), unexpected: 'not persisted' };
    const result = validateAppData(data);
    expect(result).toEqual({ ok: false, errors: ['Trường unexpected không được hỗ trợ.'] });
  });

  test('không ghi snapshot rỗng rồi bất ngờ hiển thị lại dữ liệu mẫu', () => {
    const empty = Object.fromEntries(Object.keys(initialData).map((key) => [key, []]));
    expect(validateAppData(empty)).toEqual({
      ok: false,
      errors: ['Không thể lưu snapshot trống vì hệ thống sẽ hiển thị lại dữ liệu mẫu.']
    });
  });

  test.each([
    ['thuộc tính ngoài mô hình', (data: AppData) => { (data.degrees[0] as unknown as Record<string, unknown>).extra = 'x'; }, 'degrees[0].extra không được hỗ trợ.'],
    ['thiếu ghi chú lớp', (data: AppData) => { delete (data.classes[0] as Partial<AppData['classes'][number]>).note; }, 'classes[0].note phải là chuỗi.'],
    ['kiểu mô tả khoa sai', (data: AppData) => { (data.departments[0] as unknown as Record<string, unknown>).description = null; }, 'departments[0].description phải là chuỗi.'],
    ['số ở dạng chuỗi', (data: AppData) => { (data.paymentRates[0] as unknown as Record<string, unknown>).amount = '143000'; }, 'paymentRates[0].amount phải là số hữu hạn.']
  ] as Array<[string, DataMutation, string]>)('từ chối %s trước khi ghi CSDL', (_case, mutate, expectedError) => {
    const data = copyData();
    mutate(data);
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain(expectedError);
  });

  test('từ chối mã học phần trùng không phân biệt hoa thường', () => {
    const data = copyData();
    data.subjects.push({ ...data.subjects[0], id: 'SUB-NEW', code: data.subjects[0].code.toLowerCase() });
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('Mã học phần');
  });

  test('từ chối mã định danh trùng không phân biệt hoa thường', () => {
    const data = copyData();
    data.degrees.push({
      ...data.degrees[0],
      id: data.degrees[0].id.toLowerCase(),
      name: 'Bằng cấp khác',
      shortName: 'KHAC'
    });

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('Mã deg-ts bị trùng trong degrees.');
  });

  test('từ chối trường văn bản vượt giới hạn payload', () => {
    const data = copyData();
    data.departments[0].description = 'x'.repeat(5001);

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('departments[0].description vượt quá 5000 ký tự.');
  });

  test('từ chối ngày kỳ học đảo ngược và năm học sai định dạng', () => {
    const data = copyData();
    data.semesters[0] = { ...data.semesters[0], year: '2024-2026', startDate: '2025-05-01', endDate: '2025-01-01' };
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('hai năm liên tiếp');
      expect(result.errors.join(' ')).toContain('phải trước ngày kết thúc');
    }
  });

  test('từ chối khoảng hệ số lớp chồng lấn', () => {
    const data = copyData();
    data.classCoefficients[1] = { ...data.classCoefficients[1], minStudents: 40 };
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('chồng lấn');
  });

  test.each(positiveInvariantCases)('từ chối %s', (_case, mutate, expectedError) => {
    const data = copyData();
    mutate(data);

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain(expectedError);
  });

  test.each([
    ['bước thấp nhất', 0.1],
    ['bội số thập phân thông thường', 0.3],
    ['sai số biểu diễn dấu phẩy động', 0.30000000000000004],
    ['sai số nằm trong tolerance', 0.9 + 5e-11]
  ])('chấp nhận hệ số lớp đúng bước 0.1: %s', (_case, coefficient) => {
    const data = copyData();
    data.classCoefficients[0].coefficient = coefficient;

    expect(validateAppData(data)).toEqual({ ok: true, data });
  });

  test.each([
    ['nằm giữa hai bước', 0.95],
    ['có hai chữ số thập phân không thẳng bước', 1.25],
    ['sai số vượt tolerance', 0.9 + 2e-10]
  ])('từ chối hệ số lớp không đúng bước 0.1: %s', (_case, coefficient) => {
    const data = copyData();
    data.classCoefficients[0].coefficient = coefficient;

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('Hệ số lớp CCOEF-2024-01 phải theo bước 0.1.');
  });

  test('từ chối phân công trùng lớp', () => {
    const data = copyData();
    data.assignments.push({ ...data.assignments[0], id: 'ASG-NEW' });
    const result = validateAppData(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('Lớp cls-csdl-01 đã được phân công cho giáo viên khác.');
  });

  test('từ chối dữ liệu khi phân công không có định mức của năm học', () => {
    const data = copyData();
    data.paymentRates = data.paymentRates.filter((item) => item.year !== '2024-2025');

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('ASG-001: chưa thiết lập định mức tiền tiết cho năm học 2024-2025.');
    }
  });

  test('từ chối dữ liệu khi sĩ số lớp được phân công không thuộc khoảng hệ số nào', () => {
    const data = copyData();
    const classIndex = data.classes.findIndex((item) => item.id === 'CLS-CTDL-02');
    data.classes[classIndex] = { ...data.classes[classIndex], studentCount: 301 };

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('ASG-004: chưa thiết lập hệ số lớp cho sĩ số 301 trong năm học 2024-2025.');
    }
  });

  test('trả lỗi kiểm tra thay vì ném ngoại lệ khi bản ghi bằng cấp là null', () => {
    const data = copyData();
    (data.degrees as unknown[])[0] = null;

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('degrees[0] không phải là một bản ghi hợp lệ.');
  });

  test('trả lỗi kiểm tra khi bản ghi giáo viên chỉ có mã', () => {
    const data = copyData();
    data.teachers[0] = { id: 'GV-THIEU-TRUONG' } as unknown as typeof data.teachers[number];

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        'GV-THIEU-TRUONG: Họ tên giáo viên là bắt buộc.',
        'GV-THIEU-TRUONG: Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.',
        'GV-THIEU-TRUONG: Email không hợp lệ.'
      ]));
    }
  });

  test('trả lỗi kiểm tra khi bản ghi kỳ học chỉ có mã', () => {
    const data = copyData();
    data.semesters[0] = { id: 'SEM-THIEU-TRUONG' } as unknown as typeof data.semesters[number];

    const result = validateAppData(data);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(expect.arrayContaining([
        'Kỳ học SEM-THIEU-TRUONG thiếu tên.',
        'Năm học của SEM-THIEU-TRUONG phải có dạng YYYY-YYYY và hai năm liên tiếp.',
        'Ngày của kỳ học SEM-THIEU-TRUONG không hợp lệ.'
      ]));
    }
  });

  test('không cho sửa khoá chính', () => {
    const row = { ...copyData().degrees[0], id: 'DEG-CHANGED' };
    expect(validateEntityMutation('degrees', row, copyData(), 'DEG-TS')).toContain('Không được thay đổi mã định danh khi chỉnh sửa.');
  });

  test('không cho chuyển giáo viên vào khoa đã ngừng hoạt động', () => {
    const data = copyData();
    data.departments[0].status = 'Ngừng hoạt động';

    expect(validateEntityMutation('teachers', data.teachers[0], data, data.teachers[0].id)).toEqual([
      'Không thể xếp giáo viên vào khoa đã ngừng hoạt động.'
    ]);
  });

  test.each([
    [
      'lớp học phần',
      'classes',
      (data: AppData) => data.classes[0],
      'Không thể thêm hoặc sửa lớp thuộc kỳ học đã khóa.'
    ],
    [
      'phân công',
      'assignments',
      (data: AppData) => data.assignments[0],
      'Không thể thay đổi phân công của kỳ học đã khóa.'
    ]
  ] as const)('không cho sửa %s thuộc kỳ học đã khóa', (_label, entityKey, rowFrom, expectedError) => {
    const data = copyData();
    const row = rowFrom(data);

    expect(validateEntityMutation(entityKey, row, data, row.id)).toEqual([expectedError]);
  });

  test('không cho chuyển lớp vốn thuộc kỳ đã khóa sang kỳ mở', () => {
    const data = copyData();
    const original = data.classes[0];
    const moved = { ...original, semesterId: 'SEM-2025-1' };
    expect(validateEntityMutation('classes', moved, data, original.id)).toEqual([
      'Không thể thêm hoặc sửa lớp thuộc kỳ học đã khóa.'
    ]);
  });

  test('không cho chuyển phân công vốn thuộc kỳ đã khóa sang lớp ở kỳ mở', () => {
    const data = copyData();
    const original = data.assignments[0];
    const moved = { ...original, classId: 'CLS-DTU-01' };
    expect(validateEntityMutation('assignments', moved, data, original.id)).toEqual([
      'Không thể thay đổi phân công của kỳ học đã khóa.'
    ]);
  });

  test('báo lỗi khi bản ghi cần sửa đã bị xóa', () => {
    const data = copyData();
    expect(validateEntityMutation('degrees', { ...data.degrees[0], id: 'DEG-MISSING' }, data, 'DEG-MISSING')).toEqual([
      'Bản ghi cần chỉnh sửa không còn tồn tại.'
    ]);
  });

  test('chấp nhận chỉnh sửa hợp lệ và thay đúng bản ghi trong snapshot kiểm tra', () => {
    const data = copyData();
    const changed = { ...data.paymentRates[0], amount: 150000 };

    expect(validateEntityMutation('paymentRates', changed, data, changed.id)).toEqual([]);
  });
});

describe('tiện ích kỳ học', () => {
  test('xác nhận năm học gồm hai năm liên tiếp', () => {
    expect(isValidAcademicYear('2025-2026')).toBe(true);
    expect(isValidAcademicYear('2025-2027')).toBe(false);
  });

  test('tính trạng thái kỳ học theo ngày', () => {
    const semester = { startDate: '2026-08-01', endDate: '2026-09-30' };
    expect(getSemesterStatus(semester, new Date(2026, 8, 1))).toBe('Đang diễn ra');
    expect(getSemesterStatus(semester, new Date(2026, 6, 1))).toBe('Sắp diễn ra');
    expect(getSemesterStatus(semester, new Date(2026, 10, 1))).toBe('Đã kết thúc');
  });
});

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDriver } from '../support/driver.mjs';
import { saveScreenshot } from '../support/test-utils.mjs';
import { LoginPage } from '../pages/login.page.mjs';
import { DashboardPage } from '../pages/dashboard.page.mjs';
import { CrudPage } from '../pages/crud.page.mjs';
import { PayrollPage } from '../pages/payroll.page.mjs';
import { ReportsPage } from '../pages/reports.page.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payrollCases = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/payroll-cases.json'), 'utf8'));

describe('YC7 Selenium WebDriver smoke/regression suite', function () {
  let driver;

  before(async function () {
    driver = await createDriver();
    // Ứng dụng yêu cầu đăng nhập: dùng tài khoản admin để có đủ quyền cho bộ smoke/regression.
    const login = new LoginPage(driver);
    await login.loginAs('admin', 'admin@123');
  });

  after(async function () {
    if (driver) await driver.quit();
  });

  afterEach(async function () {
    if (this.currentTest?.state === 'failed' && driver) {
      const file = await saveScreenshot(driver, this.currentTest.fullTitle());
      // eslint-disable-next-line no-console
      console.error(`Screenshot saved: ${file}`);
    }
  });

  it('YC7-SMOKE-001 mở dashboard và hiển thị luồng nghiệp vụ chính', async function () {
    const dashboard = new DashboardPage(driver);
    await dashboard.openDashboard();
    await dashboard.assertLoaded();
  });

  it('YC7-NAV-002 tất cả màn hình nghiệp vụ chính đều tải được', async function () {
    const pages = [
      ['/degrees', 'degrees-table'],
      ['/departments', 'departments-table'],
      ['/teachers', 'teachers-table'],
      ['/teacher-statistics', 'teacher-statistics-table'],
      ['/subjects', 'subjects-table'],
      ['/semesters', 'semesters-table'],
      ['/classes', 'classes-table'],
      ['/assignments', 'assignments-table'],
      ['/class-statistics', 'class-statistics-table'],
      ['/payment-rates', 'paymentRates-table'],
      ['/teacher-coefficients', 'degreeCoefficients-table'],
      ['/class-coefficients', 'classCoefficients-table'],
      ['/payroll', 'payroll-page'],
      ['/reports', 'reports-page'],
      ['/system', 'system-reset-button']
    ];
    const dashboard = new DashboardPage(driver);
    for (const [route, testId] of pages) {
      await dashboard.open(route);
      await dashboard.byTestId(testId);
    }
  });

  it('YC7-CRUD-001 thêm mới bằng cấp và tìm kiếm lại trên bảng', async function () {
    const degrees = new CrudPage(driver, '/degrees', 'degrees', 'Quản lý Bằng cấp');
    const suffix = Date.now().toString().slice(-6);
    const degreeId = `DEG-${suffix}`;
    const shortName = `AUTO${suffix}`;

    try {
      await degrees.openCrud();
      await degrees.fillField('id', degreeId);
      await degrees.fillField('name', `Bằng cấp Selenium ${suffix}`);
      await degrees.fillField('shortName', shortName);
      await degrees.fillField('coefficient', '2.5');
      await degrees.submit();
      await degrees.waitForText('Thêm dữ liệu thành công.');

      await degrees.search(shortName);
      let tableText = await degrees.tableText();
      assert.match(tableText, new RegExp(shortName));
      assert.match(tableText, /2,5|2.5/);

      // Tải lại toàn bộ trang để chứng minh dữ liệu đã được ghi xuống SQLite,
      // không chỉ tồn tại tạm trong state của React.
      await degrees.openCrud();
      await degrees.search(shortName);
      tableText = await degrees.tableText();
      assert.match(tableText, new RegExp(shortName));
    } finally {
      // Bao cả pha tạo trong try: nếu thao tác lưu thành công nhưng bước chờ/assert
      // thất bại, bản ghi Selenium vẫn được dọn.
      await degrees.openCrud();
      await degrees.search('');
      await degrees.deleteRowIfPresent(degreeId);
    }
  });

  it('YC7-NAV-001 mở trang giáo viên và kiểm tra dữ liệu demo', async function () {
    const teachers = new CrudPage(driver, '/teachers', 'teachers', 'Quản lý Giáo viên');
    await teachers.openCrud();
    await teachers.waitForText('Nguyễn Văn An');
    const count = await teachers.visibleRowsCount();
    assert.ok(count >= 1, 'Danh sách giáo viên phải có ít nhất một dòng dữ liệu demo.');
  });

  it('YC7-CLASS-STATS-001 thống kê lớp hiển thị phân công và sĩ số', async function () {
    const page = new DashboardPage(driver);
    await page.open('/class-statistics');
    await page.byTestId('class-statistics-page');
    const table = await page.byTestId('class-statistics-table');
    const text = await table.getText();
    assert.match(text, /CSDL101\.01/);
    assert.match(text, /Nguyễn Văn An/);
  });

  it('YC7-CLASS-COEF-001 hiển thị đúng hệ số nhân của lớp ở cả hai năm học', async function () {
    const coefficients = new CrudPage(driver, '/class-coefficients', 'classCoefficients', 'Thiết lập Hệ số lớp');
    await coefficients.openCrud();

    for (const year of ['2024', '2025']) {
      const expected = [
        [`CCOEF-${year}-01`, /1\s+40\s+0,9/],
        [`CCOEF-${year}-02`, /41\s+80\s+1,0/],
        [`CCOEF-${year}-03`, /81\s+120\s+1,1/],
        [`CCOEF-${year}-04`, /121\s+300\s+1,2/]
      ];
      for (const [id, pattern] of expected) {
        const row = await coefficients.byTestId(`classCoefficients-row-${id}`);
        assert.match(await row.getText(), pattern);
      }
    }
  });

  it('YC7-POSITIVE-INPUT-001 chặn dấu âm trên tất cả ô số nghiệp vụ', async function () {
    const pages = [
      ['/degrees', 'degrees', 'Quản lý Bằng cấp', ['coefficient']],
      ['/subjects', 'subjects', 'Quản lý Học phần', ['credits', 'totalHours', 'coefficient']],
      ['/classes', 'classes', 'Quản lý Lớp học phần', ['studentCount']],
      ['/assignments', 'assignments', 'Phân công giảng viên', ['teachingHours']],
      ['/payment-rates', 'paymentRates', 'Thiết lập Định mức tiết', ['amount']],
      ['/teacher-coefficients', 'degreeCoefficients', 'Thiết lập Hệ số giáo viên', ['coefficient']],
      ['/class-coefficients', 'classCoefficients', 'Thiết lập Hệ số lớp', ['minStudents', 'maxStudents', 'coefficient']]
    ];

    for (const [route, entityKey, title, fields] of pages) {
      const page = new CrudPage(driver, route, entityKey, title);
      await page.openCrud();
      for (const field of fields) {
        await page.fillField(field, '-0.1');
        assert.equal(
          await (await page.byTestId(`field-${field}`)).getAttribute('value'),
          '',
          `${route} phải chặn toàn bộ giá trị âm trong trường ${field}, không được tự đổi thành số dương.`
        );
      }
    }
  });

  it('YC7-CLASS-COEF-CRUD-001 từ chối hệ số lớp bằng 0', async function () {
    const coefficients = new CrudPage(driver, '/class-coefficients', 'classCoefficients', 'Thiết lập Hệ số lớp');
    const id = `CCOEF-E2E-${Date.now()}`;

    try {
      await coefficients.openCrud();
      await coefficients.fillField('id', id);
      await coefficients.fillField('year', '2099-2100');
      await coefficients.fillField('minStudents', '1');
      await coefficients.fillField('maxStudents', '40');
      await coefficients.fillField('coefficient', '0');
      await coefficients.submit();
      await coefficients.waitForText('phải lớn hơn 0');
      assert.equal(await coefficients.rowExists(id), false, 'Bản ghi hệ số 0 không được lưu.');

      await coefficients.fillField('coefficient', '0.95');
      await coefficients.submit();
      await coefficients.waitForText('phải theo bước 0.1');
      assert.equal(await coefficients.rowExists(id), false, 'Bản ghi sai bước 0.1 không được lưu hoặc hiển thị làm tròn sai.');
    } finally {
      await coefficients.openCrud();
      await coefficients.search('');
      await coefficients.deleteRowIfPresent(id);
    }
  });

  it('YC7-CLASS-BATCH-001 tạo nguyên lô hai lớp với mã tăng tự động', async function () {
    const classes = new CrudPage(driver, '/classes', 'classes', 'Quản lý Lớp học phần');
    await classes.openCrud();
    const baseId = await (await classes.byTestId('field-id')).getAttribute('value');
    const suffix = Date.now().toString().slice(-5);
    const baseCode = `AUTO${suffix}.01`;
    const nextId = baseId.replace(/(\d+)$/, (value) => String(Number(value) + 1).padStart(value.length, '0'));

    try {
      await classes.fillField('code', baseCode);
      await classes.selectField('subjectId', 'SUB-CSDL');
      await classes.selectField('semesterId', 'SEM-2025-1');
      await classes.fillField('studentCount', '35');
      const batchCount = await classes.byTestId('classes-batch-count');
      await driver.executeScript(
        `const element = arguments[0];
         const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
         setter.call(element, '2');
         element.dispatchEvent(new Event('input', { bubbles: true }));`,
        batchCount
      );
      await classes.submit();
      await classes.waitForText('Đã thêm 2 lớp học phần thành công.');

      await classes.search(`AUTO${suffix}`);
      const text = await classes.tableText();
      assert.match(text, new RegExp(`AUTO${suffix}\\.01`));
      assert.match(text, new RegExp(`AUTO${suffix}\\.02`));
    } finally {
      await classes.openCrud();
      await classes.search('');
      await classes.deleteRowIfPresent(baseId);
      await classes.deleteRowIfPresent(nextId);
    }
  });

  it('YC7-COEFFICIENT-COPY-001 sao chép trọn bộ hệ số sang năm kế tiếp', async function () {
    const coefficients = new CrudPage(driver, '/teacher-coefficients', 'degreeCoefficients', 'Thiết lập Hệ số giáo viên');
    await coefficients.openCrud();
    try {
      const target = await coefficients.byTestId('degree-coefficients-copy-target');
      await driver.executeScript(
        `const element = arguments[0];
         const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
         setter.call(element, '2026-2027');
         element.dispatchEvent(new Event('input', { bubbles: true }));`,
        target
      );
      await (await coefficients.byTestId('degree-coefficients-copy-button')).click();
      await coefficients.waitForText('Đã sao chép 4 hệ số sang năm 2026-2027.');

      await coefficients.search('2026-2027');
      assert.match(await coefficients.tableText(), /2026-2027/);
    } finally {
      await coefficients.openCrud();
      await coefficients.search('');
      for (let index = 1; index <= 4; index += 1) {
        await coefficients.deleteRowIfPresent(`DCOEF-2026-${String(index).padStart(3, '0')}`);
      }
    }
  });

  it('YC7-CONCURRENCY-001 từ chối snapshot cũ và giữ được dữ liệu mới hơn', async function () {
    const result = await driver.executeAsyncScript(`
      const done = arguments[arguments.length - 1];
      (async () => {
        const suffix = Date.now().toString().slice(-6);
        const artifactId = 'DEG-CONFLICT-' + suffix;
        const outcome = {};
        try {
          const first = await fetch('/api/state', { cache: 'no-store' });
          const original = await first.json();
          const firstVersion = first.headers.get('X-State-Version');
          const changed = { ...original, degrees: [...original.degrees, {
            id: artifactId,
            name: 'Kiểm tra xung đột',
            shortName: 'CF' + suffix,
            coefficient: 1.2,
            createdAt: new Date().toISOString().slice(0, 10)
          }] };
          const saved = await fetch('/api/state', {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-State-Version': firstVersion }, body: JSON.stringify(changed)
          });
          outcome.saved = saved.status;
          const stale = await fetch('/api/state', {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-State-Version': firstVersion }, body: JSON.stringify(original)
          });
          outcome.stale = stale.status;
        } catch (error) {
          outcome.error = String(error);
        } finally {
          // Chỉ loại bản ghi do chính test tạo và giữ nguyên mọi thay đổi khác.
          // Dùng version mới nhất để cleanup vẫn tuân thủ khóa lạc quan của API.
          const latest = await fetch('/api/state', { cache: 'no-store' });
          const current = await latest.json();
          const cleaned = { ...current, degrees: current.degrees.filter((item) => item.id !== artifactId) };
          const restored = await fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-State-Version': latest.headers.get('X-State-Version') },
            body: JSON.stringify(cleaned)
          });
          outcome.restored = restored.status;
        }
        done(outcome);
      })().catch((error) => done({ error: String(error) }));
    `);
    assert.deepEqual(result, { saved: 200, stale: 409, restored: 200 });
  });

  for (const testCase of payrollCases) {
    it(`${testCase.id} ${testCase.name}`, async function () {
      const payroll = new PayrollPage(driver);
      await payroll.openPayroll();
      await payroll.calculateManual(testCase.input);
      assert.match(await payroll.convertedHoursText(), new RegExp(testCase.expectedConvertedHours.replace('.', '\\.')));
      assert.match(await payroll.amountText(), new RegExp(testCase.expectedAmountText.replaceAll('.', '\\.')));
    });
  }

  it('YC7-PAY-VALIDATION-001 chỉ tính khi mọi chỉ số lớn hơn 0', async function () {
    const payroll = new PayrollPage(driver);
    const valid = { hours: 45, subjectCoef: 1, classCoef: 0.9, rate: 143000, degreeCoef: 2 };
    const invalidCases = [
      ['hours', 'Số tiết'],
      ['subjectCoef', 'Hệ số học phần'],
      ['classCoef', 'Hệ số lớp'],
      ['rate', 'Định mức'],
      ['degreeCoef', 'Hệ số bằng cấp']
    ];

    await payroll.openPayroll();
    await payroll.fillManualField('class-coef', '-0.1');
    assert.equal(
      await payroll.manualFieldValue('class-coef'),
      '',
      'Toàn bộ giá trị âm phải bị chặn, không được tự đổi -0.1 thành 0.1.'
    );
    assert.equal(await payroll.hasCalculatedOutput(), false, 'Giá trị âm bị chặn không được sinh kết quả tính.');

    for (const [field, label] of invalidCases) {
      await payroll.calculateManual({ ...valid, [field]: 0 });
      assert.match(await payroll.errorText(), new RegExp(`${label}.*phải.*lớn hơn 0`, 'i'));
      assert.equal(await payroll.hasCalculatedOutput(), false, `Không được hiển thị kết quả khi ${field} = 0.`);
    }
  });

  it('YC7-REPORT-001 mở báo cáo và kiểm tra dữ liệu tổng hợp', async function () {
    const reports = new ReportsPage(driver);
    await reports.openReports();
    assert.equal(await reports.exportButtonText(), 'Xuất CSV');
    assert.equal(await reports.printButtonText(), 'In / lưu PDF');
    const text = await reports.tableText();
    assert.match(text, /Giáo viên/i);
    assert.match(text, /Thành tiền/i);
  });
});

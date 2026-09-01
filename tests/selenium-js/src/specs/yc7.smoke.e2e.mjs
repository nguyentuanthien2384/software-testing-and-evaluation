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

  it('YC7-CRUD-001 thêm mới bằng cấp và tìm kiếm lại trên bảng', async function () {
    const degrees = new CrudPage(driver, '/degrees', 'degrees', 'Quản lý Bằng cấp');
    const suffix = Date.now().toString().slice(-6);
    const degreeId = `DEG-${suffix}`;
    const shortName = `AUTO${suffix}`;

    await degrees.openCrud();
    await degrees.fillField('id', degreeId);
    await degrees.fillField('name', `Bằng cấp Selenium ${suffix}`);
    await degrees.fillField('shortName', shortName);
    await degrees.fillField('coefficient', '2.5');
    await degrees.submit();
    await degrees.waitForText('Thêm dữ liệu thành công.');

    try {
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
      await degrees.deleteRow(degreeId);
      await degrees.waitForText('Đã xoá dữ liệu.');
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

  it('YC7-CLASS-BATCH-001 tạo nguyên lô hai lớp với mã tăng tự động', async function () {
    const classes = new CrudPage(driver, '/classes', 'classes', 'Quản lý Lớp học phần');
    await classes.openCrud();
    const baseId = await (await classes.byTestId('field-id')).getAttribute('value');
    const suffix = Date.now().toString().slice(-5);
    const baseCode = `AUTO${suffix}.01`;
    const nextId = baseId.replace(/(\d+)$/, (value) => String(Number(value) + 1).padStart(value.length, '0'));

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

    try {
      await classes.search(`AUTO${suffix}`);
      const text = await classes.tableText();
      assert.match(text, new RegExp(`AUTO${suffix}\\.01`));
      assert.match(text, new RegExp(`AUTO${suffix}\\.02`));
    } finally {
      await classes.deleteRow(baseId);
      await classes.waitForText('Đã xoá dữ liệu.');
      await classes.search('');
      await classes.deleteRow(nextId);
      await classes.waitForText('Đã xoá dữ liệu.');
    }
  });

  it('YC7-COEFFICIENT-COPY-001 sao chép trọn bộ hệ số sang năm kế tiếp', async function () {
    const coefficients = new CrudPage(driver, '/teacher-coefficients', 'degreeCoefficients', 'Thiết lập Hệ số giáo viên');
    await coefficients.openCrud();
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

    try {
      await coefficients.search('2026-2027');
      assert.match(await coefficients.tableText(), /2026-2027/);
    } finally {
      for (let index = 1; index <= 4; index += 1) {
        await coefficients.deleteRow(`DCOEF-2026-${String(index).padStart(3, '0')}`);
        await coefficients.waitForText('Đã xoá dữ liệu.');
      }
    }
  });

  it('YC7-CONCURRENCY-001 từ chối snapshot cũ và giữ được dữ liệu mới hơn', async function () {
    const result = await driver.executeAsyncScript(`
      const done = arguments[arguments.length - 1];
      (async () => {
        const first = await fetch('/api/state', { cache: 'no-store' });
        const original = await first.json();
        const firstVersion = first.headers.get('X-State-Version');
        const suffix = Date.now().toString().slice(-6);
        const changed = { ...original, degrees: [...original.degrees, {
          id: 'DEG-CONFLICT-' + suffix,
          name: 'Kiểm tra xung đột',
          shortName: 'CF' + suffix,
          coefficient: 1.2,
          createdAt: new Date().toISOString().slice(0, 10)
        }] };
        const saved = await fetch('/api/state', {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-State-Version': firstVersion }, body: JSON.stringify(changed)
        });
        const nextVersion = saved.headers.get('X-State-Version');
        const stale = await fetch('/api/state', {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-State-Version': firstVersion }, body: JSON.stringify(original)
        });
        const restored = await fetch('/api/state', {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-State-Version': nextVersion }, body: JSON.stringify(original)
        });
        done({ saved: saved.status, stale: stale.status, restored: restored.status });
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

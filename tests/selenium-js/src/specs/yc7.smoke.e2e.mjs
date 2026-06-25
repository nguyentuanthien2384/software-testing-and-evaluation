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

    await degrees.search(shortName);
    const tableText = await degrees.tableText();
    assert.match(tableText, new RegExp(shortName));
    assert.match(tableText, /2,5|2.5/);
  });

  it('YC7-NAV-001 mở trang giáo viên và kiểm tra dữ liệu demo', async function () {
    const teachers = new CrudPage(driver, '/teachers', 'teachers', 'Quản lý Giáo viên');
    await teachers.openCrud();
    await teachers.waitForText('Nguyễn Văn An');
    const count = await teachers.visibleRowsCount();
    assert.ok(count >= 1, 'Danh sách giáo viên phải có ít nhất một dòng dữ liệu demo.');
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
    const text = await reports.tableText();
    assert.match(text, /Giáo viên/i);
    assert.match(text, /Thành tiền/i);
  });
});

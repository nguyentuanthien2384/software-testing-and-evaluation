import { strict as assert } from 'node:assert';
import { createDriver } from '../support/driver.mjs';
import { saveScreenshot } from '../support/test-utils.mjs';
import { LoginPage } from '../pages/login.page.mjs';
import { CrudPage } from '../pages/crud.page.mjs';

describe('LOGIN Selenium suite - đăng nhập & phân quyền', function () {
  let driver;

  before(async function () {
    driver = await createDriver();
  });

  after(async function () {
    if (driver) await driver.quit();
  });

  // Mỗi test bắt đầu từ trạng thái sạch và tất định: xoá session TRƯỚC rồi mới vào /login.
  beforeEach(async function () {
    const login = new LoginPage(driver);
    // Bảo đảm đã có origin (http) để truy cập được localStorage.
    if (!(await driver.getCurrentUrl()).startsWith('http')) {
      await login.open('/login');
    }
    await driver.executeScript('window.localStorage.clear();');
    // Không còn session -> /login sẽ ở lại, không bị redirect về '/'.
    await login.open('/login');
    await login.byTestId('login-username');
  });

  afterEach(async function () {
    if (this.currentTest?.state === 'failed' && driver) {
      const file = await saveScreenshot(driver, this.currentTest.fullTitle());
      // eslint-disable-next-line no-console
      console.error(`Screenshot saved: ${file}`);
    }
  });

  it('LOGIN-001 admin đăng nhập đúng và thấy vai trò Quản trị viên', async function () {
    const login = new LoginPage(driver);
    await login.loginAs('admin', 'admin@123');
    assert.equal(await login.userRoleText(), 'Quản trị viên');
  });

  it('LOGIN-002 tester đăng nhập đúng và thấy vai trò Kiểm thử viên', async function () {
    const login = new LoginPage(driver);
    await login.loginAs('tester', 'tester@123');
    assert.equal(await login.userRoleText(), 'Kiểm thử viên');
  });

  it('LOGIN-003 sai mật khẩu hiển thị thông báo lỗi', async function () {
    const login = new LoginPage(driver);
    await login.attemptLogin('admin', 'sai-mat-khau');
    assert.match(await login.errorText(), /không đúng/);
  });

  it('LOGIN-004 truy cập trang nội bộ khi chưa đăng nhập sẽ bị chuyển về /login', async function () {
    const login = new LoginPage(driver);
    await login.open('/teachers');
    await login.byTestId('login-page');
    assert.match(await driver.getCurrentUrl(), /\/login/);
  });

  it('LOGIN-005 admin thấy form quản lý dữ liệu (data:manage)', async function () {
    const login = new LoginPage(driver);
    await login.loginAs('admin', 'admin@123');
    const degrees = new CrudPage(driver, '/degrees', 'degrees', 'Quản lý Bằng cấp');
    await degrees.open('/degrees');
    await degrees.byTestId('degrees-form');
  });

  it('LOGIN-006 tester chỉ xem, không có form quản lý dữ liệu', async function () {
    const login = new LoginPage(driver);
    await login.loginAs('tester', 'tester@123');
    await login.open('/degrees');
    await login.byTestId('degrees-readonly-notice');
  });
});

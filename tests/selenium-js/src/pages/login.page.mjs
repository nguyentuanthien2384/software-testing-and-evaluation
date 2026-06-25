import { BasePage } from './base.page.mjs';

export class LoginPage extends BasePage {
  async openLogin() {
    await this.open('/login');
    await this.byTestId('login-page');
  }

  // Set value cho input controlled của React một cách tất định:
  // dùng native value setter + dispatch sự kiện 'input' để React cập nhật state.
  async setReactInput(testId, value) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const element = await this.byTestId(testId);
      await this.driver.executeScript(
        `const el = arguments[0];
         const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
         setter.call(el, arguments[1]);
         el.dispatchEvent(new Event('input', { bubbles: true }));`,
        element,
        String(value)
      );
      const current = await element.getAttribute('value');
      if (current === String(value)) return;
      await this.driver.sleep(300);
    }
    throw new Error(`Không nhập được giá trị ổn định cho ${testId}`);
  }

  async fillCredentials(username, password) {
    await this.setReactInput('login-username', username);
    await this.setReactInput('login-password', password);
  }

  async submit() {
    const form = await this.byTestId('login-form');
    // requestSubmit() kích hoạt onSubmit (handleSubmit) tất định, không phụ thuộc click.
    await this.driver.executeScript('arguments[0].requestSubmit();', form);
  }

  async waitForLoggedIn() {
    await this.byTestId('topbar-user');
  }

  // Đăng nhập thành công: chờ điều hướng về trang chủ (topbar hiện user) rồi mới trả về.
  async loginAs(username, password) {
    await this.openLogin();
    await this.fillCredentials(username, password);
    await this.submit();
    await this.waitForLoggedIn();
  }

  // Đăng nhập kỳ vọng thất bại: chỉ submit, KHÔNG chờ điều hướng.
  async attemptLogin(username, password) {
    await this.openLogin();
    await this.fillCredentials(username, password);
    await this.submit();
  }

  async errorText() {
    const element = await this.byTestId('login-error');
    return element.getText();
  }

  async userRoleText() {
    const element = await this.byTestId('topbar-user-role');
    return element.getText();
  }

  async logout() {
    const button = await this.byTestId('logout-button');
    await button.click();
  }
}

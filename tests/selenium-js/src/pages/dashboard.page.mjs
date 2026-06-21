import { strict as assert } from 'node:assert';
import { BasePage } from './base.page.mjs';

export class DashboardPage extends BasePage {
  async openDashboard() {
    await this.open('/');
    await this.byTestId('dashboard-page');
  }

  async assertLoaded() {
    await this.waitForText('Phần mềm tính tiền dạy cho giáo viên');
    await this.waitForText('Luồng nghiệp vụ chính');
    const payrollLink = await this.byTestId('dashboard-payroll-link');
    assert.equal(await payrollLink.getText(), 'Tính tiền dạy');
  }
}

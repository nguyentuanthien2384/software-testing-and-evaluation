import { BasePage } from './base.page.mjs';
import { clearAndType } from '../support/test-utils.mjs';

export class PayrollPage extends BasePage {
  async openPayroll() {
    await this.open('/payroll');
    await this.byTestId('payroll-page');
    await this.waitForText('Tính tiền dạy');
  }

  async calculateManual({ hours, subjectCoef, classCoef, rate, degreeCoef }) {
    await clearAndType(await this.byTestId('payroll-hours-input'), hours);
    await clearAndType(await this.byTestId('payroll-subject-coef-input'), subjectCoef);
    await clearAndType(await this.byTestId('payroll-class-coef-input'), classCoef);
    await clearAndType(await this.byTestId('payroll-rate-input'), rate);
    await clearAndType(await this.byTestId('payroll-degree-coef-input'), degreeCoef);
  }

  async amountText() {
    return (await this.byTestId('payroll-amount')).getText();
  }

  async convertedHoursText() {
    return (await this.byTestId('payroll-converted-hours')).getText();
  }
}

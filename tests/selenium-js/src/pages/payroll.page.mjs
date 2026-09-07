import { By } from 'selenium-webdriver';
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

  async fillManualField(name, value) {
    await clearAndType(await this.byTestId(`payroll-${name}-input`), value);
  }

  async manualFieldValue(name) {
    return (await this.byTestId(`payroll-${name}-input`)).getAttribute('value');
  }

  async errorText() {
    return (await this.byTestId('payroll-error')).getText();
  }

  async hasCalculatedOutput() {
    const outputs = await this.driver.findElements(By.css(
      '[data-testid="payroll-converted-hours"], [data-testid="payroll-amount"]'
    ));
    return outputs.length > 0;
  }

  async amountText() {
    return (await this.byTestId('payroll-amount')).getText();
  }

  async convertedHoursText() {
    return (await this.byTestId('payroll-converted-hours')).getText();
  }
}

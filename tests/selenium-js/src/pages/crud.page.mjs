import { By, until } from 'selenium-webdriver';
import { BasePage } from './base.page.mjs';
import { clearAndType } from '../support/test-utils.mjs';

export class CrudPage extends BasePage {
  constructor(driver, path, entityKey, title) {
    super(driver);
    this.path = path;
    this.entityKey = entityKey;
    this.title = title;
  }

  async openCrud() {
    await this.open(this.path);
    await this.waitForText(this.title);
    await this.byTestId(`${this.entityKey}-form`);
    const submit = await this.byTestId(`${this.entityKey}-submit-button`);
    await this.driver.wait(until.elementIsEnabled(submit), 10000);
  }

  async fillField(name, value) {
    const field = await this.byTestId(`field-${name}`);
    await clearAndType(field, value);
  }

  async submit() {
    const button = await this.byTestId(`${this.entityKey}-submit-button`);
    await button.click();
  }

  async search(value) {
    const input = await this.byTestId(`${this.entityKey}-search-input`);
    await clearAndType(input, value);
  }

  async tableText() {
    const table = await this.byTestId(`${this.entityKey}-table`);
    return table.getText();
  }

  async selectField(name, value) {
    const field = await this.byTestId(`field-${name}`);
    await this.driver.executeScript(
      `const element = arguments[0];
       const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
       setter.call(element, arguments[1]);
       element.dispatchEvent(new Event('change', { bubbles: true }));`,
      field,
      value
    );
  }

  async deleteRow(id) {
    const buttonTestId = `${this.entityKey}-delete-${id}`;
    const button = await this.byTestId(buttonTestId);
    await button.click();
    await this.driver.wait(until.alertIsPresent(), 5000);
    const confirmation = await this.driver.switchTo().alert();
    await confirmation.accept();
    // Chờ đúng bản ghi biến mất thay vì chỉ chờ toast. Toast của lần xoá trước
    // có thể vẫn còn và làm lần cleanup kế tiếp kết thúc quá sớm.
    await this.driver.wait(async () => {
      const matches = await this.driver.findElements(By.css(`[data-testid="${buttonTestId}"]`));
      return matches.length === 0;
    }, 10000, `Bản ghi ${id} không biến mất sau khi xác nhận xoá.`);
  }

  async rowExists(id) {
    const rows = await this.driver.findElements(By.css(`[data-testid="${this.entityKey}-row-${id}"]`));
    return rows.length > 0;
  }

  async deleteRowIfPresent(id) {
    if (!(await this.rowExists(id))) return false;
    await this.deleteRow(id);
    return true;
  }

  async visibleRowsCount() {
    const table = await this.byTestId(`${this.entityKey}-table`);
    const rows = await table.findElements(By.css('tbody tr'));
    return rows.length;
  }
}

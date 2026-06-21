import { By } from 'selenium-webdriver';
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

  async visibleRowsCount() {
    const table = await this.byTestId(`${this.entityKey}-table`);
    const rows = await table.findElements(By.css('tbody tr'));
    return rows.length;
  }
}

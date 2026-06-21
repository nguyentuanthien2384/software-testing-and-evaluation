import { getBaseUrl } from '../support/driver.mjs';
import { byTestId, waitForBodyText } from '../support/test-utils.mjs';

export class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.baseUrl = getBaseUrl();
  }

  async open(path = '/') {
    await this.driver.get(`${this.baseUrl}${path}`);
  }

  byTestId(testId, timeout) {
    return byTestId(this.driver, testId, timeout);
  }

  waitForText(text, timeout) {
    return waitForBodyText(this.driver, text, timeout);
  }
}

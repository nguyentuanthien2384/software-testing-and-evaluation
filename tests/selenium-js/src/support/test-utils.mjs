import fs from 'node:fs/promises';
import path from 'node:path';
import { By, Key, until } from 'selenium-webdriver';

export async function byTestId(driver, testId, timeout = 10000) {
  const locator = By.css(`[data-testid="${testId}"]`);
  const element = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

export async function waitForBodyText(driver, text, timeout = 10000) {
  await driver.wait(until.elementTextContains(driver.findElement(By.css('body')), text), timeout);
}

export async function clearAndType(element, value) {
  await element.click();
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
  await element.sendKeys(Key.BACK_SPACE);
  await element.sendKeys(String(value));
}

export async function saveScreenshot(driver, testTitle) {
  const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('../../evidence/screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });
  const safeName = testTitle.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 120);
  const filename = path.join(screenshotDir, `${new Date().toISOString().replace(/[:.]/g, '-')}_${safeName}.png`);
  const image = await driver.takeScreenshot();
  await fs.writeFile(filename, image, 'base64');
  return filename;
}

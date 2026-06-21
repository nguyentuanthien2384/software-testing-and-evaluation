import fs from 'node:fs';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import firefox from 'selenium-webdriver/firefox.js';
import edge from 'selenium-webdriver/edge.js';

const DEFAULT_WINDOW_SIZE = '1440,1000';

export async function createDriver() {
  const browserName = process.env.BROWSER || 'chrome';
  const headless = process.env.HEADLESS !== 'false';
  const builder = new Builder().forBrowser(browserName);

  if (browserName === 'chrome') {
    const options = new chrome.Options();
    const chromeBinary = process.env.CHROME_BINARY || firstExistingPath(['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']);
    if (chromeBinary) options.setChromeBinaryPath(chromeBinary);
    options.addArguments(`--window-size=${process.env.WINDOW_SIZE || DEFAULT_WINDOW_SIZE}`);
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--no-sandbox');
    if (headless) options.addArguments('--headless=new');
    if (process.env.CHROMEDRIVER_PATH) {
      builder.setChromeService(new chrome.ServiceBuilder(process.env.CHROMEDRIVER_PATH));
    }
    builder.setChromeOptions(options);
  }

  if (browserName === 'firefox') {
    const options = new firefox.Options();
    if (headless) options.addArguments('-headless');
    builder.setFirefoxOptions(options);
  }

  if (browserName === 'edge') {
    const options = new edge.Options();
    options.addArguments(`--window-size=${process.env.WINDOW_SIZE || DEFAULT_WINDOW_SIZE}`);
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--no-sandbox');
    if (headless) options.addArguments('--headless=new');
    builder.setEdgeOptions(options);
  }

  const driver = await builder.build();
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 20000, script: 10000 });
  return driver;
}

export function getBaseUrl() {
  return process.env.BASE_URL || 'http://127.0.0.1:3000';
}

function firstExistingPath(paths) {
  return paths.find((item) => {
    try {
      return fs.existsSync(item);
    } catch {
      return false;
    }
  });
}

"""Legacy Selenium smoke tests for the N01_G11 teacher payroll app.

Run:
  pip install selenium webdriver-manager
  cd source/teacher-payroll-app
  npm run dev
  python ../../tests/selenium/selenium_teacher_payroll_test.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000")


def driver_factory():
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    if os.getenv("HEADLESS", "true").lower() != "false":
        options.add_argument("--headless=new")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)


def wait_text(driver, text):
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), text))


def login_as_admin(driver):
    driver.get(f"{BASE_URL}/login")
    username = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="login-username"]'))
    )
    username.send_keys("admin")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="login-password"]').send_keys("admin@123")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="login-form"]').submit()
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="topbar-user"]'))
    )


def cleanup_degree(driver, degree_id):
    """Remove this run's unreferenced test row even when a later assertion fails."""
    result = driver.execute_async_script(
        """
        const [degreeId, done] = arguments;
        fetch('/api/state', { cache: 'no-store' })
          .then(async (response) => ({
            data: await response.json(),
            version: response.headers.get('X-State-Version') || ''
          }))
          .then(({ data, version }) => {
            if (!Array.isArray(data.degrees) || !data.degrees.some((row) => row.id === degreeId)) {
              done({ ok: true, skipped: true });
              return;
            }
            return fetch('/api/state', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'X-State-Version': version },
              body: JSON.stringify({
                ...data,
                degrees: data.degrees.filter((row) => row.id !== degreeId)
              })
            }).then(async (response) => done({
              ok: response.ok,
              status: response.status,
              body: await response.text()
            }));
          })
          .catch((error) => done({ ok: false, error: String(error) }));
        """,
        degree_id,
    )
    if not result.get("ok"):
        raise RuntimeError(f"Không dọn được dữ liệu test {degree_id}: {result}")


def test_dashboard(driver):
    driver.get(BASE_URL)
    wait_text(driver, "Phần mềm tính tiền dạy cho giáo viên")
    wait_text(driver, "Luồng nghiệp vụ chính")


def test_degrees_crud(driver, degree_id):
    driver.get(f"{BASE_URL}/degrees")
    wait_text(driver, "Quản lý Bằng cấp")
    driver.find_element(By.NAME, "id").clear()
    driver.find_element(By.NAME, "id").send_keys(degree_id)
    driver.find_element(By.NAME, "name").clear()
    driver.find_element(By.NAME, "name").send_keys("Giáo sư demo")
    driver.find_element(By.NAME, "shortName").clear()
    driver.find_element(By.NAME, "shortName").send_keys(f"GS{degree_id[-6:]}")
    driver.find_element(By.NAME, "coefficient").clear()
    driver.find_element(By.NAME, "coefficient").send_keys("2.5")
    driver.find_element(By.CSS_SELECTOR, "button.primary-btn").click()
    wait_text(driver, "Thêm dữ liệu thành công")
    wait_text(driver, f"GS{degree_id[-6:]}")


def test_teacher_page(driver):
    driver.get(f"{BASE_URL}/teachers")
    wait_text(driver, "Quản lý Giáo viên")
    wait_text(driver, "Nguyễn Văn An")


def test_payroll_calculation(driver):
    driver.get(f"{BASE_URL}/payroll")
    wait_text(driver, "Tính tiền dạy")
    hours = driver.find_element(By.ID, "hours")
    hours.clear()
    hours.send_keys("45")
    driver.find_element(By.ID, "amount")
    wait_text(driver, "Thành tiền")


def test_reports(driver):
    driver.get(f"{BASE_URL}/reports")
    wait_text(driver, "Báo cáo tiền dạy")
    wait_text(driver, "Tổng hợp theo giáo viên")


def main():
    driver = driver_factory()
    degree_id = f"DEG-PY-{str(time.time_ns())[-8:]}"
    try:
        login_as_admin(driver)
        test_dashboard(driver)
        test_degrees_crud(driver, degree_id)
        test_teacher_page(driver)
        test_payroll_calculation(driver)
        test_reports(driver)
        print("SELENIUM PASS: 5/5 smoke tests passed")
    finally:
        try:
            cleanup_degree(driver, degree_id)
        finally:
            driver.quit()


if __name__ == "__main__":
    main()

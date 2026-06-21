"""Selenium WebDriver tests for N01_G11 teacher payroll app.

Run:
  pip install selenium webdriver-manager
  cd source/teacher-payroll-app
  npm run dev
  python ../../tests/selenium/selenium_teacher_payroll_test.py
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = "http://localhost:3000"


def driver_factory():
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1440,1000")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)


def wait_text(driver, text):
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), text))


def test_dashboard(driver):
    driver.get(BASE_URL)
    wait_text(driver, "Phần mềm tính tiền dạy cho giáo viên")
    wait_text(driver, "Luồng nghiệp vụ chính")


def test_degrees_crud(driver):
    driver.get(f"{BASE_URL}/degrees")
    wait_text(driver, "Quản lý Bằng cấp")
    driver.find_element(By.NAME, "id").clear()
    driver.find_element(By.NAME, "id").send_keys("DEG-DEMO")
    driver.find_element(By.NAME, "name").clear()
    driver.find_element(By.NAME, "name").send_keys("Giáo sư demo")
    driver.find_element(By.NAME, "shortName").clear()
    driver.find_element(By.NAME, "shortName").send_keys("GSDEMO")
    driver.find_element(By.NAME, "coefficient").clear()
    driver.find_element(By.NAME, "coefficient").send_keys("2.5")
    driver.find_element(By.CSS_SELECTOR, "button.primary-btn").click()
    wait_text(driver, "Thêm dữ liệu thành công")
    wait_text(driver, "GSDEMO")


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
    try:
        test_dashboard(driver)
        test_degrees_crud(driver)
        test_teacher_page(driver)
        test_payroll_calculation(driver)
        test_reports(driver)
        print("SELENIUM PASS: 5/5 smoke tests passed")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()

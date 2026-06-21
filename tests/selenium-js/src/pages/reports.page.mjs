import { BasePage } from './base.page.mjs';

export class ReportsPage extends BasePage {
  async openReports() {
    await this.open('/reports');
    await this.byTestId('reports-page');
    await this.waitForText('Báo cáo tiền dạy');
  }

  async tableText() {
    return (await this.byTestId('reports-table')).getText();
  }

  async exportButtonText() {
    return (await this.byTestId('reports-export-csv-button')).getText();
  }
}

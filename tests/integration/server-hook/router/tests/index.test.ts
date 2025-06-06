import path from 'path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import {
  getPort,
  killApp,
  launchApp,
  launchOptions,
} from '../../../../utils/modernTestUtils';

const appPath = path.resolve(__dirname, '../');

describe('test status code page', () => {
  let app: any;
  let port: number;
  let page: Page;
  let browser: Browser;
  beforeAll(async () => {
    jest.setTimeout(1000 * 60 * 2);
    port = await getPort();

    app = await launchApp(appPath, port);

    browser = await puppeteer.launch({
      ...launchOptions,
      acceptInsecureCerts: true, // https://github.com/puppeteer/puppeteer/issues/1137, Puppeteer 23.0.0 rename ignoreHTTPSErrors to acceptInsecureCerts
    } as any);
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (app) {
      await killApp(app);
    }
    await page.close();
    await browser.close();
  });

  test('should router rewrite correctly ', async () => {
    await page.goto(`http://localhost:${port}/rewrite`);
    const text = await page.$eval('#root', el => el?.textContent);
    expect(text).toMatch('Entry Page');
  });

  test('should router redirect correctly ', async () => {
    const response = await page.goto(`http://localhost:${port}/redirect`, {
      waitUntil: 'networkidle0',
    });
    const text = await response!.text();
    expect(text).toMatch('Modern Web Development');
  });

  test('should router redirect correctly ', async () => {
    await page.goto(`http://localhost:${port}/mobile`);
    const text = await page.$eval('#root', el => el?.textContent);
    expect(text).toMatch('PC Page');
  });

  test('should router redirect correctly ', async () => {
    await page.goto(`http://localhost:${port}/pc`);
    const text = await page.$eval('#root', el => el?.textContent);
    expect(text).toMatch('PC Page');
  });
});

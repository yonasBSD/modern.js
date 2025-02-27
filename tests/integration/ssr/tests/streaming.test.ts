import path, { join } from 'path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import {
  getPort,
  killApp,
  launchApp,
  launchOptions,
} from '../../../utils/modernTestUtils';

const fixtureDir = path.resolve(__dirname, '../fixtures');

async function basicUsage(page: Page, appPort: number) {
  const res = await page.goto(`http://localhost:${appPort}/about`, {
    waitUntil: ['networkidle0'],
  });

  const body = await res!.text();
  // css chunks inject correctly
  expect(body).toMatch(
    /<link href="\/static\/css\/async\/about\/page.css" rel="stylesheet" \/>/,
  );

  expect(body).toMatch(/<div>About content<\/div>/);
  expect(body).toMatch('reporter');

  const headers = await res?.headers();

  expect(headers).toHaveProperty('x-custom-key', '123');
}

async function deferredData(page: Page, appPort: number) {
  await page.goto(`http://localhost:${appPort}/user/1`, {
    waitUntil: ['networkidle0'],
  });

  await (expect(page) as any).toMatchTextContent(/user1-18/);
}

async function deferredDataInNavigation(page: Page, appPort: number) {
  await page.goto(`http://localhost:${appPort}`, {
    waitUntil: ['networkidle0'],
  });

  await page.click('#user-btn');
  await (expect(page) as any).toMatchTextContent(/user1-18/);
}

async function errorThrownInLoader(page: Page, appPort: number) {
  const res = await page.goto(`http://localhost:${appPort}/error`, {
    waitUntil: ['networkidle0'],
  });

  const body = await res!.text();
  expect(body).toMatch(/Something went wrong!.*error occurs/);
}

describe('Streaming SSR', () => {
  let app: any;
  let appPort: number;
  let page: Page;
  let browser: Browser;

  beforeAll(async () => {
    const appDir = join(fixtureDir, 'streaming');
    appPort = await getPort();
    app = await launchApp(appDir, appPort, {});

    browser = await puppeteer.launch(launchOptions as any);
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      browser.close();
    }
    if (app) {
      await killApp(app);
    }
  });

  test(`basic usage`, async () => {
    await basicUsage(page, appPort);
  });

  test(`deferred data`, async () => {
    await deferredData(page, appPort);
  });

  test(`deferred data in client navigation`, async () => {
    await deferredDataInNavigation(page, appPort);
  });

  test('error thrown in loader', async () => {
    await errorThrownInLoader(page, appPort);
  });
});

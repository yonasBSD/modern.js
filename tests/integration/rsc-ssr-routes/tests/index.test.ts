import path from 'path';
import { isVersionAtLeast18 } from '@modern-js/utils';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import {
  getPort,
  killApp,
  launchApp,
  launchOptions,
  modernBuild,
  modernServe,
} from '../../../utils/modernTestUtils';

const appDir = path.resolve(__dirname, '../');

interface TestConfig {
  mode: 'dev' | 'build';
}

interface TestOptions {
  baseUrl: string;
  appPort: number;
  page: Page;
}

async function verifyUserPageElements(page: Page) {
  const elementsToCheck = [
    { name: 'root layout', selector: 'body' },
    { name: 'user layout', selector: '.user-layout' },
    { name: 'Profile Component', selector: '.user-layout' },
    { name: 'John Doe', selector: '.user-layout' },
    { name: 'user page data', selector: '.user-layout' },
  ];

  for (const { name, selector } of elementsToCheck) {
    const elementExists = await page.$eval(
      selector,
      (el, name) => {
        return el.textContent?.includes(name);
      },
      name,
    );
    expect(elementExists).toBe(true);
  }
}

function skipForLowerNodeVersion() {
  if (!isVersionAtLeast18()) {
    test('should skip in lower node version', () => {
      expect(true).toBe(true);
    });
    return true;
  }
  return false;
}

function runTests({ mode }: TestConfig) {
  describe(`${mode}`, () => {
    let app: any;
    let appPort: number;
    let page: Page;
    let browser: Browser;
    const errors: string[] = [];

    if (skipForLowerNodeVersion()) {
      return;
    }

    beforeAll(async () => {
      appPort = await getPort();

      if (mode === 'dev') {
        app = await launchApp(appDir, appPort);
      } else {
        await modernBuild(appDir);
        app = await modernServe(appDir, appPort, {
          cwd: appDir,
        });
      }

      browser = await puppeteer.launch(launchOptions as any);
      page = await browser.newPage();

      if (mode === 'build') {
        page.on('pageerror', error => {
          errors.push(error.message);
        });
      }
    });

    afterAll(async () => {
      await killApp(app);
      await page.close();
      await browser.close();
    });

    describe('ssr-rsc-routes-with-loader', () => {
      const baseUrl = `/loader`;

      it('support route as server component and client component', () =>
        supportRouteAsServerComponent({ baseUrl, appPort, page }));

      it('support route as client component and navigation', () =>
        suppportRouteAsClientComponentAndNavigation({
          baseUrl,
          appPort,
          page,
        }));

      it('support direct redirect navigation', () =>
        supportDirectRedirectNavigation({ baseUrl, appPort, page }));

      it('support redirect on first screen load', () =>
        supportRedirectOnFirstScreenLoad({ baseUrl, appPort, page }));

      it('support client loader', () =>
        supportClientLoader({ baseUrl, appPort, page }));

      it('support pass matches to server component', () =>
        supportMatchRoute({ baseUrl, appPort, page }));
    });

    describe('ssr-rsc-routes-with-fetch', () => {
      const baseUrl = `/component`;

      it('should render with fetch correctly', () =>
        shouldRenderWithFetchCorrectly({ baseUrl, appPort, page }));
    });
  });
}

async function suppportRouteAsClientComponentAndNavigation({
  baseUrl,
  appPort,
  page,
}: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });
  const elementsToCheck = [
    { name: 'root layout', selector: 'body' },
    { name: 'root page from server', selector: '.root-page' },
  ];

  for (const { name, selector } of elementsToCheck) {
    const elementExists = await page.$eval(
      selector,
      (el, name) => {
        return el.textContent?.includes(name);
      },
      name,
    );
    expect(elementExists).toBe(true);
  }

  await page.click('.user-link');

  await page.waitForSelector('.user-page-data-container');
  await verifyUserPageElements(page);
}

async function supportRouteAsServerComponent({
  baseUrl,
  appPort,
  page,
}: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}/user`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });
  await page.waitForSelector('.user-page-data-container');
  await verifyUserPageElements(page);
}

async function supportDirectRedirectNavigation({
  baseUrl,
  appPort,
  page,
}: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });

  const rootLayoutExists = await page.$eval('.root-layout', el =>
    el.textContent?.includes('root layout'),
  );
  expect(rootLayoutExists).toBe(true);

  await page.click('.redirect-link');

  await page.waitForSelector('.user-page-data-container', { timeout: 5000 });
  await verifyUserPageElements(page);

  const currentUrl = page.url();
  expect(currentUrl).toContain('/user');
}

async function supportRedirectOnFirstScreenLoad({
  baseUrl,
  appPort,
  page,
}: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}/redirect`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });

  await page.waitForSelector('.user-page-data-container', { timeout: 5000 });
  await verifyUserPageElements(page);

  const currentUrl = page.url();
  expect(currentUrl).toContain('/user');
  expect(currentUrl).not.toContain('/redirect');
}

async function supportClientLoader({ baseUrl, appPort, page }: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}/user`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });

  await page.click('.home-link');

  await page.waitForSelector('.root-page', { timeout: 5000 });

  const elementsToCheck = [
    { name: 'root layout', selector: 'body' },
    { name: 'root page from client', selector: '.root-page' },
  ];

  for (const { name, selector } of elementsToCheck) {
    const elementExists = await page.$eval(
      selector,
      (el, name) => {
        return el.textContent?.includes(name);
      },
      name,
    );
    expect(elementExists).toBe(true);
  }
}

async function supportMatchRoute({ baseUrl, appPort, page }: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}/match/123`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });

  await page.waitForSelector('.matched', { timeout: 2000 });
  const matched = await page.$eval('.matched', el => el.textContent);
  expect(matched).toBe('Matched');
}

async function shouldRenderWithFetchCorrectly({
  baseUrl,
  appPort,
  page,
}: TestOptions) {
  await page.goto(`http://localhost:${appPort}${baseUrl}`, {
    waitUntil: ['networkidle0', 'domcontentloaded'],
  });

  await page.waitForSelector('.message', { timeout: 5000 });
  const message = await page.$eval('.message', el => el.textContent);
  expect(message).toBe('root page from server');

  await page.click('.user-link');
  await page.waitForSelector('.user-data', { timeout: 5000 });
  const userData = await page.$eval('.user-data', el => el.textContent);
  expect(userData).toBe('user data from server');

  await page.click('.home-link');
  await page.waitForSelector('.message', { timeout: 5000 });
  const message2 = await page.$eval('.message', el => el.textContent);
  expect(message2).toBe('root page from server');
}

runTests({ mode: 'dev' });
runTests({ mode: 'build' });

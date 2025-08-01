import path from 'path';
import { fs, ROUTE_MANIFEST_FILE } from '@modern-js/utils';
import { ROUTE_MANIFEST } from '@modern-js/utils/universal/constants';
import puppeteer, { type Browser } from 'puppeteer';

import type { Page } from 'puppeteer';
import {
  getPort,
  killApp,
  launchApp,
  launchOptions,
  modernBuild,
  modernServe,
} from '../../../utils/modernTestUtils';

const appDir = path.resolve(__dirname, '../');

const renderSelfRoute = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/one`, {
    waitUntil: ['networkidle0'],
  });
  const description = await page.$('.description');
  const targetText = await page.evaluate(el => el?.textContent, description);
  expect(targetText?.trim()).toEqual('Get started by editing src/App.tsx');
  expect(errors.length).toEqual(0);
};

const supportNestedRoutes = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three/user`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('root layout')).toBeTruthy();
  expect(text?.includes('user layout')).toBeTruthy();
  expect(text?.includes('user page')).toBeTruthy();

  await page.goto(`http://localhost:${appPort}/three/user/profile`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm1 = await page.$('#root');
  const text1 = await page.evaluate(el => el?.textContent, rootElm1);
  expect(text1?.includes('root layout')).toBeTruthy();
  expect(text1?.includes('user layout')).toBeTruthy();
  expect(text1?.includes('profile layout')).toBeTruthy();
  expect(text1?.includes('profile page')).toBeTruthy();

  expect(errors.length).toEqual(0);
};

const supportDynamaicPaths = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three/user/1234`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('root layout')).toBeTruthy();
  expect(text?.includes('1234')).toBeTruthy();
  expect(errors.length).toEqual(0);
};

const supportNoLayoutDir = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three/user/1234/profile`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('root layout')).toBeTruthy();
  expect(text?.includes('user layout')).toBeTruthy();
  expect(text?.includes('item page, param is 1234')).toBeTruthy();
  expect(errors.length).toEqual(0);
};

const supportPathLessLayout = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('root layout')).toBeTruthy();
  expect(text?.includes('auth layout')).toBeFalsy();

  await page.goto(`http://localhost:${appPort}/three/item`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm1 = await page.$('#root');
  const text1 = await page.evaluate(el => el?.textContent, rootElm1);
  expect(text1?.includes('root layout')).toBeTruthy();
  expect(text1?.includes('auth layout')).toBeTruthy();
  expect(text1?.includes('shop layout')).toBeTruthy();
  expect(text1?.includes('item page')).toBeTruthy();
  expect(errors.length).toEqual(0);
};

const supportPathWithoutLayout = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three/user/profile/name`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('root layout')).toBeTruthy();
  expect(text?.includes('user layout')).toBeFalsy();
  expect(text?.includes('user profile name layout')).toBeTruthy();
  expect(text?.includes('profile name page')).toBeTruthy();
  expect(errors.length).toEqual(0);
};

const supportHandleLoaderError = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three`, {
    waitUntil: ['domcontentloaded'],
  });

  await page.waitForSelector('.loader-error-btn');

  await Promise.all([
    page.click('.loader-error-btn'),
    page.waitForSelector('.error-loader-page'),
  ]);
  const errorElm = await page.$('.error-loader-page');
  const text = await page.evaluate(el => el?.textContent, errorElm);
  expect(text).toBe('render by client loader');
  expect(errors.length).toBe(0);
};

const supportLoadChunksParallelly = async () => {
  const distDir = path.join(appDir, './dist');
  const manifestFile = path.join(distDir, ROUTE_MANIFEST_FILE);
  expect(await fs.pathExists(manifestFile)).toBeTruthy();
  const threeHtmlPath = path.join(distDir, 'html/three/index.html');
  const threeHtml = await fs.readFile(threeHtmlPath);
  expect(threeHtml.includes(ROUTE_MANIFEST)).toBeTruthy();
};

const supportHandleConfig = async (page: Page, appPort: number) => {
  await page.goto(`http://localhost:${appPort}/three/user/profile/name`, {
    waitUntil: ['networkidle0'],
  });

  await (expect(page) as any).toMatchTextContent(
    'root/user.profile.name.layout/user.profile.name.page',
  );
};

const supportLoader = async (page: Page, errors: string[], appPort: number) => {
  // const page = await browser.newPage();
  await page.goto(`http://localhost:${appPort}/three/user`, {
    waitUntil: ['domcontentloaded'],
  });
  await Promise.all([page.waitForSelector('.user-layout')]);
  const userLayout = await page.$('.user-layout');
  const text = await page.evaluate(el => {
    console.info(el);
    return el?.textContent;
  }, userLayout);
  expect(text).toBe('user layout');
  expect(errors.length).toBe(0);
};

const supportThrowError = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  const response = await page.goto(
    `http://localhost:${appPort}/three/error/response?type=throw_error`,
    {
      waitUntil: ['domcontentloaded'],
    },
  );
  expect(response?.status()).toBe(200);
  await page.waitForSelector('.error-content');
  const errorStatusElm = await page.$('.error-content');
  const text = await page.evaluate(el => el?.textContent, errorStatusElm);
  expect(text?.includes('500')).toBeFalsy();
  expect(text?.includes("can't found the user")).toBeTruthy();
};

const supportThrowResponse = async (
  page: Page,
  errors: string[],
  appPort: number,
  code: number,
) => {
  const response = await page.goto(
    `http://localhost:${appPort}/three/error/response?type=throw_response&code=${code}`,
    {
      waitUntil: ['domcontentloaded'],
    },
  );
  expect(response?.status()).toBe(200);
  await page.waitForSelector('.response-status');
  const errorStatusElm = await page.$('.response-status');
  const text = await page.evaluate(el => el?.textContent, errorStatusElm);
  expect(text?.includes(`${code}`)).toBeTruthy();
  const errorContentElm = await page.$('.response-content');
  const text1 = await page.evaluate(el => el?.textContent, errorContentElm);
  expect(text1?.includes("can't found the user")).toBeTruthy();
  expect(errors.length).toBe(0);
};

const supportReturnResponse = async (
  page: Page,
  errors: string[],
  appPort: number,
  code: number,
) => {
  const response = await page.goto(
    `http://localhost:${appPort}/three/error/response?type=return_response&code=${code}`,
    {
      waitUntil: ['domcontentloaded'],
    },
  );
  expect(response?.status()).toBe(code);
  await page.waitForSelector('.response-content');
  const el = await page.$('.response-content');
  const text = await page.evaluate(el => el?.textContent, el);
  expect(text?.includes('Response Page')).toBeTruthy();
};

const supportLoaderForSSRAndCSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three`, {
    waitUntil: ['domcontentloaded'],
  });
  await page.waitForSelector('.user-btn');
  const button = await page.$('.user-btn');
  await button?.click();
  await page.waitForSelector('.user-layout');
  const userLayout = await page.$(`.user-layout`);
  const text = await page.evaluate(el => {
    return el?.textContent;
  }, userLayout);
  expect(text).toBe('user layout');
  expect(errors.length).toBe(0);
};

const supportLoaderForCSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/four/user/123`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('user layout')).toBeTruthy();
  expect(errors.length).toBe(0);
};

const supportRedirectForSSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three/redirect`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('profile page')).toBeTruthy();
  expect(errors.length).toBe(0);
};

const supportRedirectForCSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three/user`, {
    waitUntil: ['networkidle0'],
  });
  await page.click('.redirect-btn');
  await page.waitForSelector('.user-profile');
  const rootElm = await page.$('.user-profile');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('profile page')).toBeTruthy();
  expect(errors.length).toBe(0);
};

const supportDefineInit = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://127.0.0.1:${appPort}/four/user`, {
    waitUntil: ['networkidle0'],
  });
  const isBrowser = await page.evaluate(() => (window as any).__isBrowser);

  expect(isBrowser).toBeTruthy();
  expect(errors.length).toBe(0);
};

const supportClientLoader = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/three`, {
    waitUntil: ['networkidle0'],
  });
  await Promise.all([
    page.click('.client-loader-btn'),
    page.waitForSelector('.client-loader-layout'),
  ]);
  const clientLoaderLayout = await page.$('.client-loader-layout');
  const text = await page.evaluate(el => el?.textContent, clientLoaderLayout);
  expect(text).toBe('layout from client loader');

  await page.waitForSelector('.client-loader-page', { timeout: 5000 });
  const clientLoaderPage = await page.$('.client-loader-page');
  const text1 = await page.evaluate(el => el?.textContent, clientLoaderPage);
  expect(text1?.includes('page from server loader')).toBeTruthy();
  expect(errors.length).toBe(0);
};

const supportCatchAll = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/four/user/1234/1234`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('root layout')).toBeTruthy();
  expect(text?.includes('catch all')).toBeTruthy();
  expect(errors.length).toEqual(0);
};

const getStaticJSDir = (appDir: string) =>
  path.join(appDir, './dist/static/js');

const getHtmlDir = (appDir: string) => path.join(appDir, './dist/html');

const getEntryFile = async (staticJSDir: string) => {
  const files = await fs.readdir(staticJSDir);
  return files.find(file => /^three(\.\w+)?\.js$/.test(file));
};

const testRouterPlugin = async (appDir: string) => {
  const htmlDir = getHtmlDir(appDir);
  const threeHtmlPath = path.join(htmlDir, 'three', 'index.html');
  const threeHtml = await fs.readFile(threeHtmlPath);
  expect(threeHtml.includes('three.')).toBe(true);
  expect(!threeHtml.includes('four.')).toBe(true);
};

const hasHashCorrectly = async (appDir: string) => {
  const staticJSDir = getStaticJSDir(appDir);
  const entryFile = await getEntryFile(staticJSDir);
  expect(entryFile).toBeDefined();

  const htmlDir = getHtmlDir(appDir);
  const threeHtmlPath = path.join(htmlDir, 'three', 'index.html');
  const threeHtml = (await fs.readFile(threeHtmlPath)).toString();

  const threeUserFiles = await fs.readdir(
    path.join(staticJSDir, 'async/three_user'),
  );
  const testFile = threeUserFiles.find(
    file => file.startsWith('page') && file.endsWith('.js'),
  );

  const matched = testFile!.match(/page\.(\w+)\.js$/);
  expect(matched).toBeDefined();
  const hash = matched![1];
  expect(threeHtml.includes(hash)).toBe(true);
};

const supportActionInCSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  await page.goto(`http://localhost:${appPort}/four/user/profile`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  await page.click('.action-btn');
  await page.waitForSelector('.data-wrapper');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('profile page')).toBeTruthy();
  expect(text?.includes('modern_four_action')).toBeTruthy();
};

const supportActionInSSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  expect(errors.length).toBe(0);
  await page.goto(`http://localhost:${appPort}/three/user/1234/profile`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  await page.click('.action-btn');
  await page.waitForSelector('.data-wrapper');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('modern_three_action')).toBeTruthy();
};

const supportShouldRevalidateInSSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  expect(errors.length).toBe(0);
  await page.goto(`http://localhost:${appPort}/three`, {
    waitUntil: ['networkidle0'],
  });
  await page.click('.should-revalidate');
  await page.waitForSelector('.item-page', { timeout: 5000 });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('param is 111')).toBeTruthy();
  await page.click('.should-not-revalidate');
  await page.waitForSelector('.item-page', { timeout: 5000 });
  const text1 = await page.evaluate(el => el?.textContent, rootElm);
  expect(text1?.includes('param is 111')).toBeTruthy();
};

const supportShouldRevalidateInCSR = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  expect(errors.length).toBe(0);
  await page.goto(`http://localhost:${appPort}/four/user/111`, {
    waitUntil: ['networkidle0'],
  });
  const rootElm = await page.$('#root');
  const text = await page.evaluate(el => el?.textContent, rootElm);
  expect(text?.includes('param is 111')).toBeTruthy();
  await page.click('.should-not-revalidate');
  await new Promise(resolve => setTimeout(resolve, 400));
  const text1 = await page.evaluate(el => el?.textContent, rootElm);
  expect(text1?.includes('param is 111')).toBeTruthy();
};

const supportPrefetchInIntentMode = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  expect(errors.length).toBe(0);
  await page.goto(`http://localhost:${appPort}/three`, {
    waitUntil: ['networkidle0'],
  });
  let isRequestJS = false;
  let isRequestProfileLayoutData = false;
  let isRequestProfilePageData = false;
  page.on('request', interceptedRequest => {
    if (
      /three_user\/profile\/layout\.([^.]*\.)?js/.test(interceptedRequest.url())
    ) {
      isRequestJS = true;
    }

    if (
      interceptedRequest
        .url()
        .includes('user/profile?__loader=three_user%2Fprofile%2Flayout')
    ) {
      isRequestProfileLayoutData = true;
    }

    if (
      interceptedRequest
        .url()
        .includes('user/profile?__loader=three_user%2Fprofile%2Fpage')
    ) {
      isRequestProfilePageData = true;
    }
  });

  await page.waitForSelector('.user-profile-btn');

  await page.hover('.user-profile-btn');
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(isRequestJS).toBe(true);
  expect(isRequestProfileLayoutData).toBe(true);
  expect(isRequestProfilePageData).toBe(true);
};

const supportPrefetchWithShouldRevalidate = async (
  page: Page,
  errors: string[],
  appPort: number,
) => {
  expect(errors.length).toBe(0);
  await page.goto(`http://localhost:${appPort}/three/user/222`, {
    waitUntil: ['networkidle0'],
  });
  // make sure assets have been loaded
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.click('.root-btn');
  await new Promise(resolve => setTimeout(resolve, 400));

  let isRequestLayoutData = false;
  let isRequestPageData = false;
  page.on('request', interceptedRequest => {
    if (interceptedRequest.url().includes('__loader=three_user%2Flayout')) {
      isRequestLayoutData = true;
    }

    if (
      interceptedRequest.url().includes('__loader=three_user%2F%28id%29%2Fpage')
    ) {
      isRequestPageData = true;
    }
  });
  await page.hover('.should-not-revalidate');
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(isRequestLayoutData).toBe(true);
  expect(isRequestPageData).toBe(false);
};

describe('dev with rspack', () => {
  let app: unknown;
  let appPort: number;
  let page: Page;
  let browser: Browser;
  const errors: string[] = [];
  beforeAll(async () => {
    appPort = await getPort();
    app = await launchApp(
      appDir,
      appPort,
      {},
      {
        BUNDLER: 'rspack',
      },
    );
    browser = await puppeteer.launch(launchOptions as any);
    page = await browser.newPage();
    page.on('pageerror', error => {
      errors.push(error.message);
    });
  });

  describe('self control route', () => {
    test('should render correctly', async () =>
      renderSelfRoute(page, errors, appPort));
  });

  describe('nested routes', () => {
    test('basic usage', async () => supportNestedRoutes(page, errors, appPort));

    test('dynamic path', async () =>
      supportDynamaicPaths(page, errors, appPort));

    test('support catch all', async () =>
      supportCatchAll(page, errors, appPort));

    test('no layout dir', async () =>
      supportNoLayoutDir(page, errors, appPort));

    test('pathless layout', async () =>
      supportPathLessLayout(page, errors, appPort));

    test('path without layout', async () =>
      supportPathWithoutLayout(page, errors, appPort));

    test('support load chunks Parallelly', supportLoadChunksParallelly);

    test('support handle config', async () =>
      supportHandleConfig(page, appPort));

    test('support handle loader error', async () =>
      supportHandleLoaderError(page, errors, appPort));
  });

  describe('loader', () => {
    test('support loader', async () => supportLoader(page, errors, appPort));
    test('support loader for ssr and csr', async () =>
      supportLoaderForSSRAndCSR(page, errors, appPort));

    test('support loader for csr', () =>
      supportLoaderForCSR(page, errors, appPort));
    test('support redirect for ssr', () =>
      supportRedirectForSSR(page, errors, appPort));
    test('support redirect for csr', () =>
      supportRedirectForCSR(page, errors, appPort));
    test('support throw error', async () =>
      supportThrowError(page, errors, appPort));
    test('support throw response', async () => {
      await supportThrowResponse(page, errors, appPort, 500);
      await supportThrowResponse(page, errors, appPort, 200);
    });
    test('support return response', async () => {
      await supportReturnResponse(page, errors, appPort, 500);
      await supportReturnResponse(page, errors, appPort, 200);
    });
  });

  describe('global configuration', () => {
    test('support app init', async () =>
      await supportDefineInit(page, errors, appPort));
  });

  describe('router plugin', () => {
    test('basic usage', async () => {
      await testRouterPlugin(appDir);
    });
  });

  describe('client data', () => {
    test('support client data', async () => {
      await supportClientLoader(page, errors, appPort);
    });
  });

  describe('support action', () => {
    test('support action in CSR', async () => {
      await supportActionInCSR(page, errors, appPort);
    });
    test('support action in SSR', async () => {
      await supportActionInSSR(page, errors, appPort);
    });
  });

  describe('prefetch', () => {
    test('suppport prefetch', async () => {
      await supportPrefetchInIntentMode(page, errors, appPort);
    });
    test('support prefetch with shouldRevalidate', async () => {
      await supportPrefetchWithShouldRevalidate(page, errors, appPort);
    });
  });

  describe('support shouldRevalidate', () => {
    test('support shouldRevalidate in ssr', async () => {
      await supportShouldRevalidateInSSR(page, errors, appPort);
    });
    test('support shouldRevalidate in csr', async () => {
      await supportShouldRevalidateInCSR(page, errors, appPort);
    });
  });

  afterAll(async () => {
    await killApp(app);
    await page.close();
    await browser.close();
  });
});

describe('build with rspack', () => {
  let appPort: number;
  let app: unknown;
  let page: Page;
  let browser: Browser;
  const errors: string[] = [];
  beforeAll(async () => {
    appPort = await getPort();
    const buildResult = await modernBuild(appDir, [], {
      env: {
        BUNDLER: 'rspack',
      },
    });

    // log in case for test failed by build failed
    if (buildResult.code !== 0) {
      console.log('ut test build failed, err: ', buildResult.stderr);
      console.log('ut test build failed, output: ', buildResult.stdout);
    }
    app = await modernServe(appDir, appPort, {
      cwd: appDir,
    });
    browser = await puppeteer.launch(launchOptions as any);
    page = await browser.newPage();
    page.on('pageerror', error => {
      errors.push(error.message);
    });
  });

  describe('self control route', () => {
    test('should render correctly', async () =>
      renderSelfRoute(page, errors, appPort));
  });

  describe('nested routes', () => {
    test('basic usage', async () => supportNestedRoutes(page, errors, appPort));

    test('dynamic path', async () =>
      supportDynamaicPaths(page, errors, appPort));

    test('support catch all', async () =>
      supportCatchAll(page, errors, appPort));

    test('no layout dir', async () =>
      supportNoLayoutDir(page, errors, appPort));

    test('pathless layout', async () =>
      supportPathLessLayout(page, errors, appPort));

    test('path without layout', async () =>
      supportPathWithoutLayout(page, errors, appPort));

    test('support handle loader error', async () =>
      supportHandleLoaderError(page, errors, appPort));
  });

  describe('loader', () => {
    test('support loader', async () => supportLoader(page, errors, appPort));
    test('support loader for ssr and csr', async () =>
      supportLoaderForSSRAndCSR(page, errors, appPort));

    test('support loader for csr', () =>
      supportLoaderForCSR(page, errors, appPort));
    test('support redirect for ssr', () =>
      supportRedirectForSSR(page, errors, appPort));
    test('support redirect for csr', () =>
      supportRedirectForCSR(page, errors, appPort));
    test('support throw error', async () =>
      supportThrowError(page, errors, appPort));
    test('support throw response', async () => {
      await supportThrowResponse(page, errors, appPort, 500);
      await supportThrowResponse(page, errors, appPort, 200);
    });
    test('support return response', async () => {
      await supportReturnResponse(page, errors, appPort, 500);
      await supportReturnResponse(page, errors, appPort, 200);
    });
  });

  describe('global configuration', () => {
    test('support app init', async () =>
      await supportDefineInit(page, errors, appPort));
  });

  describe('router plugin', () => {
    test('basic usage', async () => {
      await testRouterPlugin(appDir);
    });
    test('the correct hash should be included in the bundler-runtime chunk', async () =>
      hasHashCorrectly(appDir));
  });

  describe('client data', () => {
    test('support client data', async () => {
      await supportClientLoader(page, errors, appPort);
    });
  });

  describe('support action', () => {
    test('support action in CSR', async () => {
      await supportActionInCSR(page, errors, appPort);
    });
    test('support action in SSR', async () => {
      await supportActionInSSR(page, errors, appPort);
    });
  });

  describe('prefetch', () => {
    test('suppport prefetch', async () => {
      await supportPrefetchInIntentMode(page, errors, appPort);
    });
    test('support prefetch with shouldRevalidate', async () => {
      await supportPrefetchWithShouldRevalidate(page, errors, appPort);
    });
  });

  describe('support shouldRevalidate', () => {
    test('support shouldRevalidate in ssr', async () => {
      await supportShouldRevalidateInSSR(page, errors, appPort);
    });
    test('support shouldRevalidate in csr', async () => {
      await supportShouldRevalidateInCSR(page, errors, appPort);
    });
  });

  afterAll(async () => {
    await killApp(app);
    await page.close();
    await browser.close();
  });
});

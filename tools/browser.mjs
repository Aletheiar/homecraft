import { chromium } from 'playwright';

// Native desktop rendering locally; software rendering in Linux CI.
// Set HOMECRAFT_SOFTWARE_GPU=1 to reproduce CI rendering on a desktop.
export async function launchBrowser(options = {}) {
  const software = process.env.HOMECRAFT_SOFTWARE_GPU === '1' || process.platform === 'linux';
  const gpu = software
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    : ['--use-angle=' + (process.platform === 'darwin' ? 'metal' : 'd3d11'), '--enable-gpu', '--ignore-gpu-blocklist'];
  const { args = [], viewMode = '3d', ...rest } = options;
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'chrome';
  let browser;
  try { browser = await chromium.launch({ ...rest, channel, args: [...gpu, ...args] }); }
  catch (error) {
    if (process.env.PLAYWRIGHT_CHANNEL) throw error;
    browser = await chromium.launch({ ...rest, args: [...gpu, ...args] });
  }
  // Scene suites exercise an explicit visitor choice. Reading/default-entry
  // suites pass viewMode:null so they observe the real device-based default.
  if (viewMode) {
    const preference = ({ mode }) => { try { sessionStorage.setItem('homecraft.view-mode.v1', mode); } catch {} };
    const context = browser.newContext.bind(browser), page = browser.newPage.bind(browser);
    browser.newContext = async options => {
      const result = await context(options); await result.addInitScript(preference, { mode: viewMode }); return result;
    };
    browser.newPage = async options => {
      const result = await page(options); await result.addInitScript(preference, { mode: viewMode }); return result;
    };
  }
  return browser;
}

// Functional checks advance the real opening controller on a fixed simulation
// clock. A software renderer may need far more wall time than animation time;
// its throughput must not decide whether the opening can reach its end state.
export async function finishOpening(page) {
  await page.evaluate(() => {
    const h = window.__home;
    if (!h?.rig) throw new Error('The camera is not initialized.');
    for (let frame = 0; frame < 600 && h.rig.introActive; frame++) {
      h.rig.update(1 / 60, h.player);
      h.extras.update?.(1 / 60);
    }
    if (h.rig.introActive) throw new Error('The opening camera did not finish within ten simulated seconds.');
  });
}

// Follow the visible controls after auxiliary actions moved into the drawer.
// Geometry suites may enter again from an existing hall position: return to
// the courtyard first, where the contextual entry action is available.
export async function activateSceneControl(page, selector) {
  const control = page.locator(selector);
  if (selector === '#enter-button' && !await control.isVisible()) {
    await activateSceneControl(page, '#return-button');
  }
  if (!await control.isVisible()) {
    const tools = page.locator('#scene-tools');
    if (!await tools.evaluate(element => element.open)) await tools.locator('summary').click();
  }
  await control.click();
}

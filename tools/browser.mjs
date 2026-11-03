import { chromium } from 'playwright';

// Native desktop rendering locally; software rendering in Linux CI.
// Set HOMECRAFT_SOFTWARE_GPU=1 to reproduce CI rendering on a desktop.
export async function launchBrowser(options = {}) {
  const software = process.env.HOMECRAFT_SOFTWARE_GPU === '1' || process.platform === 'linux';
  const gpu = software
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    : ['--use-angle=' + (process.platform === 'darwin' ? 'metal' : 'd3d11'), '--enable-gpu', '--ignore-gpu-blocklist'];
  const { args = [], ...rest } = options;
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'chrome';
  try { return await chromium.launch({ ...rest, channel, args: [...gpu, ...args] }); }
  catch (error) {
    if (process.env.PLAYWRIGHT_CHANNEL) throw error;
    return chromium.launch({ ...rest, args: [...gpu, ...args] });
  }
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

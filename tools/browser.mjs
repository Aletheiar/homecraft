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

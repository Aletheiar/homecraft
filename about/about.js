import { PROFILE } from './profile.js';
import { chargeAndLeave, markArrival, revealArrival } from '../world/portal-transition.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function element(tag, attributes, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (parent) parent.append(node);
  return node;
}

// Monochrome 24×24 marks drawn in the badge's ink color. GitHub, Zhihu and Steam are
// Simple Icons paths (CC0 1.0); Linux Do is redrawn from the site's own favicon.
// Accounts without a mark fall back to the first character of their platform name.
const ICONS = {
  github(svg) {
    element('path', { d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' }, svg);
  },
  zhihu(svg) {
    element('path', { d: 'M5.721 0C2.251 0 0 2.25 0 5.719V18.28C0 21.751 2.252 24 5.721 24h12.56C21.751 24 24 21.75 24 18.281V5.72C24 2.249 21.75 0 18.281 0zm1.964 4.078c-.271.73-.5 1.434-.68 2.11h4.587c.545-.006.445 1.168.445 1.171H9.384a58.104 58.104 0 01-.112 3.797h2.712c.388.023.393 1.251.393 1.266H9.183a9.223 9.223 0 01-.408 2.102l.757-.604c.452.456 1.512 1.712 1.906 2.177.473.681.063 2.081.063 2.081l-2.794-3.382c-.653 2.518-1.845 3.607-1.845 3.607-.523.468-1.58.82-2.64.516 2.218-1.73 3.44-3.917 3.667-6.497H4.491c0-.015.197-1.243.806-1.266h2.71c.024-.32.086-3.254.086-3.797H6.598c-.136.406-.158.447-.268.753-.594 1.095-1.603 1.122-1.907 1.155.906-1.821 1.416-3.6 1.591-4.064.425-1.124 1.671-1.125 1.671-1.125zM13.078 6h6.377v11.33h-2.573l-2.184 1.373-.401-1.373h-1.219zm1.313 1.219v8.86h.623l.263.937 1.455-.938h1.456v-8.86z' }, svg);
  },
  steam(svg) {
    element('path', { d: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z' }, svg);
  },
  linuxdo(svg) {
    const clip = element('clipPath', { id: 'account-badge-linuxdo' }, element('defs', {}, svg));
    element('circle', { cx: 12, cy: 12, r: 9.4 }, clip);
    const bands = element('g', { 'clip-path': 'url(#account-badge-linuxdo)', fill: 'currentColor' }, svg);
    element('rect', { x: 0, y: 2, width: 24, height: 6 }, bands);
    element('rect', { x: 0, y: 16, width: 24, height: 6 }, bands);
    element('circle', { cx: 12, cy: 12, r: 9.4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.1 }, svg);
  },
  // The 水源 community mark, taken from the supplied logo. Its drawing is a 120×120 square,
  // scaled here to 21.6 units and centred inside the 24×24 box.
  shuiyuan(svg) {
    const mark = element('g', { transform: 'scale(.2)' }, svg);
    element('path', { d: 'M104.81,119.89a9.93,9.93,0,0,1-4-.87l-.15-.07-7.71-4a9.7,9.7,0,0,0-6.74-.85,21.33,21.33,0,0,0-3.39,1.12l-.15.07a57.62,57.62,0,0,1-24.8,4.26,62,62,0,0,1-39.65-17.35A58,58,0,0,1,.47,63.09a60.47,60.47,0,0,1,6-29,2.67,2.67,0,1,1,4.8,2.33A55.07,55.07,0,0,0,5.81,62.85C7,90.49,29.56,112.57,58.2,114.21a52.41,52.41,0,0,0,22.5-3.89A26.27,26.27,0,0,1,85,108.9a15,15,0,0,1,10.46,1.3l7.62,4a3.25,3.25,0,0,0,3,.07,1.75,1.75,0,0,0,.6-1.59L105,99A14.38,14.38,0,0,1,107,87.68l.2-.32a51.34,51.34,0,0,0,7.14-31.14c-2.18-28.63-25-50.46-53.08-50.77A54.84,54.84,0,0,0,24.52,19,2.67,2.67,0,0,1,21,15,60.18,60.18,0,0,1,61.35.11c30.87.34,56,24.29,58.34,55.71a56.41,56.41,0,0,1-7.85,34.23l-.27.45A9.06,9.06,0,0,0,110.21,98l0,.25,1.7,14.13a7,7,0,0,1-2.93,6.32A7.45,7.45,0,0,1,104.81,119.89Z' }, mark);
    element('circle', { cx: 22.57, cy: 47.8, r: 5.2 }, mark);
    element('path', { d: 'M49,51.56a5.35,5.35,0,0,1-1.55,0c-.53,0-1.07-.05-1.6-.11a22.74,22.74,0,0,1-3.15-.61,24.06,24.06,0,0,1-5.91-2.51l-.27-.16c-5-3-8.79-8.11-8.47-14.19.29-5.45,4.71-11.31,10.68-10.51a7.42,7.42,0,0,1,4.09,2A6.28,6.28,0,0,1,44.52,30,19.92,19.92,0,0,1,44,34.51,29.35,29.35,0,0,0,43,41a14,14,0,0,0,1.28,6.29A10.43,10.43,0,0,0,48.12,51Z' }, mark);
    element('path', { d: 'M47.76,58.24c.92-1-.08-2,1.26-1.68a39.55,39.55,0,0,1,10.63,3.63c3.83,2,7.28,4.74,11.39,6.21a17.82,17.82,0,0,0,3.74.94c3.83.52,7.69-.37,11.53-.82a36,36,0,0,1,13.21.68c1.39.37,3.63.84,4.31,2.33.52,1.13-.56,2.82-.9,3.86-.2.59.53.46-.61,2.59-.74,1.39-4.1,5.43-5.67,5.28L60.19,77.71a3.87,3.87,0,0,1-1.52-.48l-14.38-8a3.92,3.92,0,0,1-1-6.05Z' }, mark);
    element('path', { d: 'M20.24,81.82c-1.61-2.81-3.09-5.92-3.09-9.23,0-3.13,1.9-5.87,4-8a27.85,27.85,0,0,1,15-7.83,26.86,26.86,0,0,1,4.11-.4c1.41,0,2.8-.19,4.22-.18a23.18,23.18,0,0,1,9.05,1.7,32.88,32.88,0,0,1,8.81,6C66.2,67.39,69.69,71.37,74,74.32a31.4,31.4,0,0,0,17.73,5.45,13.36,13.36,0,0,0,8.46-2.89A9.24,9.24,0,0,0,102,74.94a13.41,13.41,0,0,0,2-4.83c.15,2.38-.78,5.31-1.61,7.51A44.15,44.15,0,0,1,99,84.45,51.62,51.62,0,0,1,87.33,97.9C78.78,105,54,109.54,36.8,98.53,24.08,90.38,20.87,82.92,20.24,81.82Z' }, mark);
  },
};

function createBadge(id, platform) {
  const badge = document.createElement('span');
  badge.className = `account-badge account-badge--${id}`;
  badge.setAttribute('aria-hidden', 'true');
  const icon = ICONS[id];
  if (!icon) {
    badge.classList.add('account-badge--text');
    badge.textContent = platform.slice(0, 1);
    return badge;
  }
  const svg = element('svg', { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'currentColor', focusable: 'false' }, null);
  icon(svg);
  badge.append(svg);
  return badge;
}

export function renderProfile(profile = PROFILE) {
  document.title = `关于我 · ${profile.displayName}`;
  document.querySelector('meta[name="description"]').content = `${profile.displayName} 的个人主页与社交账号。`;
  document.querySelector('[data-profile-name]').textContent = profile.displayName;
  document.querySelector('[data-profile-footer]').textContent = profile.displayName;
  const bio = document.querySelector('[data-profile-bio]');
  bio.textContent = profile.bio;
  bio.hidden = !profile.bio.trim();

  const list = document.querySelector('[data-profile-accounts]');
  list.replaceChildren();
  for (const account of profile.accounts) {
    const item = document.createElement('li');
    item.dataset.platform = account.id;
    const row = document.createElement(account.href ? 'a' : 'div');
    row.className = 'account-row';
    if (account.href) {
      row.href = account.href;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
    }
    const badge = createBadge(account.id, account.platform);
    const identity = document.createElement('span');
    identity.className = 'account-identity';
    const platform = document.createElement('span');
    platform.className = 'account-platform';
    platform.textContent = account.platform;
    const name = document.createElement('span');
    name.className = 'account-name';
    name.textContent = account.name;
    identity.append(platform, name);
    const action = document.createElement('span');
    action.className = 'account-action';
    action.textContent = account.href ? '↗' : '链接待补充';
    if (account.href) {
      action.setAttribute('aria-hidden', 'true');
      const hint = document.createElement('span');
      hint.className = 'visually-hidden';
      hint.textContent = '（在新标签页打开）';
      identity.append(hint);
    }
    row.append(badge, identity, action);
    item.append(row);
    list.append(item);
  }
}

function initialize() {
  renderProfile();
  revealArrival();
  let leaving = false;
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    document.querySelector('#portal-ripple')?.classList.remove('charging', 'opening');
  });
  for (const link of document.querySelectorAll('[data-return-hub]')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (leaving) return;
      leaving = true;
      chargeAndLeave(() => {
        markArrival();
        location.assign(link.href);
      });
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();

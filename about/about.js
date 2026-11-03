import { PROFILE } from './profile.js';
import { chargeAndLeave, markArrival, revealArrival } from '../world/portal-transition.js';

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
    const badge = document.createElement('span');
    badge.className = `account-badge account-badge--${account.id}`;
    badge.textContent = { github: 'GH', zhihu: '知', shuiyuan: '水' }[account.id] || account.platform.slice(0, 1);
    badge.setAttribute('aria-hidden', 'true');
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

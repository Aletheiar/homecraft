import { FRIEND_LINKS } from './list.js';
import { chargeAndLeave, markArrival, revealArrival } from '../world/portal-transition.js';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function renderLinks(links = FRIEND_LINKS) {
  const list = document.querySelector('[data-friend-links]');
  const count = document.querySelector('[data-friend-count]');
  const note = document.querySelector('[data-links-note]');
  list.replaceChildren();

  const entries = links.filter(link => link && typeof link.name === 'string' && typeof link.url === 'string');
  count.textContent = entries.length ? `${entries.length} 个站点` : '';

  if (!entries.length) {
    const item = document.createElement('li');
    const empty = document.createElement('p');
    empty.className = 'empty-note';
    empty.textContent = '目录暂未收录站点。';
    item.append(empty);
    list.append(item);
  }

  for (const entry of entries) {
    const item = document.createElement('li');
    const card = document.createElement('a');
    card.className = 'friend-card';
    card.href = entry.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const name = document.createElement('span');
    name.className = 'friend-name';
    const label = document.createElement('span');
    label.textContent = entry.name;
    name.append(label);
    if (entry.sample) {
      const flag = document.createElement('span');
      flag.className = 'friend-flag';
      flag.textContent = '示例';
      name.append(flag);
    }

    const description = document.createElement('span');
    description.className = 'friend-note';
    description.textContent = entry.note || '';

    const host = document.createElement('span');
    host.className = 'friend-host';
    host.textContent = hostOf(entry.url);

    const action = document.createElement('span');
    action.className = 'friend-action';
    action.setAttribute('aria-hidden', 'true');
    action.textContent = '↗';

    const hint = document.createElement('span');
    hint.className = 'visually-hidden';
    hint.textContent = '（在新标签页打开）';

    card.append(name, description, host, action, hint);
    item.append(card);
    list.append(item);
  }

  // The footer note presents the sample links as samples; drop it once every
  // entry is a real friend, so the page never claims a relationship it lacks.
  if (note) note.hidden = !entries.some(entry => entry.sample);
}

function initialize() {
  renderLinks();
  revealArrival();
  let leaving = false;
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    // Coming back from the BFCache restores the page as the veil left it.
    document.querySelector('#portal-ripple')?.remove();
    document.documentElement.classList.remove('arriving');
  });
  for (const link of document.querySelectorAll('[data-return-hub]')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (leaving) return;
      leaving = true;
      markArrival();
      chargeAndLeave(() => location.assign(link.href));
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();

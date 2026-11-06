// Shared DOM controls for the courtyard and its interior rooms.
// The engine still owns the map, weather, sound and camera buttons.
export function mountInterface({ player, rig, room = false }) {
  const tools = document.querySelector('#scene-tools');
  const content = document.querySelector('#scene-tools-content');
  const summary = tools.querySelector('summary');
  const views = content.querySelector('.tools-views');
  const enter = document.querySelector('#enter-button');
  const overview = document.querySelector('#overview-button');
  const back = document.querySelector('#return-button');
  views.append(overview, back);
  content.querySelector('.tools-controls').append(document.querySelector('#corner'), document.querySelector('#weatherMenu'));
  content.querySelector('.tools-map').append(document.querySelector('#minimap'));
  content.append(document.querySelector('.model-credit'));
  const reading = document.querySelector('.reading-link');
  const textURL = new URL(location.href);
  textURL.searchParams.set('plain', '1');
  textURL.searchParams.delete('view');
  textURL.searchParams.delete('return');
  reading.href = textURL.pathname + textURL.search;

  function sync() {
    summary.setAttribute('aria-expanded', String(tools.open));
    document.body.classList.toggle('tools-open', tools.open);
  }
  function close(restoreFocus = false) {
    if (!tools.open) return false;
    if (!document.querySelector('#weatherMenu').hidden) document.querySelector('#environmentDone').click();
    tools.open = false;
    sync();
    if (restoreFocus) summary.focus({ preventScroll: true });
    return true;
  }
  tools.addEventListener('toggle', () => {
    sync();
    if (tools.open) player.cancel();
  });
  content.querySelector('.tools-close').addEventListener('click', () => close(true));
  for (const action of [overview, back]) action.addEventListener('click', () => close());
  content.querySelector('.tools-map').addEventListener('click', event => {
    if (event.target.matches('canvas, .expand')) close();
  });
  // Native summary/link activation must not also trigger scene shortcuts.
  document.querySelector('.site-utilities').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  });
  document.addEventListener('pointerdown', event => {
    if (!tools.contains(event.target)) close();
  });
  window.addEventListener('pageshow', () => close());
  sync();
  return {
    blocksInput: () => tools.open,
    dismiss: () => close(true),
    update() {
      const inside = Math.abs(player.pos.x) < 17 && Math.abs(player.pos.z) < 17 && player.y < 8;
      const hidden = room || inside && !rig.showcaseActive;
      if (enter.hidden !== hidden) enter.hidden = hidden;
    },
  };
}

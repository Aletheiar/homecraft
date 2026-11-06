export default {
  name: '玻璃金字塔 · 本地预览',
  // 64×64 PNG, 4px arms, ≤ 18000 bytes. docs/avatar.md
  skin: '',
  languages: ['zh'],
  // weather: { city: '上海', cityEn: 'Shanghai', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' },
  weather: null,
  dock: ['welcome', 'blog', 'works', 'writing', 'friends', 'about'],
  dockMode: 'content',
  // Scene portals activate by walking through their light; cards remain clickable.
  keyboardInteraction: false,
  // The friends door opens a local directory page instead of the shared menu.
  portalMenu: false,
  mailbox: { endpoint: '', email: '', turnstileSitekey: '' },
  badge: true,
};

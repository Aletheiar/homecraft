// Import-map selection happens before the engine's first module is evaluated.
(() => {
  const space = new URLSearchParams(location.search).get('space');
  const room = ['library', 'studio'].includes(space);
  const map = document.createElement('script');
  map.type = 'importmap';
  map.textContent = JSON.stringify({ imports: {
    three: './vendor/three/three.module.min.js', '@engine/': './engine/',
    '@world/': room ? './world/rooms/' : './world/',
    '@config': room ? './world/rooms/config.js' : './home.config.js',
  } });
  document.currentScript.after(map);
})();

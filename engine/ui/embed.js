// The owner supplies the URL. Restrict it to real web pages; remote embedded
// scripts cannot navigate the top page. The header link remains usable if a remote
// site refuses framing (iframe load/error cannot reliably detect that).
export function pageURL(value) {
  try {
    const url = new URL(value, location.href);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}
export function mountEmbed(body, url, title) {
  body.replaceChildren();
  body.className = 'body page embed';
  const frame = document.createElement('iframe');
  frame.src = url.href; frame.title = title;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  const sandbox = ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups', 'allow-popups-to-escape-sandbox'];
  // Trusted pages belonging to this site may start an OAuth flow on a user
  // click. Remote embeds retain the restriction on top-level navigation.
  if (url.origin === location.origin) sandbox.push('allow-top-navigation-by-user-activation');
  frame.setAttribute('sandbox', sandbox.join(' '));
  frame.setAttribute('allow', 'fullscreen');
  body.append(frame);
}

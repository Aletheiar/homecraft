// Accept playlist IDs and official desktop/mobile playlist URLs only.
export function neteasePlaylist(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  let id = value;
  if (!/^[1-9]\d{0,19}$/.test(value)) {
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || !['music.163.com', 'm.music.163.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
      const route = url.hash.startsWith('#/') ? new URL(url.hash.slice(1), url.origin) : url;
      if (route.pathname !== '/playlist' || route.searchParams.getAll('id').length !== 1) return null;
      id = route.searchParams.get('id');
    } catch { return null; }
  }
  if (!/^[1-9]\d{0,19}$/.test(id)) return null;
  return { id, url: `https://music.163.com/playlist?id=${id}`, embed: `https://music.163.com/outchain/player?type=0&id=${id}&auto=0&height=430` };
}

export const DEFAULT_PLAYLIST = '18559092586';

import { DEFAULT_PLAYLIST, neteasePlaylist } from './music-source.js';

// The engine clones card bodies. Keep media in a persistent sibling, so closing
// or revisiting a card neither reloads a remote player nor replaces local audio.
export function createMusicStation(panel) {
  const host = document.createElement('section');
  host.className = 'music-station'; host.dataset.panelContent = ''; host.hidden = true; host.setAttribute('aria-label', '庭院音乐台');
  host.innerHTML = `
    <p class="card-kicker">COURTYARD / MUSIC</p>
    <p class="music-intro">选一张唱片，让音乐陪你在庭院里散步。</p>
    <div class="music-sleeve" aria-hidden="true"><span class="music-disc"></span><span>庭院<br>唱片集<small>SIDE A · TAKE YOUR TIME</small></span></div>
    <form class="music-source-form">
      <label>网易云歌单链接或 ID<input data-music-playlist type="text" inputmode="url" autocomplete="off" spellcheck="false"></label>
      <div class="music-actions"><button class="space-link" data-music-load type="submit">载入歌单</button><a data-music-original target="_blank" rel="noopener noreferrer">在网易云打开 ↗</a></div>
    </form>
    <p data-music-error role="alert" class="music-error"></p>
    <div data-music-remote hidden></div>
    <details class="music-local"><summary>播放本地 MP3 / 音频</summary>
      <label class="music-file-label">选择音乐文件<input data-music-files type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" multiple></label>
      <p data-music-track class="music-track">还没有选择本地音乐</p>
      <audio id="courtyard-audio" controls preload="none" aria-label="本地音乐播放器"></audio>
      <div class="music-actions"><button data-music-prev type="button">上一首</button><button data-music-next type="button">下一首</button></div>
      <ol data-music-queue class="music-queue"></ol>
    </details>
    <div class="music-footer"><span data-music-status role="status">等待选曲</span><button data-music-stop type="button">停止音乐</button></div>
    <p class="music-note">网易云请使用上方官方播放器的播放键；若歌曲无法播放，可打开原页或选本地文件。本地音乐可在关掉面板后继续，进入传送门或刷新页面会停止。本地文件只在当前浏览器播放。</p>`;
  panel.append(host); panel.classList.add('has-music-station');
  const $ = selector => host.querySelector(selector);
  const audio = $('#courtyard-audio'), remote = $('[data-music-remote]'), input = $('[data-music-playlist]');
  const status = $('[data-music-status]'), error = $('[data-music-error]'), track = $('[data-music-track]'), queue = $('[data-music-queue]');
  const floater = document.createElement('button');
  floater.className = 'music-stop-float'; floater.dataset.musicStopFloat = ''; floater.type = 'button'; floater.textContent = '♫ 停止音乐'; floater.hidden = true;
  document.body.append(floater);
  let files = [], index = -1, frame = null, mode = null, revision = 0;
  let playlist = neteasePlaylist(DEFAULT_PLAYLIST);
  try { playlist = neteasePlaylist(localStorage.getItem('homecraft-music-playlist')) || playlist; } catch {}
  input.value = playlist.url;
  const original = $('[data-music-original]'); original.href = playlist.url;
  function syncVisibility() {
    host.hidden = !(panel.open && panel.dataset.station === 'plaza');
    floater.hidden = !host.hidden || !(frame || (!audio.paused && mode === 'local'));
  }
  const observer = new MutationObserver(syncVisibility);
  observer.observe(panel, { attributes: true, attributeFilter: ['open', 'data-station'] });
  function sync() {
    const playing = mode === 'local' && !audio.paused && !audio.ended;
    host.classList.toggle('is-playing', playing);
    status.textContent = mode === 'netease' ? '网易云已载入 · 播放状态以官方控件为准' : index < 0 ? '等待选曲' : playing ? '正在播放本地音乐' : '本地音乐已暂停';
    $('[data-music-prev]').disabled = $('[data-music-next]').disabled = files.length < 2;
    for (const button of queue.querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.trackIndex) === index));
    syncVisibility();
  }
  function clearRemote() { frame?.remove(); frame = null; remote.hidden = true; }
  function stop() {
    revision++; audio.pause(); clearRemote(); mode = null; sync();
  }
  async function selectTrack(next, play = true) {
    if (!files.length) return;
    const request = ++revision;
    audio.pause(); clearRemote(); mode = 'local'; index = (next + files.length) % files.length;
    audio.src = files[index].url; track.textContent = files[index].name; error.textContent = ''; sync();
    if (play) try { await audio.play(); }
    catch (reason) { if (request === revision && reason.name !== 'AbortError') error.textContent = '这首音乐暂时无法播放，请尝试其他文件或点击播放器的播放键。'; }
  }
  host.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const next = neteasePlaylist(input.value);
    if (!next) { error.textContent = '请填写网易云歌单链接或数字歌单 ID。'; return; }
    revision++; audio.pause(); mode = 'netease'; error.textContent = '';
    playlist = next; input.value = playlist.url; original.href = playlist.url;
    try { localStorage.setItem('homecraft-music-playlist', playlist.id); } catch {}
    if (frame?.getAttribute('src') !== playlist.embed) {
      clearRemote(); frame = document.createElement('iframe'); frame.dataset.musicFrame = ''; frame.title = '网易云歌单播放器';
      frame.allow = 'autoplay'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.src = playlist.embed; remote.append(frame);
    }
    remote.hidden = false; sync();
  });
  $('[data-music-files]').addEventListener('change', event => {
    const selected = [...event.target.files];
    if (!selected.length) return;
    stop(); audio.removeAttribute('src'); audio.load();
    for (const file of files) URL.revokeObjectURL(file.url);
    files = selected.map(file => ({ name: file.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(file) }));
    queue.replaceChildren();
    files.forEach((file, i) => {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.dataset.trackIndex = i; button.textContent = file.name;
      button.addEventListener('click', () => selectTrack(i)); li.append(button); queue.append(li);
    });
    selectTrack(0, false); sync();
  });
  $('[data-music-prev]').addEventListener('click', () => selectTrack(index - 1));
  $('[data-music-next]').addEventListener('click', () => selectTrack(index + 1));
  $('[data-music-stop]').addEventListener('click', stop); floater.addEventListener('click', stop);
  for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, sync);
  audio.addEventListener('play', () => { clearRemote(); mode = 'local'; sync(); });
  audio.addEventListener('ended', () => { if (mode === 'local' && files.length > 1) selectTrack(index + 1); });
  audio.addEventListener('error', () => { if (audio.getAttribute('src')) error.textContent = '浏览器无法读取这首音乐，请尝试 MP3 或 WAV 文件。'; });
  sync();
  // Cross-origin playback cannot be observed; animate only real local playback.
  return { get playing() { return mode === 'local' && !audio.paused && !audio.ended; } };
}

import { COURTYARD_TRACKS } from './music-library.js';

const AUDIO_FILE = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;
const REPEAT_MODES = ['off', 'all', 'one'];

// Keep the formatting and filename rules pure so they can be tested outside a browser.
export function musicTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function describeTrack(name) {
  const base = String(name).replace(/\.[^.]+$/, '').trim() || String(name);
  const parts = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  return parts ? { artist: parts[1].trim(), title: parts[2].trim() } : { artist: '', title: base };
}

export function isAudioFile(file) {
  return !!file && (String(file.type).startsWith('audio/') || AUDIO_FILE.test(String(file.name)));
}

function trackTime(seconds) {
  return Number.isFinite(seconds) && seconds > 0 ? musicTime(seconds) : '--:--';
}

const PUBLIC_TRACKS = COURTYARD_TRACKS.map(track => ({
  ...track,
  kind: 'public',
  key: `public:${track.id}`,
  url: track.src
}));

// The engine replaces card bodies on every open. The player lives in a persistent
// sibling of the body, so closing or revisiting the card keeps the same audio.
export function createMusicStation(panel) {
  const host = document.createElement('section');
  host.className = 'music-station';
  host.dataset.panelContent = '';
  host.hidden = true;
  host.setAttribute('aria-label', '庭院音乐台');
  host.innerHTML = `
    <div class="music-hero">
      <div class="music-deck" aria-hidden="true">
        <span class="music-disc"></span>
        <span class="music-arm"><i></i></span>
      </div>
      <div class="music-now">
        <p class="music-kicker" data-music-kicker>SIDE A · 庭院唱片集</p>
        <p class="music-now-title" data-music-title>还没有放上唱片</p>
        <p class="music-now-artist" data-music-artist>庭院唱片还在准备中</p>
      </div>
      <span class="music-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </div>
    <div class="music-controls">
      <div class="music-progress">
        <span data-music-current>0:00</span>
        <input class="music-seek" data-music-seek type="range" min="0" max="1000" value="0" step="1" aria-label="播放进度" disabled>
        <span data-music-duration>0:00</span>
      </div>
      <div class="music-buttons">
        <div class="music-transport-main">
          <button class="music-skip" data-music-prev type="button" aria-label="上一首" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2.2v14H6zM20 5v14L8.8 12z"/></svg>
          </button>
          <button class="music-play" data-music-toggle type="button" aria-label="播放" aria-pressed="false">
            <svg class="music-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            <svg class="music-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
          </button>
          <button class="music-skip" data-music-next type="button" aria-label="下一首" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.8 5H18v14h-2.2zM4 5v14l11.2-7z"/></svg>
          </button>
        </div>
        <div class="music-volume">
          <button class="music-mute" data-music-mute type="button" aria-label="静音" aria-pressed="false">
            <svg class="music-vol-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.3a5 5 0 0 1 0 7.4l-1.2-1.3a3.2 3.2 0 0 0 0-4.8zM18.4 5.6a8.5 8.5 0 0 1 0 12.8l-1.2-1.3a6.7 6.7 0 0 0 0-10.2z"/></svg>
            <svg class="music-vol-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM15.7 9.2l1.3-1.3 2 2 2-2 1.3 1.3-2 2 2 2-1.3 1.3-2-2-2 2-1.3-1.3 2-2z"/></svg>
          </button>
          <input data-music-volume type="range" min="0" max="100" value="80" step="1" aria-label="音量">
        </div>
      </div>
    </div>
    <section class="music-library">
      <header class="music-library-head">
        <div class="music-tabs" role="tablist" aria-label="唱片架">
          <button class="music-tab" id="music-tab-public" data-music-tab="public" type="button" role="tab" aria-selected="true" aria-controls="music-public">庭院唱片 <small><span data-music-public-count>0</span> <span class="music-tab-unit">首</span></small></button>
          <button class="music-tab" id="music-tab-local" data-music-tab="local" type="button" role="tab" aria-selected="false" aria-controls="music-local">本机试听 <small><span data-music-count>0</span> <span class="music-tab-unit">首</span></small></button>
        </div>
        <div class="music-tools">
          <button class="music-tool" data-music-shuffle type="button" aria-label="随机播放" aria-pressed="false" title="随机播放">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
            <span class="music-tool-label">随机</span>
          </button>
          <button class="music-tool" data-music-repeat type="button" data-mode="all" aria-label="列表循环" title="列表循环">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            <span class="music-tool-label">循环</span>
            <b>1</b>
          </button>
        </div>
      </header>
      <div class="music-panel" id="music-public" data-music-public role="tabpanel" aria-labelledby="music-tab-public">
        <p class="music-empty" data-music-public-empty hidden>公共唱片架还没有曲目。</p>
        <ol class="music-queue" data-music-queue aria-label="庭院唱片"></ol>
      </div>
      <div class="music-panel music-local" id="music-local" data-music-local role="tabpanel" aria-labelledby="music-tab-local" hidden>
        <div class="music-drop" data-music-drop>
          <button class="music-import" data-music-pick type="button">选择文件</button>
          <button class="music-import is-quiet" data-music-folder-pick type="button">选择文件夹</button>
          <p>拖入音频也可以 · 只在此浏览器播放</p>
          <input data-music-files type="file" accept="audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm" multiple hidden>
          <input data-music-folder type="file" webkitdirectory directory multiple hidden>
        </div>
        <p class="music-empty" data-music-empty>还没有本机音乐。导入的歌只在这里播放，不会出现在庭院唱片里。</p>
        <ol class="music-queue music-local-queue" data-music-local-queue aria-label="本机试听" hidden></ol>
        <div class="music-local-foot">
          <span>本机文件不会上传</span>
          <button class="music-clear" data-music-clear type="button" disabled>清空本机</button>
        </div>
      </div>
    </section>
    <p class="music-error" data-music-error role="alert"></p>
    <p class="music-note"><span class="music-note-long">庭院唱片随站点发布；本机文件只在此浏览器播放。关闭卡片后仍会继续，刷新或进传送门会停止。</span><span class="music-note-short">庭院唱片可直接播放；本机文件只在这里响。刷新或进传送门会停止。</span></p>
    <audio id="courtyard-audio" preload="none" aria-label="庭院音乐播放器"></audio>`;
  panel.append(host);
  panel.classList.add('has-music-station');

  const $ = selector => host.querySelector(selector);
  const audio = $('#courtyard-audio');
  const filePicker = $('[data-music-files]');
  const folderPicker = $('[data-music-folder]');
  const kicker = $('[data-music-kicker]');
  const title = $('[data-music-title]');
  const artist = $('[data-music-artist]');
  const publicCount = $('[data-music-public-count]');
  const localCount = $('[data-music-count]');
  const publicEmpty = $('[data-music-public-empty]');
  const empty = $('[data-music-empty]');
  const queue = $('[data-music-queue]');
  const localQueue = $('[data-music-local-queue]');
  const publicPanel = $('[data-music-public]');
  const localPanel = $('[data-music-local]');
  const error = $('[data-music-error]');
  const seek = $('[data-music-seek]');
  const current = $('[data-music-current]');
  const duration = $('[data-music-duration]');
  const volume = $('[data-music-volume]');
  const playButton = $('[data-music-toggle]');
  const prevButton = $('[data-music-prev]');
  const nextButton = $('[data-music-next]');
  const muteButton = $('[data-music-mute]');
  const shuffleButton = $('[data-music-shuffle]');
  const repeatButton = $('[data-music-repeat]');
  const clearButton = $('[data-music-clear]');
  const tabButtons = [...host.querySelectorAll('[data-music-tab]')];

  const floater = document.createElement('button');
  floater.className = 'music-stop-float';
  floater.dataset.musicStopFloat = '';
  floater.type = 'button';
  floater.textContent = '♫ 停止音乐';
  floater.hidden = true;
  document.body.append(floater);

  let files = [...PUBLIC_TRACKS];
  let index = files.length ? 0 : -1;
  let revision = 0;
  let shuffle = false;
  let repeat = 'all';
  let tab = 'public';
  let probe = null;
  let probeTimer = 0;
  let probeToken = 0;
  let pendingSeek = null;
  let dragDepth = 0;

  try {
    const stored = Number(localStorage.getItem('homecraft-music-volume'));
    audio.volume = Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : .8;
    audio.muted = localStorage.getItem('homecraft-music-muted') === '1';
  } catch { audio.volume = .8; }

  const playing = () => index >= 0 && !audio.paused && !audio.ended;
  const localFiles = () => files.filter(file => file.kind === 'local');

  function syncVisibility() {
    const open = panel.open && panel.dataset.station === 'plaza';
    host.hidden = !open;
    floater.hidden = open || !playing();
  }

  function syncTabs() {
    for (const button of tabButtons) {
      const selected = button.dataset.musicTab === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    publicPanel.hidden = tab !== 'public';
    localPanel.hidden = tab !== 'local';
  }

  function selectTab(name) {
    tab = name === 'local' ? 'local' : 'public';
    syncTabs();
  }

  function syncProgress() {
    const file = files[index];
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration
      : Number.isFinite(file?.duration) && file.duration > 0 ? file.duration : 0;
    const position = total ? Math.min(audio.currentTime || 0, total) : 0;
    const ratio = total ? position / total : 0;
    const percent = `${(ratio * 100).toFixed(2)}%`;
    seek.disabled = !total;
    seek.value = String(Math.round(ratio * 1000));
    seek.style.setProperty('--value', percent);
    current.textContent = musicTime(position);
    duration.textContent = musicTime(total);
  }

  function syncVolume() {
    const percent = `${Math.round(audio.volume * 100)}%`;
    volume.value = String(Math.round(audio.volume * 100));
    volume.style.setProperty('--value', percent);
    host.classList.toggle('is-muted', audio.muted || audio.volume === 0);
    muteButton.setAttribute('aria-pressed', String(audio.muted || audio.volume === 0));
    muteButton.setAttribute('aria-label', audio.muted || audio.volume === 0 ? '取消静音' : '静音');
  }

  function markQueue() {
    for (const list of [queue, localQueue]) {
      for (const row of list.children) {
        const active = Number(row.dataset.index) === index;
        row.classList.toggle('is-active', active);
        row.querySelector('button').setAttribute('aria-current', String(active));
      }
    }
  }

  function sync() {
    const file = files[index];
    const isPlaying = playing();
    const locals = localFiles();
    host.classList.toggle('is-playing', isPlaying);
    kicker.textContent = file?.kind === 'local' ? 'SIDE B · 本机试听' : 'SIDE A · 庭院唱片集';
    title.textContent = file ? file.title : '还没有放上唱片';
    artist.textContent = file ? (file.artist || (file.kind === 'local' ? '本地音乐' : '庭院唱片')) : '庭院唱片还在准备中';
    publicCount.textContent = String(PUBLIC_TRACKS.length);
    localCount.textContent = String(locals.length);
    publicEmpty.hidden = PUBLIC_TRACKS.length > 0;
    queue.hidden = PUBLIC_TRACKS.length === 0;
    empty.hidden = locals.length > 0;
    localQueue.hidden = locals.length === 0;
    clearButton.disabled = locals.length === 0;
    prevButton.disabled = nextButton.disabled = files.length < 2;
    playButton.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
    playButton.setAttribute('aria-pressed', String(isPlaying));
    shuffleButton.setAttribute('aria-pressed', String(shuffle));
    repeatButton.dataset.mode = repeat;
    repeatButton.title = repeat === 'off' ? '顺序播放' : repeat === 'all' ? '列表循环' : '单曲循环';
    repeatButton.setAttribute('aria-label', repeatButton.title);
    repeatButton.querySelector('.music-tool-label').textContent = repeat === 'off' ? '顺序' : repeat === 'all' ? '循环' : '单曲';
    floater.textContent = isPlaying && file
      ? `♫ ${file.artist ? `${file.artist} · ` : ''}${file.title} · 停止`
      : '♫ 停止音乐';
    syncProgress();
    syncVolume();
    markQueue();
    syncVisibility();
  }

  function showProblem(message) {
    error.textContent = message;
  }

  function makeRow(file, position, displayIndex) {
    const row = document.createElement('li');
    row.className = 'music-row';
    row.dataset.index = String(position);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'music-row-button';
    button.innerHTML = '<span class="music-row-no"><span class="music-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="music-row-num"></span></span><span class="music-row-text"><b></b><small></small></span><span class="music-row-time"></span>';
    button.querySelector('.music-row-num').textContent = String(displayIndex).padStart(2, '0');
    button.querySelector('b').textContent = file.title;
    button.querySelector('small').textContent = file.artist || (file.kind === 'local' ? '本地音乐' : '庭院唱片');
    button.querySelector('.music-row-time').textContent = trackTime(file.duration);
    button.setAttribute('aria-label', `${file.title}${file.artist ? ` — ${file.artist}` : ''}`);
    button.addEventListener('click', () => { void selectTrack(position, true); });
    row.append(button);
    return row;
  }

  function renderPublicQueue() {
    const fragment = document.createDocumentFragment();
    PUBLIC_TRACKS.forEach((file, position) => fragment.append(makeRow(file, position, position + 1)));
    queue.replaceChildren(fragment);
    markQueue();
  }

  function renderLocalQueue() {
    const locals = localFiles();
    const fragment = document.createDocumentFragment();
    locals.forEach((file, position) => fragment.append(makeRow(file, PUBLIC_TRACKS.length + position, position + 1)));
    localQueue.replaceChildren(fragment);
    markQueue();
  }

  function probeNextDuration() {
    if (probe) return;
    const next = localFiles().find(file => file.duration === undefined);
    if (!next) return;
    const token = ++probeToken;
    const player = new Audio();
    player.preload = 'metadata';
    probe = player;
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (token !== probeToken) return;
      next.duration = Number.isFinite(value) && value > 0 ? value : null;
      player.removeAttribute('src');
      player.load?.();
      probe = null;
      const row = localQueue.querySelector(`.music-row[data-index="${files.indexOf(next)}"] .music-row-time`);
      if (row) row.textContent = trackTime(next.duration);
      probeNextDuration();
    };
    const timer = setTimeout(() => finish(player.duration), 8000);
    probeTimer = timer;
    player.addEventListener('loadedmetadata', () => finish(player.duration), { once: true });
    player.addEventListener('error', () => finish(null), { once: true });
    player.src = next.url;
  }

  function addFiles(list) {
    const incoming = [...(list || [])].filter(isAudioFile);
    if (!incoming.length) { showProblem('没有找到浏览器可以播放的音频文件。'); return; }
    const known = new Set(localFiles().map(file => file.key));
    let added = 0;
    for (const file of incoming) {
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (known.has(key)) continue;
      known.add(key);
      const meta = describeTrack(file.name);
      files.push({ kind: 'local', key, name: file.name, title: meta.title, artist: meta.artist, url: URL.createObjectURL(file), duration: undefined });
      added++;
    }
    if (!added) { showProblem('这些音乐已经在本机试听里了。'); return; }
    error.textContent = '';
    renderLocalQueue();
    selectTab('local');
    if (index < 0) index = PUBLIC_TRACKS.length;
    probeNextDuration();
    sync();
  }

  function ensureSource(file) {
    if (!file) return;
    if (audio.getAttribute('src') !== file.url) {
      audio.src = file.url;
      audio.load();
    }
  }

  async function startPlayback(request = ++revision) {
    ensureSource(files[index]);
    try { await audio.play(); }
    catch (reason) {
      if (request === revision && reason?.name !== 'AbortError') showProblem('浏览器没有开始播放。请再点一次播放，或换一首曲目。');
    } finally { if (request === revision) sync(); }
  }

  async function selectTrack(position, shouldPlay = true) {
    if (!files.length) return;
    const target = ((position % files.length) + files.length) % files.length;
    const request = ++revision;
    audio.pause();
    index = target;
    error.textContent = '';
    if (shouldPlay) ensureSource(files[index]);
    sync();
    if (shouldPlay) await startPlayback(request);
  }

  function randomIndex() {
    if (files.length < 2) return 0;
    let candidate = index;
    while (candidate === index) candidate = Math.floor(Math.random() * files.length);
    return candidate;
  }

  function step(delta) {
    if (!files.length) return;
    void selectTrack(shuffle ? randomIndex() : index + delta, true);
  }

  async function togglePlayback() {
    if (!files.length) { selectTab('local'); filePicker.click(); return; }
    if (index < 0) index = 0;
    ensureSource(files[index]);
    if (audio.ended) audio.currentTime = 0;
    if (audio.paused) await startPlayback();
    else audio.pause();
  }

  function clearLocal() {
    if (!localFiles().length) return;
    const currentFile = files[index];
    const currentWasLocal = currentFile?.kind === 'local';
    revision++;
    if (currentWasLocal) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    for (const file of localFiles()) URL.revokeObjectURL(file.url);
    files = files.filter(file => file.kind === 'public');
    index = currentWasLocal ? (files.length ? 0 : -1) : files.indexOf(currentFile);
    pendingSeek = null;
    probeToken++;
    if (probe) {
      clearTimeout(probeTimer);
      probe.removeAttribute('src');
      probe.load?.();
      probe = null;
    }
    renderLocalQueue();
    error.textContent = '';
    sync();
  }

  function handleEnded() {
    if (!files.length) return;
    if (repeat === 'one') {
      audio.currentTime = 0;
      void startPlayback();
    } else if (shuffle) {
      void selectTrack(randomIndex(), true);
    } else if (index < files.length - 1) {
      void selectTrack(index + 1, true);
    } else if (repeat === 'all') {
      void selectTrack(0, true);
    } else {
      sync();
    }
  }

  const observer = new MutationObserver(syncVisibility);
  observer.observe(panel, { attributes: true, attributeFilter: ['open', 'data-station'] });

  $('[data-music-pick]').addEventListener('click', () => filePicker.click());
  $('[data-music-folder-pick]').addEventListener('click', () => folderPicker.click());
  filePicker.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
  folderPicker.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
  for (const button of tabButtons) button.addEventListener('click', () => selectTab(button.dataset.musicTab));
  playButton.addEventListener('click', () => { void togglePlayback(); });
  prevButton.addEventListener('click', () => {
    if (!files.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; syncProgress(); return; }
    step(-1);
  });
  nextButton.addEventListener('click', () => step(1));
  clearButton.addEventListener('click', clearLocal);
  floater.addEventListener('click', () => { audio.pause(); audio.currentTime = 0; sync(); });
  shuffleButton.addEventListener('click', () => { shuffle = !shuffle; sync(); });
  repeatButton.addEventListener('click', () => { repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length]; sync(); });

  seek.addEventListener('input', () => {
    const file = files[index];
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration
      : Number.isFinite(file?.duration) ? file.duration : 0;
    if (!total) return;
    if (!audio.getAttribute('src')) {
      pendingSeek = Number(seek.value) / 1000;
      ensureSource(file);
      return;
    }
    audio.currentTime = (Number(seek.value) / 1000) * total;
    syncProgress();
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    if (audio.volume > 0) audio.muted = false;
    try {
      localStorage.setItem('homecraft-music-volume', String(audio.volume));
      if (!audio.muted) localStorage.setItem('homecraft-music-muted', '');
    } catch {}
    syncVolume();
  });
  muteButton.addEventListener('click', () => {
    audio.muted = !audio.muted;
    try { localStorage.setItem('homecraft-music-muted', audio.muted ? '1' : ''); } catch {}
    syncVolume();
  });

  host.addEventListener('dragenter', event => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    dragDepth++;
    host.classList.add('is-dragging');
  });
  host.addEventListener('dragover', event => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  host.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) host.classList.remove('is-dragging');
  });
  host.addEventListener('drop', event => {
    event.preventDefault();
    dragDepth = 0;
    host.classList.remove('is-dragging');
    if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
  });

  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('timeupdate', syncProgress);
  audio.addEventListener('loadedmetadata', () => {
    if (pendingSeek != null && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = pendingSeek * audio.duration;
      pendingSeek = null;
    }
    sync();
  });
  audio.addEventListener('durationchange', sync);
  audio.addEventListener('volumechange', syncVolume);
  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('error', () => {
    if (audio.getAttribute('src')) showProblem('浏览器无法读取这首音乐，请尝试 MP3、WAV 或 FLAC 文件。');
    sync();
  });

  renderPublicQueue();
  renderLocalQueue();
  selectTab('public');
  sync();
  return {
    get playing() { return playing(); },
    sync,
    dispose() { observer.disconnect(); floater.remove(); host.remove(); }
  };
}

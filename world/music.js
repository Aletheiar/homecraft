import { COURTYARD_TRACKS } from './music-library.js';

const AUDIO_FILE = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;
const REPEAT_MODES = ['off', 'all', 'one'];
// The volume preference keeps the keys earlier versions wrote, so a visitor's
// saved level survives this player replacing the old stop pill.
export const VOLUME_KEY = 'homecraft-music-volume';
export const MUTED_KEY = 'homecraft-music-muted';
// Percent for first visits or unreadable preferences. Saved levels take priority.
export const DEFAULT_VOLUME = 25;

export function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

// Read back the saved level defensively: private-mode storage throws, and a
// damaged or out-of-range value is repaired instead of trusted.
export function readVolumePrefs(read) {
  let volume = DEFAULT_VOLUME;
  let muted = false;
  try {
    const stored = read?.(VOLUME_KEY);
    const number = stored === null || stored === undefined || String(stored).trim() === ''
      ? NaN : Number(stored);
    if (Number.isFinite(number)) volume = clampPercent(number * 100);
  } catch {}
  try { muted = read?.(MUTED_KEY) === '1'; } catch {}
  return { volume, muted };
}

const VOLUME_ICONS = '<svg class="music-mini-vol music-mini-vol-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.4h3.6L12.8 5v14l-5.2-4.4H4zM15.9 8.5a5.2 5.2 0 0 1 0 7l1.4 1.4a7.1 7.1 0 0 0 0-9.8z"/></svg>'
  + '<svg class="music-mini-vol music-mini-vol-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.4h3.6L12.8 5v14l-5.2-4.4H4zM15.4 9.2l-1.4 1.4 1.6 1.6-1.6 1.6 1.4 1.4 1.6-1.6 1.6 1.6 1.4-1.4-1.6-1.6 1.6-1.6-1.4-1.4-1.6 1.6z"/></svg>';

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
          <input data-music-volume type="range" min="0" max="100" value="${DEFAULT_VOLUME}" step="1" aria-label="音量">
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
    <p class="music-note"><span class="music-note-long">庭院唱片随机起播，之后按歌单顺序；可随时切歌。关闭卡片后继续，进传送门停止。本机文件只在此浏览器播放。</span><span class="music-note-short">随机起播后按歌单顺序，可随时切歌。关卡片继续，进门停止。</span></p>
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

  // One floating mini player, created with the station rather than rebuilt on
  // every card open, so the audio element is never duplicated.
  const mini = document.createElement('div');
  mini.className = 'music-mini';
  mini.dataset.musicMini = '';
  mini.hidden = true;
  mini.setAttribute('role', 'group');
  mini.setAttribute('aria-label', '迷你音乐播放器');
  mini.innerHTML = `
    <span class="music-mini-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 3.8v11.6a3.4 3.4 0 1 1-2-3.1V7.9l-8 1.6v7.9a3.4 3.4 0 1 1-2-3.1V5.6z"/></svg></span>
    <p class="music-mini-title" data-music-mini-title>庭院唱片</p>
    <span class="music-mini-status" data-music-mini-status role="status" aria-live="polite"></span>
    <span class="music-mini-transport">
      <button class="music-mini-skip" data-music-mini-prev type="button" aria-label="上一首" title="上一首"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 5h2.3v14H7.2zM20 5.5v13L10.3 12z"/></svg></button>
      <button class="music-mini-play" data-music-mini-toggle type="button" aria-label="播放" aria-pressed="false" title="播放"><svg class="music-mini-icon music-mini-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 5.1v13.8L19 12z"/></svg><svg class="music-mini-icon music-mini-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.9v14H7zM13.1 5H17v14h-3.9z"/></svg></button>
      <button class="music-mini-skip" data-music-mini-next type="button" aria-label="下一首" title="下一首"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 5h-2.3v14h2.3zM4 5.5v13L13.7 12z"/></svg></button>
    </span>
    <button class="music-mini-volume" data-music-mini-volume type="button" aria-label="音量" aria-expanded="false" aria-controls="music-mini-volume-panel" title="音量">${VOLUME_ICONS}</button>
    <div class="music-mini-volume-panel" id="music-mini-volume-panel" data-music-mini-volume-panel role="group" aria-label="音量控制">
      <button class="music-mini-mute" data-music-mini-mute type="button" aria-label="静音" aria-pressed="false" title="静音">${VOLUME_ICONS}</button>
      <input class="music-mini-slider" data-music-mini-slider type="range" min="0" max="100" step="1" value="${DEFAULT_VOLUME}" aria-label="音量">
      <span class="music-mini-percent" data-music-mini-percent>${DEFAULT_VOLUME}%</span>
    </div>`;
  document.body.append(mini);

  const miniTitle = mini.querySelector('[data-music-mini-title]');
  const miniStatus = mini.querySelector('[data-music-mini-status]');
  const miniPrev = mini.querySelector('[data-music-mini-prev]');
  const miniPlay = mini.querySelector('[data-music-mini-toggle]');
  const miniNext = mini.querySelector('[data-music-mini-next]');
  const miniVolume = mini.querySelector('[data-music-mini-volume]');
  const miniMute = mini.querySelector('[data-music-mini-mute]');
  const miniSlider = mini.querySelector('[data-music-mini-slider]');
  const miniPercent = mini.querySelector('[data-music-mini-percent]');

  let files = [...PUBLIC_TRACKS];
  let index = files.length ? Math.floor(Math.random() * files.length) : -1;
  let revision = 0;
  let shuffle = false;
  let repeat = 'all';
  let tab = 'public';
  let probe = null;
  let probeTimer = 0;
  let probeToken = 0;
  let pendingSeek = null;
  let dragDepth = 0;
  let autoplayPending = false;
  let loading = false;
  let volumeOpen = false;
  let lastAudible = DEFAULT_VOLUME / 100;

  const prefs = readVolumePrefs(key => localStorage.getItem(key));
  audio.volume = prefs.volume / 100;
  audio.muted = prefs.muted;
  if (audio.volume > 0) lastAudible = audio.volume;

  const playing = () => index >= 0 && !audio.paused && !audio.ended;
  const localFiles = () => files.filter(file => file.kind === 'local');

  function persistVolume() {
    try {
      localStorage.setItem(VOLUME_KEY, String(audio.volume));
      localStorage.setItem(MUTED_KEY, audio.muted ? '1' : '');
    } catch {}
  }

  // Volume, silence and playback are three separate states: a silent range
  // leaves the track playing, and muting never touches currentTime.
  function applyVolume(percent, { unmute = true } = {}) {
    const value = clampPercent(percent);
    audio.volume = value / 100;
    if (value > 0) {
      lastAudible = audio.volume;
      if (unmute) audio.muted = false;
    }
    persistVolume();
    syncVolume();
  }

  function toggleMute() {
    const silent = audio.muted || audio.volume === 0;
    if (silent) {
      audio.muted = false;
      if (audio.volume === 0) audio.volume = lastAudible > 0 ? lastAudible : DEFAULT_VOLUME / 100;
    } else {
      lastAudible = audio.volume;
      audio.muted = true;
    }
    persistVolume();
    syncVolume();
  }

  function setLoading(value) {
    loading = Boolean(value);
    mini.classList.toggle('is-loading', loading);
    miniPlay.setAttribute('aria-busy', String(loading));
  }

  function setVolumeOpen(open) {
    volumeOpen = Boolean(open) && !mini.hidden;
    mini.classList.toggle('is-volume-open', volumeOpen);
    miniVolume.setAttribute('aria-expanded', String(volumeOpen));
    if (volumeOpen) {
      document.addEventListener('pointerdown', closeVolumeOutside, true);
      document.addEventListener('keydown', closeVolumeKeys, true);
    } else {
      document.removeEventListener('pointerdown', closeVolumeOutside, true);
      document.removeEventListener('keydown', closeVolumeKeys, true);
    }
  }

  function closeVolumeOutside(event) {
    if (!mini.contains(event.target)) setVolumeOpen(false);
  }

  function closeVolumeKeys(event) {
    if (!volumeOpen || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setVolumeOpen(false);
    miniVolume.focus();
  }

  function syncVisibility() {
    const open = panel.open && panel.dataset.station === 'plaza';
    host.hidden = !open;
    const hide = open || index < 0 || !files.length;
    if (hide && volumeOpen) setVolumeOpen(false);
    mini.hidden = hide;
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
    const percent = clampPercent(audio.volume * 100);
    const silent = audio.muted || audio.volume === 0;
    const fill = `${percent}%`;
    volume.value = String(percent);
    volume.style.setProperty('--value', fill);
    miniSlider.value = String(percent);
    miniSlider.style.setProperty('--value', fill);
    miniSlider.setAttribute('aria-valuetext', silent ? `已静音，${percent}%` : fill);
    miniPercent.textContent = fill;
    host.classList.toggle('is-muted', silent);
    mini.classList.toggle('is-muted', silent);
    for (const button of [muteButton, miniMute]) {
      button.setAttribute('aria-pressed', String(silent));
      button.setAttribute('aria-label', silent ? '取消静音' : '静音');
    }
    miniVolume.setAttribute('aria-label', silent ? `音量，已静音，${percent}%` : `音量 ${percent}%`);
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
    const trackName = file ? `${file.title}${file.artist ? ` · ${file.artist}` : ''}` : '没有可播放的曲目';
    miniTitle.textContent = trackName;
    miniTitle.title = trackName;
    mini.classList.toggle('is-playing', isPlaying);
    mini.classList.toggle('is-loading', loading);
    miniPlay.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
    miniPlay.title = isPlaying ? '暂停' : '播放';
    miniPlay.setAttribute('aria-pressed', String(isPlaying));
    miniPlay.setAttribute('aria-busy', String(loading));
    miniPrev.disabled = miniNext.disabled = files.length < 2;
    syncProgress();
    syncVolume();
    markQueue();
    syncVisibility();
  }

  function announce(message) {
    miniStatus.textContent = message;
  }

  function showProblem(message) {
    error.textContent = message;
    mini.classList.add('is-error');
    announce(message);
  }

  function clearProblem() {
    error.textContent = '';
    mini.classList.remove('is-error');
    announce('');
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
    clearProblem();
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

  function cancelAutoplay() {
    autoplayPending = false;
    document.removeEventListener('click', resumeAutoplay);
    document.removeEventListener('keydown', resumeAutoplay);
    document.removeEventListener('pointerup', resumeAutoplay);
    document.removeEventListener('touchend', resumeAutoplay);
  }

  function resumeAutoplay(event) {
    // Music controls perform their own action; a global retry must not also
    // turn a visitor's pause into play or replace their selected track.
    if (!autoplayPending || !event.isTrusted || event.defaultPrevented
      || event.target.closest?.('.music-station, .music-mini')) return;
    cancelAutoplay();
    void startPlayback();
  }

  async function startPlayback(request = ++revision, automatic = false) {
    ensureSource(files[index]);
    if (request === revision) setLoading(true);
    try {
      await audio.play();
      if (request === revision) { cancelAutoplay(); clearProblem(); }
    }
    catch (reason) {
      if (request !== revision || reason?.name === 'AbortError') return;
      if (automatic && reason?.name === 'NotAllowedError') {
        autoplayPending = true;
        document.addEventListener('click', resumeAutoplay);
        document.addEventListener('keydown', resumeAutoplay);
        document.addEventListener('pointerup', resumeAutoplay);
        document.addEventListener('touchend', resumeAutoplay);
      } else showProblem('浏览器没有开始播放。请再点一次播放，或换一首曲目。');
    } finally {
      if (request === revision) { setLoading(false); sync(); }
    }
  }

  // The target track is always loaded, so a paused player shows the new title
  // and still pauses; `shouldPlay` is the only thing that may resume audio.
  async function selectTrack(position, shouldPlay = true) {
    if (!files.length) return;
    cancelAutoplay();
    const target = ((position % files.length) + files.length) % files.length;
    const request = ++revision;
    audio.pause();
    index = target;
    clearProblem();
    ensureSource(files[index]);
    setLoading(false);
    announce(`当前曲目：${files[index].title}`);
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
    // A paused player stays paused across a manual track change.
    void selectTrack(shuffle ? randomIndex() : index + delta, playing());
  }

  function nextTrack() {
    step(1);
  }

  // The usual music-player rule: restart after three seconds, otherwise back.
  function previousTrack() {
    if (!files.length) return;
    cancelAutoplay();
    if (audio.currentTime > 3) { audio.currentTime = 0; syncProgress(); return; }
    step(-1);
  }

  async function togglePlayback() {
    cancelAutoplay();
    if (!files.length) { selectTab('local'); filePicker.click(); return; }
    if (index < 0) index = 0;
    ensureSource(files[index]);
    if (!audio.paused) { audio.pause(); return; }
    if (audio.ended) audio.currentTime = 0;
    await startPlayback();
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
    clearProblem();
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
  prevButton.addEventListener('click', previousTrack);
  nextButton.addEventListener('click', nextTrack);
  clearButton.addEventListener('click', clearLocal);
  miniPlay.addEventListener('click', () => { void togglePlayback(); });
  miniPrev.addEventListener('click', previousTrack);
  miniNext.addEventListener('click', nextTrack);
  miniVolume.addEventListener('click', () => setVolumeOpen(!volumeOpen));
  miniMute.addEventListener('click', toggleMute);
  miniSlider.addEventListener('input', () => applyVolume(miniSlider.value));
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
  volume.addEventListener('input', () => applyVolume(volume.value));
  muteButton.addEventListener('click', toggleMute);

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
  audio.addEventListener('playing', () => { setLoading(false); sync(); });
  audio.addEventListener('waiting', () => setLoading(true));
  audio.addEventListener('canplay', () => setLoading(false));
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
    setLoading(false);
    if (audio.getAttribute('src')) showProblem('浏览器无法读取这首音乐，请尝试 MP3、WAV 或 FLAC 文件。');
    sync();
  });

  renderPublicQueue();
  renderLocalQueue();
  selectTab('public');
  sync();
  if (files.length) void startPlayback(undefined, true);
  return {
    get playing() { return playing(); },
    sync,
    dispose() {
      cancelAutoplay();
      revision++;
      setVolumeOpen(false);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      observer.disconnect();
      mini.remove();
      host.remove();
    }
  };
}

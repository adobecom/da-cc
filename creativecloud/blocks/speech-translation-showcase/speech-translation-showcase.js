import { createTag } from '../../scripts/utils.js';
import { EVT } from '../audio/audio.js';
import initSpeechBlades from '../../features/firefly-speech/speech-blade.js';

const LANA_AUDIO = {
  errorType: 'i',
  tags: 'speech-audio',
  severity: 'error',
};
const LANA_VIDEO = {
  errorType: 'i',
  tags: 'speech-video',
  severity: 'error',
};
const MEDIA_SELECTOR = 'picture, .video-container.video-holder, video';
const USER_PAUSED_ATTR = 'data-user-paused';

let activeVideoEl = null;
const audioToVideo = new WeakMap();

function getVideoEl(mediaEl) {
  if (!mediaEl) return null;
  if (mediaEl.tagName === 'VIDEO') return mediaEl;
  return mediaEl.querySelector('video');
}

function syncVideoDaaLl(host, label) {
  const wrapper = host?.querySelector('.pause-play-wrapper');
  const ll = wrapper?.getAttribute('daa-ll');
  if (!ll) return;
  wrapper.setAttribute('daa-ll', ll.replace(/\b(?:play|pause)\b/gi, label));
}

function syncVideoChrome(videoEl, isPlaying) {
  const host = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
  if (!host) return;
  host.querySelector('.offset-filler')?.classList.toggle('is-playing', isPlaying);
  host.querySelector('.pause-play-wrapper')?.setAttribute('aria-pressed', String(isPlaying));
  syncVideoDaaLl(host, isPlaying ? 'Pause' : 'Play');
}

const canplayGuarded = new WeakSet();
function guardCanplay(videoEl) {
  if (canplayGuarded.has(videoEl)) return;
  canplayGuarded.add(videoEl);
  videoEl.addEventListener('canplay', () => {
    canplayGuarded.delete(videoEl);
    if (videoEl.hasAttribute(USER_PAUSED_ATTR)) videoEl.pause();
    syncVideoChrome(videoEl, !videoEl.paused && !videoEl.ended);
  }, { once: true });
}

function stopVideo(videoEl) {
  if (!videoEl) return;
  if (!videoEl.paused) videoEl.pause();
  videoEl.currentTime = 0;
  videoEl.setAttribute(USER_PAUSED_ATTR, '');
  guardCanplay(videoEl);
  if (activeVideoEl === videoEl) activeVideoEl = null;
}

function stopMappedVideo(audioEl) {
  stopVideo(audioToVideo.get(audioEl) || null);
}

function playMappedVideo(audioEl) {
  const videoEl = audioToVideo.get(audioEl);
  if (!videoEl) return;
  videoEl.removeAttribute(USER_PAUSED_ATTR);
  activeVideoEl = videoEl;
  videoEl.play().catch((err) => {
    if (activeVideoEl === videoEl) activeVideoEl = null;
    window.lana?.log(`Error playing video: ${err}`, LANA_VIDEO);
  });
}

function pauseMappedVideo(audioEl) {
  const videoEl = audioToVideo.get(audioEl);
  if (!videoEl) return;
  if (!videoEl.paused) videoEl.pause();
  videoEl.setAttribute(USER_PAUSED_ATTR, '');
}

let audioSyncBound = false;
function bindGlobalAudioVideoSync() {
  if (audioSyncBound) return;
  audioSyncBound = true;

  window.addEventListener(EVT.PLAYED, (e) => {
    const audioEl = e?.detail?.el;
    if (!audioEl) return;
    const videoEl = audioToVideo.get(audioEl);
    if (activeVideoEl && activeVideoEl !== videoEl) stopVideo(activeVideoEl);
    if (!videoEl || !videoEl.paused) return;
    playMappedVideo(audioEl);
  });

  window.addEventListener(EVT.PAUSED, (e) => {
    const audioEl = e?.detail?.el;
    if (audioEl) pauseMappedVideo(audioEl);
  });

  window.addEventListener(EVT.STOPPED, (e) => {
    const audioEl = e?.detail?.el;
    if (audioEl) stopMappedVideo(audioEl);
  });

  window.addEventListener(EVT.ENDED, (e) => {
    const audioEl = e?.detail?.el;
    if (audioEl) stopMappedVideo(audioEl);
  });
}

function bindVideoToAudio(audioPlayerEl, mediaEl) {
  bindGlobalAudioVideoSync();
  const videoEl = getVideoEl(mediaEl);
  const audioEl = audioPlayerEl?.querySelector('audio');
  if (!videoEl || !audioEl) return;
  audioToVideo.set(audioEl, videoEl);
  const container = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
  if (container) {
    const markPlay = () => {
      videoEl.removeAttribute(USER_PAUSED_ATTR);
      activeVideoEl = videoEl;
    };
    container.addEventListener('click', markPlay, true);
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') markPlay();
    }, true);
  }
  syncVideoChrome(videoEl, false);

  videoEl.addEventListener('pause', () => {
    syncVideoChrome(videoEl, false);
    if (!audioEl.paused) audioEl.pause();
  });
  videoEl.addEventListener('play', () => {
    if (!videoEl.hasAttribute(USER_PAUSED_ATTR)) syncVideoChrome(videoEl, true);
    if (activeVideoEl !== videoEl) return;
    if (!audioEl.paused) return;
    audioEl.play().catch((err) => window.lana?.log(`Audio play failed: ${err}`, LANA_AUDIO));
  });
  videoEl.addEventListener('ended', () => syncVideoChrome(videoEl, false));
}

function parseShowcaseItems(el, variant) {
  const rows = [...el.querySelectorAll(':scope > div')];

  return rows.flatMap((row, index) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    const mediaEl = cols[0]?.querySelector(MEDIA_SELECTOR) || null;
    const flagImg = cols[1]?.querySelector('picture') || null;
    const language = cols[2]?.textContent?.trim() || '';
    const country = cols[3]?.textContent?.trim() || '';
    const audioLink = cols[4]?.querySelector('.audio-player') || null;

    if (!flagImg && !mediaEl) return [];

    return [{
      id: `speech-showcase-blade-${index}`,
      language,
      country,
      flagPicture: flagImg,
      audioSrc: audioLink,
      mediaEl,
      variant,
    }];
  });
}

function buildMediaPanel(items) {
  const panel = createTag('div', { class: 'speech-showcase-media' });
  items.forEach((item, index) => {
    if (!item.mediaEl) return;
    const videoEl = getVideoEl(item.mediaEl);
    if (videoEl) {
      videoEl.removeAttribute('autoplay');
      videoEl.setAttribute(USER_PAUSED_ATTR, '');
      guardCanplay(videoEl);
      if (!videoEl.paused) videoEl.pause();
      videoEl.currentTime = 0;
    }
    const slot = createTag('div', {
      class: `speech-showcase-media-slot${index === 0 ? ' is-active' : ''}`,
      'data-blade-id': item.id,
    });
    slot.appendChild(item.mediaEl);
    panel.appendChild(slot);
  });
  return panel;
}

function setActiveBlade(root, id) {
  root.querySelectorAll('.speech-blade').forEach((b) => {
    b.classList.toggle('selected', b.dataset.bladeId === id);
  });
  root.querySelectorAll('.speech-showcase-media-slot').forEach((s) => {
    s.classList.toggle('is-active', s.dataset.bladeId === id);
  });
}

function buildBladesList(items, root) {
  const bladeConfigs = items.map(({ mediaEl, ...cfg }) => cfg);
  const list = initSpeechBlades(bladeConfigs, { onSelect: (id) => setActiveBlade(root, id) });
  if (!list) return null;
  list.classList.add('speech-showcase-blades');
  items.forEach(({ audioSrc, mediaEl }) => {
    if (audioSrc && mediaEl) bindVideoToAudio(audioSrc, mediaEl);
  });
  return list;
}

export default function init(el) {
  const variant = [...el.classList].filter((c) => c !== 'speech-translation-showcase').join(' ');
  el.classList.add('speech-showcase');
  const items = parseShowcaseItems(el, variant);
  if (!items.length) return;

  const bladesList = buildBladesList(items, el);
  const mediaPanel = buildMediaPanel(items);
  const foreground = createTag('div', { class: 'foreground' });

  foreground.append(mediaPanel, bladesList);
  el.replaceChildren(foreground);
  if (items[0]?.id) setActiveBlade(el, items[0].id);
}

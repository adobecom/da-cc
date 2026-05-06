import { createTag } from '../../scripts/utils.js';
import { EVT } from '../audio/audio.js';
import { createSpeechBlade } from '../../features/firefly-speech/speech-blade.js';

const LANA_AUDIO = { errorType: 'i', tags: 'speech-audio' };
const LANA_VIDEO = { errorType: 'i', tags: 'speech-video' };

const MEDIA_SELECTOR = 'picture, .video-container.video-holder, video';

/* --- Video state --- */

let activeVideoEl = null;
const audioToVideo = new WeakMap();
const enforceGuards = new WeakMap();

function getVideoEl(mediaEl) {
  if (!mediaEl) return null;
  if (mediaEl.tagName === 'VIDEO') return mediaEl;
  return mediaEl.querySelector('video');
}

function syncPausedChrome(videoEl) {
  const host = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
  if (!host) return;
  host.querySelector('.offset-filler')?.classList.remove('is-playing');
  host.querySelector('.pause-play-wrapper')?.setAttribute('aria-pressed', 'false');
}

function clearEnforceGuard(videoEl) {
  const guard = enforceGuards.get(videoEl);
  if (!guard) return;
  videoEl.removeEventListener('play', guard);
  videoEl.removeEventListener('playing', guard);
  enforceGuards.delete(videoEl);
}

/* --- Video lifecycle --- */

function stopVideo(videoEl) {
  if (!videoEl) return;
  clearEnforceGuard(videoEl);
  if (!videoEl.paused) videoEl.pause();
  videoEl.currentTime = 0;
  const enforce = () => {
    try { videoEl.pause(); } catch (_) { /* no-op */ }
    videoEl.currentTime = 0;
    requestAnimationFrame(() => syncPausedChrome(videoEl));
  };
  enforceGuards.set(videoEl, enforce);
  videoEl.addEventListener('play', enforce);
  videoEl.addEventListener('playing', enforce);
  syncPausedChrome(videoEl);
  if (activeVideoEl === videoEl) activeVideoEl = null;
}

function stopMappedVideo(audioEl) {
  stopVideo(audioToVideo.get(audioEl) || null);
}

function playMappedVideo(audioEl) {
  const videoEl = audioToVideo.get(audioEl);
  if (!videoEl) return;
  clearEnforceGuard(videoEl);
  activeVideoEl = videoEl;
  Promise.resolve(videoEl.play()).catch((err) => {
    if (activeVideoEl === videoEl) activeVideoEl = null;
    window.lana?.log(`Error playing video: ${err}`, LANA_VIDEO);
  });
}

function pauseMappedVideo(audioEl) {
  const videoEl = audioToVideo.get(audioEl);
  if (!videoEl) return;
  if (!videoEl.paused) videoEl.pause();
  requestAnimationFrame(() => syncPausedChrome(videoEl));
}

/* --- Audio-video event sync --- */

let audioSyncBound = false;
function bindGlobalAudioVideoSync() {
  if (audioSyncBound) return;
  audioSyncBound = true;

  window.addEventListener(EVT.PLAYED, (e) => {
    const audioEl = e?.detail?.el;
    if (!audioEl) return;
    const videoEl = audioToVideo.get(audioEl);
    if (activeVideoEl && activeVideoEl !== videoEl) {
      stopVideo(activeVideoEl);
    }
    if (!videoEl || !videoEl.paused) return;
    playMappedVideo(audioEl);
  });

  window.addEventListener(EVT.PAUSED, (e) => {
    const audioEl = e?.detail?.el;
    if (!audioEl) return;
    pauseMappedVideo(audioEl);
  });

  window.addEventListener(EVT.STOPPED, (e) => {
    const audioEl = e?.detail?.el;
    if (!audioEl) return;
    stopMappedVideo(audioEl);
  });

  window.addEventListener(EVT.ENDED, (e) => {
    const audioEl = e?.detail?.el;
    if (!audioEl) return;
    stopMappedVideo(audioEl);
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
    container.addEventListener('click', () => {
      clearEnforceGuard(videoEl);
      activeVideoEl = videoEl;
    }, true);
  }
  videoEl.addEventListener('pause', () => { if (!audioEl.paused) audioEl.pause(); });
  videoEl.addEventListener('play', () => {
    if (activeVideoEl !== videoEl) return;
    if (!audioEl.paused) return;
    audioEl.play().catch((err) => window.lana?.log(`Audio play failed: ${err}`, LANA_AUDIO));
  });
}

function forcePauseVideo(videoEl) {
  if (!videoEl) return;
  clearEnforceGuard(videoEl);
  const enforce = () => {
    clearEnforceGuard(videoEl);
    try { videoEl.pause(); } catch (_) { /* no-op */ }
    requestAnimationFrame(() => syncPausedChrome(videoEl));
  };
  enforceGuards.set(videoEl, enforce);
  videoEl.addEventListener('play', enforce);
  videoEl.addEventListener('playing', enforce);
}

/* --- DOM parsing and building --- */

function parseShowcaseItems(el) {
  const directRows = [...el.querySelectorAll(':scope > div')];
  const rows = directRows.length === 1
    ? [...directRows[0].querySelectorAll(':scope > div')]
    : directRows;

  return rows.flatMap((row, index) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    const mediaEl = cols[0]?.querySelector(MEDIA_SELECTOR) || null;
    const flagImg = cols[1]?.querySelector('picture') || null;
    const language = cols[2]?.textContent?.trim() || '';
    const country = cols[3]?.textContent?.trim() || '';
    const audioLink = cols[4]?.querySelector('.audio-player') || null;

    if (!flagImg && !mediaEl) return [];

    return [{
      id: `blade-${index}`,
      language,
      country,
      flagPicture: flagImg,
      audioSrc: audioLink,
      mediaEl,
    }];
  });
}

function buildMediaPanel(items) {
  const panel = createTag('div', { class: 'speech-showcase-media' });
  items.forEach((item, index) => {
    if (!item.mediaEl) return;
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
  const list = createTag('div', { class: 'speech-showcase-blades' });
  items.forEach((item) => {
    const { mediaEl, ...bladeConfig } = item;
    const blade = createSpeechBlade(bladeConfig, { onSelect: (id) => setActiveBlade(root, id) });
    if (bladeConfig.audioSrc && mediaEl) bindVideoToAudio(bladeConfig.audioSrc, mediaEl);
    list.appendChild(blade);
  });
  return list;
}

export default async function init(el) {
  el.classList.add('speech-showcase');
  const items = parseShowcaseItems(el);
  if (!items.length) return;

  const bladesList = buildBladesList(items, el);
  const mediaPanel = buildMediaPanel(items);
  const foreground = createTag('div', { class: 'foreground' });

  foreground.append(mediaPanel, bladesList);
  el.replaceChildren(foreground);

  mediaPanel.querySelectorAll('video').forEach(forcePauseVideo);
}

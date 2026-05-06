import { createTag, loadStyle } from '../../scripts/utils.js';

loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');
import { EVT } from '../../blocks/audio/audio.js';

const LANA_DEFAULTS = { errorType: 'i' };
const LANA_AUDIO = { ...LANA_DEFAULTS, tags: 'speech-audio' };
const LANA_VIDEO = { ...LANA_DEFAULTS, tags: 'speech-video' };

const CLASSES = {
  BLADE: 'speech-blade',
  BLADES: 'speech-blades',
  FLAG: 'speech-blade-flag',
  INFO: 'speech-blade-info',
  LANGUAGE: 'speech-blade-language',
  COUNTRY: 'speech-blade-country',
};

const SELECTORS = {
  AUDIO_PLAYER: '.audio-player',
  AUDIO_PLAY_BTN: '.audio-play-btn',
  AUDIO_EL: 'audio',
  VIDEO_EL: 'video',
};

let activeVideoEl = null;
const audioToVideo = new WeakMap();
export const enforceGuards = new WeakMap();

function getVideoEl(mediaEl) {
  if (!mediaEl) return null;
  if (mediaEl.tagName === 'VIDEO') return mediaEl;
  return mediaEl.querySelector(SELECTORS.VIDEO_EL);
}

export function syncPausedChrome(videoEl) {
  const host = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
  if (!host) return;
  host.querySelector('.offset-filler')?.classList.remove('is-playing');
  host.querySelector('.pause-play-wrapper')?.setAttribute('aria-pressed', 'false');
}

export function clearEnforceGuard(videoEl) {
  const guard = enforceGuards.get(videoEl);
  if (!guard) return;
  videoEl.removeEventListener('play', guard);
  videoEl.removeEventListener('playing', guard);
  enforceGuards.delete(videoEl);
}

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
  const audioEl = audioPlayerEl?.querySelector(SELECTORS.AUDIO_EL);
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

function buildBladeInfo({ language = '', country = '' }) {
  const info = createTag('div', { class: CLASSES.INFO });
  info.append(
    createTag('span', { class: CLASSES.LANGUAGE }, language),
    createTag('span', { class: CLASSES.COUNTRY }, country),
  );
  return info;
}

function buildBladeFlag(flagPicture) {
  const flagWrapper = createTag('div', { class: CLASSES.FLAG });
  if (flagPicture) flagWrapper.appendChild(flagPicture.cloneNode(true));
  return flagWrapper;
}

export function createSpeechBlade(config, callbacks = {}) {
  const blade = createTag('div', {
    class: `${CLASSES.BLADE} ${config.variant || ''}`.trim(),
    'data-blade-id': config.id || '',
  });

  blade.append(buildBladeFlag(config.flagPicture), buildBladeInfo(config));

  if (config.audioSrc) {
    blade.appendChild(config.audioSrc);
    if (config.mediaEl) bindVideoToAudio(config.audioSrc, config.mediaEl);
  }

  blade.addEventListener('click', (e) => {
    if (config.audioSrc) {
      if (config.audioSrc.contains(e.target)) return;
      config.audioSrc.querySelector(SELECTORS.AUDIO_PLAY_BTN)?.click();
    }
    if (callbacks.onSelect) {
      callbacks.onSelect(config.id, blade);
    }
  });

  return blade;
}

export default function init(blades = []) {
  if (!Array.isArray(blades) || !blades.length) return null;
  bindGlobalAudioVideoSync();

  const wrapper = createTag('div', { class: CLASSES.BLADES });
  blades.forEach((cfg) => wrapper.appendChild(createSpeechBlade(cfg)));

  return wrapper;
}

import { createTag } from '../../scripts/utils.js';

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

const AUDIO_EVENTS = {
  PLAYED: 'audio-played',
  STOPPED: 'audio-stopped',
};

const activeMedia = {
  video: { el: null },
};
const audioToVideo = new WeakMap();

function getVideoEl(mediaEl) {
  if (!mediaEl) return null;
  if (mediaEl.tagName === 'VIDEO') return mediaEl;
  return mediaEl.querySelector(SELECTORS.VIDEO_EL);
}

function resetActiveVideo() {
  activeMedia.video.el = null;
}

function stopVideo(videoEl) {
  if (!videoEl) return;
  if (!videoEl.paused) videoEl.pause();
  videoEl.currentTime = 0;
  const host = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
  console.log('host', host?.querySelector('.offset-filler')?.classList);
  host?.querySelector('.offset-filler')?.classList.remove('is-playing');
  if (activeMedia.video.el === videoEl) resetActiveVideo();
}

function stopActiveVideo(exceptVideoEl = null) {
  const { el: currentEl } = activeMedia.video;
  if (currentEl && currentEl !== exceptVideoEl) stopVideo(currentEl);
}

function stopMappedVideo(audioEl) {
  console.log('stopVideo', audioEl);
  console.log('stopVideo', audioToVideo.get(audioEl));
  stopVideo(audioToVideo.get(audioEl) || null);
}

let audioPlayedSyncBound = false;
function bindGlobalAudioToVideoStop() {
  if (audioPlayedSyncBound) return;
  audioPlayedSyncBound = true;

  window.addEventListener(AUDIO_EVENTS.PLAYED, (e) => {
    const audioEl = e?.detail?.el;
    const mappedVideoEl = audioToVideo.get(audioEl) || null;
    stopActiveVideo(mappedVideoEl);
  });

  // Stop/reset the paired video only when audio.js explicitly performs stop().
  window.addEventListener(AUDIO_EVENTS.STOPPED, (e) => stopMappedVideo(e?.detail?.el));
}

function toggleVideo(mediaEl) {
  const videoEl = getVideoEl(mediaEl);
  if (!videoEl) return;

  const { el: currentEl } = activeMedia.video;

  if (currentEl === videoEl && !videoEl.paused) {
    videoEl.pause();
    const host = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
    host?.querySelector('.offset-filler')?.classList.remove('is-playing');
    resetActiveVideo();
    return;
  }

  if (currentEl && currentEl !== videoEl && !currentEl.paused) {
    stopVideo(currentEl);
  }

  activeMedia.video.el = videoEl;

  // Normalize sync / async returns from HTMLMediaElement.play().
  Promise.resolve(videoEl.play()).catch((err) => {
    if (activeMedia.video.el === videoEl) resetActiveVideo();
    window.lana?.log(`Error playing video: ${err}`, LANA_VIDEO);
  });
}

function bindVideoToAudio(audioPlayerEl, mediaEl) {
  const videoEl = getVideoEl(mediaEl);
  const audioEl = audioPlayerEl?.querySelector(SELECTORS.AUDIO_EL);
  if (!videoEl || !audioEl) return;
  audioToVideo.set(audioEl, videoEl);
  videoEl.addEventListener('pause', () => { if (!audioEl.paused) audioEl.pause(); });
  videoEl.addEventListener('play', () => {
    if (activeMedia.video.el !== videoEl) return;
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
      toggleVideo(config.mediaEl);
    }
  });

  return blade;
}

export default function init(blades = []) {
  if (!Array.isArray(blades) || !blades.length) return null;
  bindGlobalAudioToVideoStop();

  const wrapper = createTag('div', { class: CLASSES.BLADES });
  blades.forEach((cfg) => wrapper.appendChild(createSpeechBlade(cfg)));

  return wrapper;
}

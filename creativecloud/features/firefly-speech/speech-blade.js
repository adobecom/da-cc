import { createTag } from '../../scripts/utils.js';
import { stopAudioPlayer } from '../../blocks/audio/audio.js';

const LANA_DEFAULTS = { errorType: 'i' };
const LANA_AUDIO = { ...LANA_DEFAULTS, tags: 'speech-audio' };
const LANA_VIDEO = { ...LANA_DEFAULTS, tags: 'speech-video' };

const BLADE_STATE = Object.freeze({
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ERROR: 'error',
});

const ALL_BLADE_STATES = Object.values(BLADE_STATE);

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


const activeMedia = {
  video: { el: null, blade: null },
  audio: { blade: null },
};

function getVideoEl(mediaEl) {
  if (!mediaEl) return null;
  if (mediaEl.tagName === 'VIDEO') return mediaEl;
  return mediaEl.querySelector(SELECTORS.VIDEO_EL);
}

function setBladeState(bladeEl, state) {
  if (!bladeEl) return;
  bladeEl.classList.remove(...ALL_BLADE_STATES);
  if (state) bladeEl.classList.add(state);
}

function resetActiveVideo() {
  activeMedia.video.el = null;
  activeMedia.video.blade = null;
}

function toggleVideo(mediaEl, bladeEl) {
  const videoEl = getVideoEl(mediaEl);
  if (!videoEl) return;

  const { el: currentEl, blade: currentBlade } = activeMedia.video;

  if (currentEl === videoEl && !videoEl.paused) {
    videoEl.pause();
    setBladeState(bladeEl, BLADE_STATE.PAUSED);
    resetActiveVideo();
    return;
  }

  if (currentEl && currentEl !== videoEl) {
    if (!currentEl.paused) currentEl.pause();
    setBladeState(currentBlade, null);
  }

  setBladeState(bladeEl, BLADE_STATE.LOADING);
  activeMedia.video.el = videoEl;
  activeMedia.video.blade = bladeEl;

  // Normalize sync / async returns from HTMLMediaElement.play().
  Promise.resolve(videoEl.play()).then(() => {
    if (activeMedia.video.el === videoEl) setBladeState(bladeEl, BLADE_STATE.PLAYING);
  }).catch((err) => {
    if (activeMedia.video.el === videoEl) {
      setBladeState(bladeEl, BLADE_STATE.ERROR);
      resetActiveVideo();
    }
    window.lana?.log(`Error playing video: ${err}`, LANA_VIDEO);
  });
}


function bindAudioState(bladeEl, audioPlayerEl) {
  const audio = audioPlayerEl.querySelector(SELECTORS.AUDIO_EL);
  if (!audio) return;

  audio.addEventListener('play', () => {
    setBladeState(bladeEl, BLADE_STATE.PLAYING);
    const previousBlade = activeMedia.audio.blade;
    if (previousBlade && previousBlade !== bladeEl) {
      stopAudioPlayer(previousBlade.querySelector(SELECTORS.AUDIO_PLAYER));
    }
    activeMedia.audio.blade = bladeEl;
  });

  audio.addEventListener('pause', () => {
    if (!audio.ended) setBladeState(bladeEl, BLADE_STATE.PAUSED);
  });

  audio.addEventListener('ended', () => setBladeState(bladeEl, null));

  audio.addEventListener('waiting', () => setBladeState(bladeEl, BLADE_STATE.LOADING));

  audio.addEventListener('error', () => {
    setBladeState(bladeEl, 'error');
    window.lana?.log(`Error loading audio: ${audio.currentSrc || audio.src}`, LANA_AUDIO);
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
    bindAudioState(blade, config.audioSrc);
  }

  blade.addEventListener('click', (e) => {
    if (config.audioSrc) {
      if (config.audioSrc.contains(e.target)) return;
      config.audioSrc.querySelector(SELECTORS.AUDIO_PLAY_BTN)?.click();
    }
    if (callbacks.onSelect) {
      callbacks.onSelect(config.id, blade);
      toggleVideo(config.mediaEl, blade);
    }
  });

  return blade;
}

export default function init(blades = []) {
  if (!Array.isArray(blades) || !blades.length) return null;

  const wrapper = createTag('div', { class: CLASSES.BLADES });
  blades.forEach((cfg) => wrapper.appendChild(createSpeechBlade(cfg)));

  return wrapper;
}

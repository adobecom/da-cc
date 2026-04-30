export default function defineDeviceByScreenSize() {
  const DESKTOP_SIZE = 1200;
  const MOBILE_SIZE = 600;
  const screenWidth = window.innerWidth;
  if (screenWidth >= DESKTOP_SIZE) {
    return 'DESKTOP';
  }
  if (screenWidth <= MOBILE_SIZE) {
    return 'MOBILE';
  }
  return 'TABLET';
}

let globalAudioController;

export function getGlobalAudioController() {
  if (!globalAudioController) {
    const controllers = new Set();
    globalAudioController = {
      register(ctrl) { controllers.add(ctrl); },
      unregister(ctrl) { controllers.delete(ctrl); },
      requestPlayback(requester) {
        controllers.forEach((ctrl) => {
          if (ctrl !== requester) ctrl.pause();
        });
      },
      destroy() { controllers.clear(); globalAudioController = undefined; },
    };
  }
  return globalAudioController;
}

let sharedAudio;
let activeBladeEl;
let lastPausedBladeEl;
let activeRequestId = 0;

const audioController = {
  pause() {
    if (sharedAudio && !sharedAudio.paused) sharedAudio.pause();
    if (activeBladeEl) {
      activeBladeEl.classList.remove('playing', 'loading');
      activeBladeEl.classList.add('paused');
      const btn = activeBladeEl.querySelector('.speech-blade-play');
      if (btn) btn.setAttribute('aria-label', btn.dataset.playLabel || 'Play');
      lastPausedBladeEl = activeBladeEl;
    }
    activeBladeEl = null;
  },
};

function getSharedAudio() {
  if (!sharedAudio) {
    sharedAudio = document.createElement('audio');
    sharedAudio.preload = 'none';
    getGlobalAudioController().register(audioController);
  }
  return sharedAudio;
}

/**
 * Plays an audio source and binds playback state to a blade element.
 * Pauses any other audio on the page via GlobalAudioController.
 * @param {string} audioSrc - URL to the mp3/audio file
 * @param {HTMLElement} bladeEl - the blade element to update state on
 */
export function playAudio(audioSrc, bladeEl) {
  const audio = getSharedAudio();
  getGlobalAudioController().requestPlayback(audioController);

  if (activeBladeEl === bladeEl && !audio.paused) {
    audioController.pause();
    return;
  }

  if (activeBladeEl && activeBladeEl !== bladeEl) {
    activeBladeEl.classList.remove('playing', 'loading');
  }

  if (lastPausedBladeEl && lastPausedBladeEl !== bladeEl) {
    lastPausedBladeEl.classList.remove('paused');
  }
  lastPausedBladeEl = null;

  activeBladeEl = bladeEl;
  activeRequestId += 1;
  const requestId = activeRequestId;

  bladeEl.classList.remove('paused', 'error');
  bladeEl.classList.add('loading');

  audio.src = audioSrc;
  audio.load();

  const onCanPlay = () => {
    if (requestId !== activeRequestId) return;
    bladeEl.classList.remove('loading');
    bladeEl.classList.add('playing');
    const btn = bladeEl.querySelector('.speech-blade-play');
    if (btn) btn.setAttribute('aria-label', btn.dataset.pauseLabel || 'Pause');
  };

  const onEnded = () => {
    if (requestId !== activeRequestId) return;
    bladeEl.classList.remove('playing');
    const btn = bladeEl.querySelector('.speech-blade-play');
    if (btn) btn.setAttribute('aria-label', btn.dataset.playLabel || 'Play');
    activeBladeEl = null;
  };

  const onError = () => {
    if (requestId !== activeRequestId) return;
    bladeEl.classList.remove('loading', 'playing');
    bladeEl.classList.add('error');
    activeBladeEl = null;
    window.lana?.log(`Error loading audio: ${audioSrc}`, { tags: 'speech-audio', errorType: 'i' });
  };

  audio.addEventListener('canplay', onCanPlay, { once: true });
  audio.addEventListener('ended', onEnded, { once: true });
  audio.addEventListener('error', onError, { once: true });

  audio.play().catch((err) => {
    if (requestId !== activeRequestId) return;
    bladeEl.classList.remove('loading', 'playing');
    bladeEl.classList.add('error');
    activeBladeEl = null;
    window.lana?.log(`Error playing audio: ${err}`, { tags: 'speech-audio', errorType: 'i' });
  });
}

/**
 * Pauses any currently playing audio.
 */
export function pauseAudio() {
  audioController.pause();
}

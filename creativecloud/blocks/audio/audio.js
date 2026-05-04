import { createTag } from '../../scripts/utils.js';
import { getGlobalMediaBus } from '../../scripts/decorate.js';

const LANA_OPTIONS = { tags: 'audio', errorType: 'i' };

const SIZE = 40;
const RING_RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CENTER = SIZE / 2;

const ARIA = {
  PLAY: 'Play audio',
  PAUSE: 'Pause audio',
};

const PLAY_PATH = '<path d="M26.1463 18.2381L16.9468 13.2938C15.6144 12.5777 14 13.5429 14 15.0555V24.944C14 26.4567 15.6144 27.4218 16.9468 26.7057L26.1463 21.7615C27.5505 21.0067 27.5505 18.9928 26.1463 18.2381Z" fill="currentColor"/>';
const PAUSE_PATH = '<rect x="14" y="13" width="4.5" height="14" fill="currentColor"/><rect x="21.5" y="13" width="4.5" height="14" fill="currentColor"/>';
const wrapperToCtrl = new WeakMap();

function setIcon(svg, isPlaying) {
  svg.querySelector('.audio-icon').innerHTML = isPlaying ? PAUSE_PATH : PLAY_PATH;
}

function updateProgress(svg, ratio) {
  svg.querySelector('.audio-progress').setAttribute('stroke-dashoffset', CIRCUMFERENCE * ratio);
}

function attachAudioListeners(audio, btn, svg) {
  const mediaBus = getGlobalMediaBus();
  const ctrl = {
    pause() { if (!audio.paused) audio.pause(); },
    stop() {
      if (!audio.paused) audio.pause();
      audio.currentTime = 0;
    },
  };


  mediaBus.subscribe('media-played', (payload) => {
    if (!payload || payload.source === ctrl) return;
    if (payload.type === 'audio') ctrl.pause();
    else ctrl.stop();
  });


  mediaBus.subscribe('pause-all', (payload) => {
    if (payload?.except === ctrl) return;
    ctrl.pause();
  });
  mediaBus.subscribe('stop-all', (payload) => {
    if (payload?.except === ctrl) return;
    ctrl.stop();
  });

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch((err) => window.lana?.log(`Audio play failed: ${err}`, LANA_OPTIONS));
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', () => {
    mediaBus.publish('media-played', { source: ctrl, type: 'audio', el: audio });
    btn.setAttribute('aria-label', ARIA.PAUSE);
    btn.setAttribute('title', ARIA.PAUSE);
    setIcon(svg, true);
  });

  audio.addEventListener('pause', () => {
    if (!audio.ended) {
      mediaBus.publish('media-paused', { source: ctrl, type: 'audio', el: audio });
    }
    btn.setAttribute('aria-label', ARIA.PLAY);
    btn.setAttribute('title', ARIA.PLAY);
    setIcon(svg, false);
  });

  audio.addEventListener('ended', () => {
    mediaBus.publish('media-ended', { source: ctrl, type: 'audio', el: audio });
    btn.setAttribute('aria-label', ARIA.PLAY);
    btn.setAttribute('title', ARIA.PLAY);
    setIcon(svg, false);
    updateProgress(svg, 0);
  });

  audio.addEventListener('timeupdate', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      updateProgress(svg, audio.currentTime / audio.duration);
    }
  });

  return ctrl;
}

function buildPlayerSvg() {
  const div = document.createElement('div');
  div.innerHTML = `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" fill="none" aria-hidden="true">
    <circle cx="${CENTER}" cy="${CENTER}" r="${RING_RADIUS}" stroke="currentColor" stroke-opacity="0.01" stroke-width="3"/>
    <circle class="audio-progress" cx="${CENTER}" cy="${CENTER}" r="${RING_RADIUS}"
      stroke="currentColor" stroke-width="3" stroke-linecap="round"
      stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"
      transform="rotate(-90 ${CENTER} ${CENTER})"/>
    <g class="audio-icon">${PLAY_PATH}</g>
  </svg>`;
  return div.firstElementChild;
}

function buildAudioPlayer(src) {
  const audio = createTag('audio', { preload: 'metadata', src });
  const svg = buildPlayerSvg();
  const playBtn = createTag('button', {
    class: 'audio-play-btn',
    type: 'button',
    'aria-label': ARIA.PLAY,
    title: ARIA.PLAY,
  });
  playBtn.appendChild(svg);

  const ctrl = attachAudioListeners(audio, playBtn, svg);

  const wrapper = createTag('div', { class: 'audio-player' });
  wrapper.append(playBtn, audio);
  wrapperToCtrl.set(wrapper, ctrl);
  return wrapper;
}

export function stopAudioPlayer(wrapperEl) {
  if (!wrapperEl) return;
  wrapperToCtrl.get(wrapperEl)?.stop?.();
}

export default function init(a) {
  try {
    a.replaceWith(buildAudioPlayer(a.href));
  } catch (err) {
    window.lana?.log(`Audio link failed to initialize: ${err}`, LANA_OPTIONS);
  }
}

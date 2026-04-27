import { createTag } from '../../scripts/utils.js';

// ===== CONFIG =====

const LANA_OPTIONS = { tags: 'audio', errorType: 'i' };

const CONFIG = {
  SIZE: 40,
  RING_RADIUS: 16,
  get CIRCUMFERENCE() { return 2 * Math.PI * this.RING_RADIUS; },
};

const ARIA = {
  PLAY: 'Play audio',
  PAUSE: 'Pause audio',
};

// ===== SVG =====

const PLAY_PATH = '<path d="M26.1463 18.2381L16.9468 13.2938C15.6144 12.5777 14 13.5429 14 15.0555V24.944C14 26.4567 15.6144 27.4218 16.9468 26.7057L26.1463 21.7615C27.5505 21.0067 27.5505 18.9928 26.1463 18.2381Z" fill="currentColor"/>';
const PAUSE_PATH = '<rect x="14" y="13" width="4.5" height="14" fill="currentColor"/><rect x="21.5" y="13" width="4.5" height="14" fill="currentColor"/>';

// ===== UTILITIES =====

function setIcon(svg, isPlaying) {
  svg.querySelector('.audio-icon').innerHTML = isPlaying ? PAUSE_PATH : PLAY_PATH;
}

function updateProgress(svg, ratio) {
  svg.querySelector('.audio-progress').setAttribute('stroke-dashoffset', CONFIG.CIRCUMFERENCE * ratio);
}

// ===== EVENT HANDLING =====

function attachAudioListeners(audio, btn, svg) {
  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch((err) => window.lana?.log(`Audio play failed: ${err}`, LANA_OPTIONS));
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', () => {
    btn.setAttribute('aria-label', ARIA.PAUSE);
    setIcon(svg, true);
  });

  audio.addEventListener('pause', () => {
    btn.setAttribute('aria-label', ARIA.PLAY);
    setIcon(svg, false);
  });

  audio.addEventListener('ended', () => {
    btn.setAttribute('aria-label', ARIA.PLAY);
    setIcon(svg, false);
    updateProgress(svg, 0);
  });

  audio.addEventListener('timeupdate', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      updateProgress(svg, audio.currentTime / audio.duration);
    }
  });
}

// ===== DOM BUILDING =====

function buildPlayerSvg() {
  const { SIZE, RING_RADIUS, CIRCUMFERENCE } = CONFIG;
  const div = document.createElement('div');
  div.innerHTML = `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="${RING_RADIUS}" stroke="currentColor" stroke-opacity="0.01" stroke-width="3"/>
    <circle class="audio-progress" cx="20" cy="20" r="${RING_RADIUS}"
      stroke="currentColor" stroke-width="3" stroke-linecap="round"
      stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"
      transform="rotate(-90 20 20)"/>
    <g class="audio-icon">${PLAY_PATH}</g>
  </svg>`;
  return div.firstElementChild;
}

function buildAudioPlayer(src) {
  const audio = createTag('audio', { preload: 'metadata', src });
  const svg = buildPlayerSvg();
  const btn = createTag('button', {
    class: 'audio-play-btn',
    type: 'button',
    'aria-label': ARIA.PLAY,
  });
  btn.appendChild(svg);

  attachAudioListeners(audio, btn, svg);

  const wrapper = createTag('div', { class: 'audio-player' });
  wrapper.append(btn, audio);
  return wrapper;
}

// ===== INIT =====

export default function init(a) {
  try {
    a.replaceWith(buildAudioPlayer(a.href));
  } catch (err) {
    window.lana?.log(`Audio link failed to initialize: ${err}`, LANA_OPTIONS);
  }
}

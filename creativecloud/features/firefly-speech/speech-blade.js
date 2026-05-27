import { createTag, loadStyle } from '../../scripts/utils.js';

loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');

const CLASSES = {
  BLADE: 'speech-blade',
  CONTROL: 'speech-blade-control',
  BLADES: 'speech-blades',
  FLAG: 'speech-blade-flag',
  INFO: 'speech-blade-info',
  LANGUAGE: 'speech-blade-language',
  COUNTRY: 'speech-blade-country',
};

const SELECTORS = { AUDIO_PLAY_BTN: '.audio-play-btn' };

function formatBladeName(language = '', country = '') {
  const lang = (language || '').trim();
  let ctry = (country || '').trim();
  if (ctry.startsWith('(') && ctry.endsWith(')')) ctry = ctry.slice(1, -1).trim();
  if (lang && ctry) return `${lang} (${ctry})`;
  if (lang) return lang;
  if (ctry) return ctry;
  return 'audio sample';
}

function labelIds(bladeId) {
  const base = bladeId || 'speech-blade';
  return {
    language: `${base}-language`,
    country: `${base}-country`,
  };
}

function buildBladeInfo({ language = '', country = '' }, ids) {
  const info = createTag('div', { class: CLASSES.INFO });
  info.append(
    createTag('span', { id: ids.language, class: CLASSES.LANGUAGE }, language),
    createTag('span', { id: ids.country, class: CLASSES.COUNTRY }, country),
  );
  return info;
}

function buildBladeFlag(flagPicture) {
  const flagWrapper = createTag('div', { class: CLASSES.FLAG });
  if (flagPicture) flagWrapper.appendChild(flagPicture.cloneNode(true));
  return flagWrapper;
}

function observeBlade(blade, audioSrc) {
  if (!audioSrc) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) return;
    const audio = audioSrc.querySelector('audio');
    if (audio && !audio.paused) audio.pause();
  }, { threshold: 0 });
  observer.observe(blade);
}

function bindBladeA11y(controlBtn, playBtn, audioEl, language, country) {
  const sync = () => {
    const playing = !audioEl.paused && !audioEl.ended;
    const name = formatBladeName(language, country);
    controlBtn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${name}`);
    controlBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playBtn.removeAttribute('aria-label');
    playBtn.removeAttribute('title');
    playBtn.removeAttribute('aria-labelledby');
  };

  sync();
  audioEl.addEventListener('play', sync);
  audioEl.addEventListener('pause', sync);
  audioEl.addEventListener('ended', sync);
  controlBtn.addEventListener('click', () => {
    playBtn.click();
    queueMicrotask(sync);
  });
}

export function createSpeechBlade(config, callbacks = {}) {
  const blade = createTag('div', {
    class: `${CLASSES.BLADE} ${config.variant || ''}`.trim(),
    'data-blade-id': config.id || '',
  });
  const ids = labelIds(config.id);

  blade.append(buildBladeFlag(config.flagPicture), buildBladeInfo(config, ids));

  if (config.audioSrc) {
    blade.appendChild(config.audioSrc);
    config.audioSrc.setAttribute('aria-hidden', 'true');
    observeBlade(blade, config.audioSrc);
    const playBtn = config.audioSrc.querySelector(SELECTORS.AUDIO_PLAY_BTN);
    const audioEl = config.audioSrc.querySelector('audio');
    if (playBtn && audioEl) {
      playBtn.setAttribute('tabindex', '-1');
      playBtn.setAttribute('aria-hidden', 'true');
      const controlBtn = createTag('button', { type: 'button', class: CLASSES.CONTROL });
      blade.append(controlBtn);
      bindBladeA11y(controlBtn, playBtn, audioEl, config.language, config.country);
    }
  } else {
    blade.setAttribute('tabindex', '0');
    blade.setAttribute('role', 'button');
    blade.setAttribute('aria-label', `Select ${formatBladeName(config.language, config.country)}`);
  }

  blade.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      blade.click();
    }
  });

  blade.addEventListener('click', (e) => {
    if (config.audioSrc && !config.audioSrc.contains(e.target) && !e.target.closest(`.${CLASSES.CONTROL}`)) {
      config.audioSrc.querySelector(SELECTORS.AUDIO_PLAY_BTN)?.click();
    }
    if (callbacks.onSelect) callbacks.onSelect(config.id, blade);
  });

  return blade;
}

export default function init(blades = []) {
  if (!Array.isArray(blades) || !blades.length) return null;

  const wrapper = createTag('div', { class: CLASSES.BLADES });
  const setSelected = (id) => {
    wrapper.querySelectorAll(`.${CLASSES.BLADE}`).forEach((b) => {
      b.classList.toggle('selected', b.dataset.bladeId === id);
    });
  };
  blades.forEach((cfg) => wrapper.appendChild(createSpeechBlade(cfg, { onSelect: setSelected })));

  return wrapper;
}

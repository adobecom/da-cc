import { createTag, loadStyle } from '../../scripts/utils.js';

loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');

const CLASSES = {
  BLADE: 'speech-blade',
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
    action: `${base}-action`,
    language: `${base}-language`,
    country: `${base}-country`,
  };
}

function buildBladeInfo({ language = '', country = '' }, ids) {
  const info = createTag('div', { class: CLASSES.INFO, 'aria-hidden': 'true' });
  info.append(
    createTag('span', { id: ids.language, class: CLASSES.LANGUAGE }, language),
    createTag('span', { id: ids.country, class: CLASSES.COUNTRY }, country),
  );
  return info;
}

function buildBladeFlag(flagPicture) {
  const flag = createTag('div', { class: CLASSES.FLAG });
  if (flagPicture) flag.appendChild(flagPicture.cloneNode(true));
  return flag;
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

function bindBladeA11y(playBtn, audioEl, ids) {
  const actionLabel = createTag('span', { id: ids.action, class: 'sr-only' }, 'Play');
  playBtn.prepend(actionLabel);
  playBtn.dataset.bladeControlled = 'true';
  const labelledBy = `${ids.action} ${ids.language} ${ids.country}`;

  const sync = () => {
    const playing = !audioEl.paused && !audioEl.ended;
    actionLabel.textContent = playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playBtn.removeAttribute('title');

    if (playing) {
      playBtn.setAttribute('aria-label', 'Pause');
      playBtn.removeAttribute('aria-labelledby');
    } else {
      playBtn.setAttribute('aria-labelledby', labelledBy);
      playBtn.removeAttribute('aria-label');
    }
  };

  sync();
  audioEl.addEventListener('play', sync);
  audioEl.addEventListener('pause', sync);
  audioEl.addEventListener('ended', sync);
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
    observeBlade(blade, config.audioSrc);
    const playBtn = config.audioSrc.querySelector(SELECTORS.AUDIO_PLAY_BTN);
    const audioEl = config.audioSrc.querySelector('audio');
    if (playBtn && audioEl) bindBladeA11y(playBtn, audioEl, ids);
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
    if (config.audioSrc && !config.audioSrc.contains(e.target)) {
      config.audioSrc.querySelector(SELECTORS.AUDIO_PLAY_BTN)?.click();
    }
    if (callbacks.onSelect) callbacks.onSelect(config.id, blade);
  });

  return blade;
}

export default function init(blades = [], { onSelect } = {}) {
  if (!Array.isArray(blades) || !blades.length) return null;

  const wrapper = createTag('div', { class: CLASSES.BLADES });
  const setSelected = (id) => {
    wrapper.querySelectorAll(`.${CLASSES.BLADE}`).forEach((b) => {
      b.classList.toggle('selected', b.dataset.bladeId === id);
    });
  };
  const selectFn = (id) => {
    setSelected(id);
    onSelect?.(id);
  };

  blades.forEach((cfg) => wrapper.appendChild(createSpeechBlade(cfg, { onSelect: selectFn })));
  if (blades[0]?.id) setSelected(blades[0].id);

  return wrapper;
}

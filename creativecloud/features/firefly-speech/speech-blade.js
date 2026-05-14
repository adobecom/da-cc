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

function observeBlade(blade, audioSrc) {
  if (!audioSrc) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) return;
    const audio = audioSrc.querySelector('audio');
    if (audio && !audio.paused) audio.pause();
  }, { threshold: 0 });
  observer.observe(blade);
}

export function createSpeechBlade(config, callbacks = {}) {
  const blade = createTag('div', {
    class: `${CLASSES.BLADE} ${config.variant || ''}`.trim(),
    'data-blade-id': config.id || '',
    tabindex: '0',
  });

  blade.append(buildBladeFlag(config.flagPicture), buildBladeInfo(config));

  if (config.audioSrc) {
    blade.appendChild(config.audioSrc);
    observeBlade(blade, config.audioSrc);
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
    if (callbacks.onSelect) {
      callbacks.onSelect(config.id, blade);
    }
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

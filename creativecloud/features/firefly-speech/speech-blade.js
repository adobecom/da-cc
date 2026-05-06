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

export function createSpeechBlade(config, callbacks = {}) {
  const blade = createTag('div', {
    class: `${CLASSES.BLADE} ${config.variant || ''}`.trim(),
    'data-blade-id': config.id || '',
  });

  blade.append(buildBladeFlag(config.flagPicture), buildBladeInfo(config));

  if (config.audioSrc) {
    blade.appendChild(config.audioSrc);
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

  const wrapper = createTag('div', { class: CLASSES.BLADES });
  blades.forEach((cfg) => wrapper.appendChild(createSpeechBlade(cfg)));

  return wrapper;
}

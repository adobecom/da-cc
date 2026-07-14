import initSpeechBlades from '../../features/firefly-speech/speech-blade.js';

function parseBlades(el, variant) {
  return [...el.querySelectorAll(':scope > div')].map((row, index) => {
    const columns = [...row.querySelectorAll(':scope > div')];
    const flagImg = columns[0]?.querySelector('picture') || null;
    const language = columns[1]?.textContent?.trim() || '';
    const country = columns[2]?.textContent?.trim() || '';
    const audioLink = columns[3]?.querySelector('.audio-player') || null;

    return {
      id: `speech-panel-blade-${index}`,
      language,
      country,
      flagPicture: flagImg,
      audioSrc: audioLink,
      variant,
    };
  });
}

export default function init(el) {
  const variant = [...el.classList].filter((c) => c !== 'speech-translation-panel').join(' ');
  const blades = parseBlades(el, variant);
  const list = initSpeechBlades(blades);
  if (list) el.replaceChildren(list);
}

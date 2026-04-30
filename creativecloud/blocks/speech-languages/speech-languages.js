import { loadStyle } from '../../scripts/utils.js';
import initSpeechBlades from '../../features/firefly-speech/speech-blade.js';

function parseBlades(el) {
  return [...el.querySelectorAll(':scope > div')].map((row, index) => {
    const flagImg = row.querySelector('picture');
    const audioLink = row.querySelector('a[href]');
    const textPs = [...row.querySelectorAll('p')]
      .filter((p) => !p.querySelector('picture')
        && !p.querySelector('a[href]')
        && p.textContent.trim());

    return {
      id: `blade-${index}`,
      language: textPs[0]?.textContent.trim() || '',
      country: textPs[1]?.textContent.trim() || '',
      flagPicture: flagImg,
      flagAlt: flagImg?.querySelector('img')?.alt || '',
      audioSrc: audioLink?.href || '',
    };
  });
}

export default async function init(el) {
  console.log('speech-languages init', el);
  loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');
  const blades = parseBlades(el);
  const list = initSpeechBlades(blades);
  if (list) el.replaceChildren(list);
}

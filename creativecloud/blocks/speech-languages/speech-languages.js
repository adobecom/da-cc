import { loadStyle } from '../../scripts/utils.js';
import initSpeechBlades from '../../features/firefly-speech/speech-blade.js';

function parseBlades(el) {
  return [...el.querySelectorAll(':scope > div')].map((row, index) => {
    const columns = [...row.querySelectorAll(':scope > div')];
    const flagImg = columns[0]?.querySelector('picture') || null;
    const language = columns[1]?.textContent?.trim() || '';
    const country = columns[2]?.textContent?.trim() || '';
    const audioLink = columns[3]?.querySelector('.audio-player') || null;

    return {
      id: `blade-${index}`,
      language,
      country,
      flagPicture: flagImg,
      flagAlt: flagImg?.querySelector('img')?.alt || '',
      audioSrc: audioLink || '',
    };
  });
}

export default async function init(el) {
  console.log('eeeeeeeeeeeeeeeee', el);
  loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');
  const blades = parseBlades(el);
  const list = initSpeechBlades(blades);
  if (list) el.replaceChildren(list);
}

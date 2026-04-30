import { createTag, loadStyle } from '../../scripts/utils.js';
import { createSpeechBlade } from '../../features/firefly-speech/speech-blade.js';

const MEDIA_SELECTOR = 'picture, .video-container.video-holder, video';

function parseShowcaseItems(el) {
  return [...el.querySelectorAll(':scope > div')].flatMap((row, index) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    const bladeCol = cols[0] || row;
    const mediaCol = cols[1];

    const flagImg = bladeCol.querySelector('picture');
    const audioLink = bladeCol.querySelector('a[href]');
    const textPs = [...bladeCol.querySelectorAll('p')]
      .filter((p) => !p.querySelector('picture')
        && !p.querySelector('a[href]')
        && p.textContent.trim());

    const mediaEl = mediaCol?.querySelector(MEDIA_SELECTOR) || null;
    if (!flagImg && !mediaEl) return [];

    return [{
      id: `blade-${index}`,
      language: textPs[0]?.textContent.trim() || '',
      country: textPs[1]?.textContent.trim() || '',
      flagPicture: flagImg,
      flagAlt: flagImg?.querySelector('img')?.alt || '',
      audioSrc: audioLink?.href || '',
      mediaEl,
    }];
  });
}

function buildMediaPanel(items) {
  const panel = createTag('div', { class: 'speech-showcase-media' });
  items.forEach((item, index) => {
    if (!item.mediaEl) return;
    const slot = createTag('div', {
      class: `speech-showcase-media-slot${index === 0 ? ' is-active' : ''}`,
      'data-blade-id': item.id,
    });
    slot.appendChild(item.mediaEl);
    panel.appendChild(slot);
  });
  return panel;
}

function setActiveBlade(root, id) {
  root.querySelectorAll('.speech-blade').forEach((b) => {
    b.classList.toggle('selected', b.dataset.bladeId === id);
  });
  root.querySelectorAll('.speech-showcase-media-slot').forEach((s) => {
    s.classList.toggle('is-active', s.dataset.bladeId === id);
  });
}

function buildBladesList(items, root) {
  const list = createTag('div', { class: 'speech-showcase-blades' });
  items.forEach((item, index) => {
    const blade = createSpeechBlade(item, { onSelect: (id) => setActiveBlade(root, id) });
    if (index === 0) blade.classList.add('selected');
    list.appendChild(blade);
  });
  return list;
}

export default async function init(el) {
  loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');

  const items = parseShowcaseItems(el);
  if (!items.length) return;

  const bladesList = buildBladesList(items, el);
  const mediaPanel = buildMediaPanel(items);

  el.replaceChildren(bladesList, mediaPanel);
  // TODO: create MediaController (delegates to Milo global video ctrl)
}

import { createTag, loadStyle } from '../../scripts/utils.js';
import { createSpeechBlade } from '../../features/firefly-speech/speech-blade.js';

const MEDIA_SELECTOR = 'picture, .video-container.video-holder, video';

function parseShowcaseItems(el) {
  const directRows = [...el.querySelectorAll(':scope > div')];
  const rows = directRows.length === 1
    ? [...directRows[0].querySelectorAll(':scope > div')]
    : directRows;

  return rows.flatMap((row, index) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    const flagImg = cols[0]?.querySelector('picture') || null;
    const language = cols[1]?.textContent?.trim() || '';
    const country = cols[2]?.textContent?.trim() || '';
    const audioLink = cols[3]?.querySelector('.audio-player') || null;
    const mediaEl = cols[4]?.querySelector(MEDIA_SELECTOR) || null;

    if (!flagImg && !mediaEl) return [];

    return [{
      id: `blade-${index}`,
      language,
      country,
      flagPicture: flagImg,
      flagAlt: flagImg?.querySelector('img')?.alt || '',
      audioSrc: audioLink || '',
      mediaEl,
    }];
  });
}

function syncPausedChrome(videoEl) {
  const host = videoEl.closest('.video-container.video-holder') || videoEl.parentElement;
  if (!host) return;
  host.querySelector('.offset-filler')?.classList.remove('is-playing');
  host.querySelector('.pause-play-wrapper')?.setAttribute('aria-pressed', 'false');
}

function forcePauseVideo(videoEl) {
  if (!videoEl) return;
  const enforce = () => {
    videoEl.removeEventListener('play', enforce);
    videoEl.removeEventListener('playing', enforce);
    try { videoEl.pause(); } catch (_) { /* no-op */ }
    requestAnimationFrame(() => syncPausedChrome(videoEl));
  };
  videoEl.addEventListener('play', enforce);
  videoEl.addEventListener('playing', enforce);
}

function buildMediaPanel(items) {
  const panel = createTag('div', { class: 'context-panel-media' });
  items.forEach((item, index) => {
    if (!item.mediaEl) return;
    const slot = createTag('div', {
      class: `context-panel-media-slot${index === 0 ? ' is-active' : ''}`,
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
  root.querySelectorAll('.context-panel-media-slot').forEach((s) => {
    s.classList.toggle('is-active', s.dataset.bladeId === id);
  });
}

function buildBladesList(items, root) {
  const list = createTag('div', { class: 'context-panel-blades' });
  items.forEach((item, index) => {
    const blade = createSpeechBlade(item, { onSelect: (id) => setActiveBlade(root, id) });
    if (index === 0) blade.classList.add('selected');
    list.appendChild(blade);
  });
  return list;
}

export default async function init(el) {
  el.classList.add('context-panel');
  loadStyle('/creativecloud/features/firefly-speech/speech-blade.css');

  const items = parseShowcaseItems(el);
  if (!items.length) return;

  const bladesList = buildBladesList(items, el);
  const mediaPanel = buildMediaPanel(items);
  const foreground = createTag('div', { class: 'foreground' });

  foreground.append(mediaPanel, bladesList);
  el.replaceChildren(foreground);

  mediaPanel.querySelectorAll('video').forEach(forcePauseVideo);
}

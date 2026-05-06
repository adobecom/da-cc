import { createTag } from '../../scripts/utils.js';
import {
  createSpeechBlade,
  syncPausedChrome,
  clearEnforceGuard,
  enforceGuards,
} from '../../features/firefly-speech/speech-blade.js';

const MEDIA_SELECTOR = 'picture, .video-container.video-holder, video';

function parseShowcaseItems(el) {
  const directRows = [...el.querySelectorAll(':scope > div')];
  const rows = directRows.length === 1
    ? [...directRows[0].querySelectorAll(':scope > div')]
    : directRows;

  return rows.flatMap((row, index) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    const mediaEl = cols[0]?.querySelector(MEDIA_SELECTOR) || null;
    const flagImg = cols[1]?.querySelector('picture') || null;
    const language = cols[2]?.textContent?.trim() || '';
    const country = cols[3]?.textContent?.trim() || '';
    const audioLink = cols[4]?.querySelector('.audio-player') || null;

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

function forcePauseVideo(videoEl) {
  if (!videoEl) return;
  clearEnforceGuard(videoEl);
  const enforce = () => {
    clearEnforceGuard(videoEl);
    try { videoEl.pause(); } catch (_) { /* no-op */ }
    requestAnimationFrame(() => syncPausedChrome(videoEl));
  };
  enforceGuards.set(videoEl, enforce);
  videoEl.addEventListener('play', enforce);
  videoEl.addEventListener('playing', enforce);
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
  el.classList.add('speech-showcase');
  const items = parseShowcaseItems(el);
  if (!items.length) return;

  const bladesList = buildBladesList(items, el);
  const mediaPanel = buildMediaPanel(items);
  const foreground = createTag('div', { class: 'foreground' });

  foreground.append(mediaPanel, bladesList);
  el.replaceChildren(foreground);

  mediaPanel.querySelectorAll('video').forEach(forcePauseVideo);
}

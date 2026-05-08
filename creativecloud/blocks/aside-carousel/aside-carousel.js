// One-time block for doodlebug.
// Combining Milo's aside (desktop) and carousel (mobile) and doodlebug.css theme

import { createTag, getLibs } from '../../scripts/utils.js';

const miloLibs = getLibs('/libs');
let decorateBlockText;
let applyHoverPlay;
let decorateTextOverrides;

const DEFAULT_TEXT_SIZES = ['xl', 's', 'm'];

const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21">
<path d="M19.2214 10.8918C19.3516 10.5773 19.3516 10.2226 19.2214 9.90808C19.1562 9.75098 19.0621 9.60895 18.9435 9.49041L12.9241 3.47092C12.4226 2.96819 11.6076 2.96819 11.1061 3.47092C10.604 3.97239 10.604 4.78743 11.1061 5.2889L14.9312 9.11399H2.4314C1.72109 9.11399 1.146 9.69036 1.146 10.4C1.146 11.1097 1.72109 11.6861 2.4314 11.6861H14.9312L11.1061 15.5112C10.604 16.0126 10.604 16.8277 11.1061 17.3291C11.3568 17.5805 11.6863 17.7062 12.0151 17.7062C12.3439 17.7062 12.6733 17.5805 12.9241 17.3291L18.9436 11.3097C19.0622 11.1911 19.1562 11.0491 19.2214 10.8918Z"/>
</svg>`;

export function handleImageLoad(el, image) {
  if (image && !image.complete) {
    el.style.visibility = 'hidden';
    image.addEventListener('load', () => { el.style.visibility = 'visible'; });
    image.addEventListener('error', () => {
      image.style.visibility = 'hidden';
      el.style.visibility = 'visible';
    });
  }
}

function decorateSlide(el, slide) {
  slide.classList.add('slide');
  const textCell = slide.querySelector('h1, h2, h3, h4, h5, h6, p')?.closest('div');
  textCell?.classList.add('text');
  const mediaCell = slide.querySelector(':scope > div:not([class])');
  if (mediaCell) {
    mediaCell.classList.add('image');
    const video = mediaCell.querySelector('video');
    if (video) applyHoverPlay(video);
  }

  if (mediaCell) {
    mediaCell.classList.add('image');
    const video = mediaCell.querySelector('video');
    if (video) applyHoverPlay(video);
  }

  if (textCell) {
    textCell.classList.add('text');
    const picture = textCell.querySelector('p picture');
    const iconArea = picture ? (picture.closest('p') || createTag('p', null, picture)) : null;
    if (iconArea) {
      const iconVariant = el.className.match(/-(avatar|lockup)/);
      const iconClass = iconVariant ? `${iconVariant[1]}-area` : 'icon-area';
      iconArea.classList.add(iconClass);
      handleImageLoad(slide, iconArea.querySelector('img'));
    }
    decorateBlockText(textCell, DEFAULT_TEXT_SIZES);
  }

  slide.querySelectorAll('a:not([class])').forEach((a) => a.classList.add('static'));
}

function goTo(track, slides, index) {
  const gap = parseFloat(getComputedStyle(track).gap) || 16;
  track.style.transform = `translateX(-${index * (slides[0].offsetWidth + gap)}px)`;
  slides.forEach((s, i) => s.classList.toggle('active', i === index));
}

function updateBtnStates(prev, next, current, total, track, slides) {
  prev.disabled = current === 0;
  prev.classList.toggle('disabled', current === 0);
  const gap = parseFloat(getComputedStyle(track).gap) || 16;
  const slideWidth = slides[0].offsetWidth;
  const visibleCount = Math.floor((track.parentElement.offsetWidth + gap) / (slideWidth + gap));
  const atEnd = current + visibleCount >= total;
  next.disabled = atEnd;
  next.classList.toggle('disabled', atEnd);
}

function initControls(el, slides) {
  slides[0].classList.add('active');
  if (slides.length < 2) return;

  const track = createTag('div', { class: 'slides-track' });
  el.prepend(track);
  track.append(...slides);

  const prev = createTag('button', { class: 'carousel-prev', 'aria-label': 'Previous slide' }, ARROW_SVG);
  const next = createTag('button', { class: 'carousel-next', 'aria-label': 'Next slide' }, ARROW_SVG);
  const controls = createTag('div', { class: 'carousel-controls' });
  controls.append(prev, next);

  let current = 0;
  updateBtnStates(prev, next, current, slides.length, track, slides);

  prev.addEventListener('click', () => {
    if (current === 0) return;
    current -= 1;
    goTo(track, slides, current);
    updateBtnStates(prev, next, current, slides.length, track, slides);
  });
  next.addEventListener('click', () => {
    if (next.disabled) return;
    current += 1;
    goTo(track, slides, current);
    updateBtnStates(prev, next, current, slides.length, track, slides);
  });

  let xStart = 0;
  el.addEventListener('touchstart', (e) => { xStart = e.touches[0].screenX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const diff = xStart - e.changedTouches[0].screenX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && !next.disabled) current += 1;
    else if (diff < 0 && current > 0) current -= 1;
    else return;
    goTo(track, slides, current);
    updateBtnStates(prev, next, current, slides.length, track, slides);
  });

  el.append(controls);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      const visibleCount = Math.floor(
        (track.parentElement.offsetWidth + gap) / (slides[0].offsetWidth + gap),
      );
      current = Math.min(current, Math.max(0, slides.length - visibleCount));
      goTo(track, slides, current);
      updateBtnStates(prev, next, current, slides.length, track, slides);
    }, 200);
  });
}

export default async function init(el) {
  ({ decorateBlockText, applyHoverPlay, decorateTextOverrides } = await import(`${miloLibs}/utils/decorate.js`));

  const slides = [...el.querySelectorAll(':scope > div')];
  slides.forEach((slide) => decorateSlide(el, slide));
  decorateTextOverrides(el);
  initControls(el, slides);
}

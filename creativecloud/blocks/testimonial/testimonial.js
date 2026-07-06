import { createTag, prefersReducedMotion } from '../../scripts/utils.js';

const BLOCK = 'testimonial';
const AUTOPLAY_INTERVAL_MS = 8000;
const TRANSITION_FALLBACK_MS = 600;
const STACK_OFFSET_X = 63;
const STACK_OFFSET_Y = 41;
const DESKTOP_MQ = '(min-width: 1200px)';

function parseCards(el) {
  return [...el.querySelectorAll(':scope > div')].map((row) => {
    const children = [...row.children];
    const quote = children[0]?.textContent?.trim() || '';
    const name = children[1]?.textContent?.trim() || '';
    const title = children[2]?.textContent?.trim() || '';
    const picture = children[3]?.querySelector('picture');
    return { quote, name, title, picture };
  });
}

function createCard(data, index) {
  const card = createTag('article', { class: `${BLOCK}-card`, 'data-index': index });
  const quoteEl = createTag('blockquote', { class: `${BLOCK}-quote` }, data.quote);
  const authorEl = createTag('div', { class: `${BLOCK}-author` });
  if (data.picture) {
    const avatarEl = createTag('div', { class: `${BLOCK}-avatar` });
    avatarEl.append(data.picture);
    authorEl.append(avatarEl);
  }
  const infoEl = createTag('div', { class: `${BLOCK}-author-info` });
  const nameEl = createTag('span', { class: `${BLOCK}-name` }, data.name);
  const titleEl = createTag('span', { class: `${BLOCK}-title` }, data.title);
  infoEl.append(nameEl, titleEl);
  authorEl.append(infoEl);
  card.append(quoteEl, authorEl);
  return card;
}

function createProgressBar(count, onClick) {
  const bar = createTag('div', { class: `${BLOCK}-progress` });
  for (let i = 0; i < count; i += 1) {
    const dot = createTag('button', {
      class: `${BLOCK}-progress-dot`,
      type: 'button',
      'data-index': i,
    });
    const fill = createTag('div', { class: `${BLOCK}-progress-fill` });
    dot.append(fill);
    dot.addEventListener('click', () => onClick(i));
    bar.append(dot);
  }
  return bar;
}

function createPlayPause() {
  const btn = createTag('button', {
    class: `${BLOCK}-play-pause`,
    type: 'button',
  });
  btn.innerHTML = `<svg class="${BLOCK}-pause-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="4" y="2" width="4" height="16" rx="1" fill="currentColor"/>
    <rect x="12" y="2" width="4" height="16" rx="1" fill="currentColor"/>
  </svg>
  <svg class="${BLOCK}-play-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" style="display:none">
    <path d="M5 3.5L16 10L5 16.5V3.5Z" fill="currentColor"/>
  </svg>`;
  return btn;
}

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function isDesktop() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

function getBeforeActive(currentIndex, hasScrolled) {
  if (!isDesktop()) return 1;
  return (currentIndex === 0 && !hasScrolled) ? 0 : 1;
}

function setStackPositions(cards) {
  const count = cards.length;
  cards.forEach((card, i) => {
    const depth = count - 1 - i;
    card.style.transform = `translate(${depth * STACK_OFFSET_X}px, ${-depth * STACK_OFFSET_Y}px) scale(${1 - depth * 0.02})`;
    card.style.zIndex = String(i + 1);
    card.style.opacity = i === count - 1 ? '1' : '0.5';
  });
}

function getTrackStep(cards, track) {
  const cardWidth = cards[0]?.getBoundingClientRect().width;
  if (!cardWidth) return 0;
  const gap = parseFloat(getComputedStyle(track).gap) || 24;
  return cardWidth + gap;
}

function setCircularOrder(cards, currentIndex, count, beforeActive) {
  const startIndex = wrapIndex(currentIndex - beforeActive, count);
  for (let pos = 0; pos < count; pos += 1) {
    const realIndex = wrapIndex(startIndex + pos, count);
    cards[realIndex].style.order = String(pos);
  }
}

function markPeekCards(cards, currentIndex, count, beforeActive) {
  cards.forEach((card) => card.classList.remove(`${BLOCK}-card-peek`));
  if (!isDesktop()) return;
  for (let pos = 0; pos < count; pos += 1) {
    const realIndex = wrapIndex(currentIndex - beforeActive + pos, count);
    const visiblePos = pos - beforeActive;
    if (visiblePos < 0 || visiblePos >= 2) {
      cards[realIndex].classList.add(`${BLOCK}-card-peek`);
    }
  }
}

function updateProgress(progressDots, currentIndex) {
  progressDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentIndex);
    const fill = dot.querySelector(`.${BLOCK}-progress-fill`);
    if (fill) {
      fill.style.animation = 'none';
      fill.offsetHeight; // eslint-disable-line no-unused-expressions
      fill.style.animation = '';
    }
  });
}

function updateActiveCard(cards, currentIndex) {
  cards.forEach((card) => {
    card.classList.toggle('active', Number(card.dataset.index) === currentIndex);
  });
}

function waitTransition(track, callback) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    callback();
  };
  setTimeout(finish, TRANSITION_FALLBACK_MS);
  track.addEventListener('transitionend', finish, { once: true });
}

export default async function init(el) {
  const cardData = parseCards(el);
  if (!cardData.length) return;

  el.textContent = '';
  const isRTL = document.dir === 'rtl';
  const count = cardData.length;
  const dir = isRTL ? 1 : -1;
  const state = { currentIndex: 0, isAnimating: false, hasScrolled: false };
  let autoplayTimer = null;
  let isPlaying = true;

  const container = createTag('div', { class: `${BLOCK}-container` });
  const track = createTag('div', { class: `${BLOCK}-track` });
  const cards = cardData.map((data, i) => createCard(data, i));
  track.append(...cards);

  function applyBasePosition(animate, beforeActive) {
    const step = getTrackStep(cards, track);
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(${dir * beforeActive * step}px)`;
    if (!animate) {
      track.getBoundingClientRect();
      track.style.transition = '';
    }
  }

  function settle() {
    const before = getBeforeActive(state.currentIndex, state.hasScrolled);
    setCircularOrder(cards, state.currentIndex, count, before);
    updateActiveCard(cards, state.currentIndex);
    applyBasePosition(false, before);
    markPeekCards(cards, state.currentIndex, count, before);
  }

  function moveNext() {
    if (count <= 1 || state.isAnimating) return;
    state.isAnimating = true;
    const before = getBeforeActive(state.currentIndex, state.hasScrolled);
    setCircularOrder(cards, state.currentIndex, count, before);
    applyBasePosition(false, before);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const step = getTrackStep(cards, track);
      track.style.transition = '';
      track.style.transform = `translateX(${dir * (before + 1) * step}px)`;
      waitTransition(track, () => {
        state.hasScrolled = true;
        state.currentIndex = wrapIndex(state.currentIndex + 1, count);
        settle();
        state.isAnimating = false;
      });
    }));
  }

  function movePrev() {
    if (count <= 1 || state.isAnimating) return;
    state.isAnimating = true;
    const before = getBeforeActive(state.currentIndex, state.hasScrolled);

    setCircularOrder(cards, state.currentIndex, count, before + 1);
    applyBasePosition(false, before + 1);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const step = getTrackStep(cards, track);
      track.style.transition = '';
      track.style.transform = `translateX(${dir * before * step}px)`;
      waitTransition(track, () => {
        state.hasScrolled = true;
        state.currentIndex = wrapIndex(state.currentIndex - 1, count);
        settle();
        state.isAnimating = false;
      });
    }));
  }

  function jumpTo(index) {
    if (state.isAnimating) return;
    state.hasScrolled = true;
    state.currentIndex = wrapIndex(index, count);
    settle();
  }

  function startAutoplay() {
    if (autoplayTimer || !isPlaying || prefersReducedMotion()) return;
    autoplayTimer = setInterval(() => {
      moveNext();
      updateProgress(progressDots, wrapIndex(state.currentIndex + 1, count));
    }, AUTOPLAY_INTERVAL_MS);
  }

  function stopAutoplay() {
    if (!autoplayTimer) return;
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  const controls = createTag('div', { class: `${BLOCK}-controls` });
  const progressBar = createProgressBar(count, (i) => {
    stopAutoplay();
    jumpTo(i);
    updateProgress(progressDots, state.currentIndex);
    if (isPlaying) startAutoplay();
  });
  const playPauseBtn = createPlayPause();
  controls.append(progressBar, playPauseBtn);
  container.append(track, controls);
  el.append(container);

  setStackPositions(cards);
  const progressDots = [...progressBar.querySelectorAll(`.${BLOCK}-progress-dot`)];

  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    const pauseIcon = playPauseBtn.querySelector(`.${BLOCK}-pause-icon`);
    const playIcon = playPauseBtn.querySelector(`.${BLOCK}-play-icon`);
    if (isPlaying) {
      pauseIcon.style.display = '';
      playIcon.style.display = 'none';
      startAutoplay();
    } else {
      pauseIcon.style.display = 'none';
      playIcon.style.display = '';
      stopAutoplay();
    }
  });

  let startX = 0;
  let startY = 0;
  container.addEventListener('touchstart', (e) => {
    if (e.changedTouches.length !== 1) return;
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - startX;
    const deltaY = e.changedTouches[0].clientY - startY;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) >= Math.abs(deltaX)) return;
    stopAutoplay();
    if (deltaX < 0) {
      moveNext();
      updateProgress(progressDots, wrapIndex(state.currentIndex + 1, count));
    } else {
      movePrev();
      updateProgress(progressDots, wrapIndex(state.currentIndex - 1, count));
    }
    if (isPlaying) startAutoplay();
  }, { passive: true });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      movePrev();
      updateProgress(progressDots, wrapIndex(state.currentIndex - 1, count));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveNext();
      updateProgress(progressDots, wrapIndex(state.currentIndex + 1, count));
    }
  });

  const expandObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    expandObserver.disconnect();
    setTimeout(() => {
      container.classList.add(`${BLOCK}-expanded`);
      cards.forEach((card) => {
        card.style.transform = '';
        card.style.zIndex = '';
        card.style.opacity = '';
      });
      settle();
      updateProgress(progressDots, state.currentIndex);
      if (!prefersReducedMotion()) startAutoplay();
    }, 200);
  }, { threshold: 0.3 });
  expandObserver.observe(el);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      if (isPlaying) startAutoplay();
    } else {
      stopAutoplay();
    }
  });
  visibilityObserver.observe(el);

  const resizeObserver = new ResizeObserver(() => {
    if (!container.classList.contains(`${BLOCK}-expanded`)) return;
    settle();
  });
  resizeObserver.observe(el);
}

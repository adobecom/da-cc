import { createTag, prefersReducedMotion } from '../../scripts/utils.js';

const BLOCK = 'testimonial';
const AUTOPLAY_INTERVAL_MS = 8000;
const TRANSITION_FALLBACK_MS = 600;
const DUMMY_STACK_COUNT = 3;
const TABLET_MQ = '(min-width: 600px)';
const DESKTOP_MQ = '(min-width: 1201px)';

function parseCards(el) {
  return [...el.querySelectorAll(':scope > div')]
    .filter((row) => [...row.children].length > 1)
    .map((row) => {
      const children = [...row.children];
      const quote = children[0]?.textContent?.trim() || '';
      const name = children[1]?.textContent?.trim() || '';
      const title = children[2]?.textContent?.trim() || '';
      const picture = children[3]?.querySelector('picture');
      return { quote, name, title, picture };
    });
}

function createCard(data, index) {
  const card = createTag('article', {
    class: `${BLOCK}-card`,
    'data-index': index,
    role: 'group',
    'aria-roledescription': 'slide',
    'aria-label': `Testimonial by ${data.name}`,
  });
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
      'aria-label': `Testimonial ${i + 1}`,
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
    'aria-label': 'Pause',
  });
  btn.innerHTML = `<svg class="${BLOCK}-pause-icon" width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.5832 34.8437C9.61636 34.8437 2.32275 27.5501 2.32275 18.5832C2.32275 9.61636 9.61636 2.32275 18.5832 2.32275C27.5501 2.32275 34.8437 9.61636 34.8437 18.5832C34.8437 27.5501 27.5501 34.8437 18.5832 34.8437ZM18.5832 5.11026C11.1535 5.11026 5.11026 11.1535 5.11026 18.5832C5.11026 26.0129 11.1535 32.0562 18.5832 32.0562C26.0129 32.0562 32.0562 26.0129 32.0562 18.5832C32.0562 11.1535 26.0129 5.11026 18.5832 5.11026Z" fill="black"/>
    <path d="M21.8356 25.0875C21.0662 25.0875 20.4419 24.4632 20.4419 23.6937V13.4729C20.4419 12.7034 21.0662 12.0791 21.8356 12.0791C22.6051 12.0791 23.2294 12.7034 23.2294 13.4729V23.6937C23.2294 24.4632 22.6051 25.0875 21.8356 25.0875Z" fill="black"/>
    <path d="M15.3313 25.0875C14.5618 25.0875 13.9375 24.4632 13.9375 23.6937V13.4729C13.9375 12.7034 14.5618 12.0791 15.3313 12.0791C16.1007 12.0791 16.725 12.7034 16.725 13.4729V23.6937C16.725 24.4632 16.1007 25.0875 15.3313 25.0875Z" fill="black"/>
  </svg>
  <svg class="${BLOCK}-play-icon" width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.5832 34.8437C9.61636 34.8437 2.32275 27.5501 2.32275 18.5832C2.32275 9.61636 9.61636 2.32275 18.5832 2.32275C27.5501 2.32275 34.8437 9.61636 34.8437 18.5832C34.8437 27.5501 27.5501 34.8437 18.5832 34.8437ZM18.5832 5.11026C11.1535 5.11026 5.11026 11.1535 5.11026 18.5832C5.11026 26.0129 11.1535 32.0562 18.5832 32.0562C26.0129 32.0562 32.0562 26.0129 32.0562 18.5832C32.0562 11.1535 26.0129 5.11026 18.5832 5.11026Z" fill="black"/>
    <path d="M24.2942 16.9465L15.7464 12.3524C14.5084 11.687 13.0083 12.5838 13.0083 13.9894V23.1774C13.0083 24.5829 14.5084 25.4797 15.7464 24.8143L24.2942 20.2203C25.599 19.519 25.599 17.6477 24.2942 16.9465Z" fill="black"/>
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
  if (!window.matchMedia(TABLET_MQ).matches) return 1;
  return (currentIndex === 0 && !hasScrolled) ? 0 : 1;
}

function setStackPositions(cards) {
  cards.forEach((card, i) => {
    if (i === 0) {
      card.classList.add(`${BLOCK}-card-front`);
      card.style.zIndex = '100';
    } else {
      card.classList.add(`${BLOCK}-card-back`);
      card.style.zIndex = '50';
    }
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

function getVisibleCount() {
  if (isDesktop()) return 2;
  if (window.matchMedia(TABLET_MQ).matches) return 1;
  return 0;
}

function markPeekCards(cards, currentIndex, count, beforeActive) {
  cards.forEach((card) => card.classList.remove(`${BLOCK}-card-peek`));
  const visible = getVisibleCount();
  if (visible === 0) return;
  for (let pos = 0; pos < count; pos += 1) {
    const realIndex = wrapIndex(currentIndex - beforeActive + pos, count);
    const visiblePos = pos - beforeActive;
    if (visiblePos < 0 || visiblePos >= visible) {
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
      fill.style.transform = '';
      fill.style.animationDelay = '';
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
  const headingSource = el.querySelector(':scope > div > div > :is(h1, h2, h3, h4, h5, h6)');
  const cardData = parseCards(el);
  if (!cardData.length) return;

  el.textContent = '';
  const isRTL = document.dir === 'rtl';
  const count = cardData.length;
  const dir = isRTL ? 1 : -1;
  const state = { currentIndex: 0, isAnimating: false, hasScrolled: false };
  let autoplayTimer = null;
  let isPlaying = true;
  let tickStart = 0;
  let tickRemaining = AUTOPLAY_INTERVAL_MS;

  const container = createTag('div', {
    class: `${BLOCK}-container`,
    role: 'region',
    'aria-roledescription': 'carousel',
    'aria-label': headingSource?.textContent?.trim() || 'Testimonials',
  });

  if (headingSource) {
    const headingWrap = createTag('div', { class: `${BLOCK}-heading` });
    headingWrap.append(headingSource);
    container.append(headingWrap);
  }

  const track = createTag('div', { class: `${BLOCK}-track` });
  const cards = cardData.map((data, i) => createCard(data, i));
  track.append(...cards);

  const dummyCards = [];
  for (let i = 0; i < DUMMY_STACK_COUNT; i += 1) {
    const dummy = createTag('div', { class: `${BLOCK}-card-dummy` });
    dummy.style.setProperty('--stack-depth', String(i + 1));
    dummy.style.zIndex = String(10 - i);
    dummyCards.push(dummy);
  }
  track.append(...dummyCards);

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

    const nextIndex = wrapIndex(state.currentIndex + 1, count);
    markPeekCards(cards, nextIndex, count, before);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const step = getTrackStep(cards, track);
      track.style.transition = '';
      track.style.transform = `translateX(${dir * (before + 1) * step}px)`;
      waitTransition(track, () => {
        state.hasScrolled = true;
        state.currentIndex = nextIndex;
        tickRemaining = AUTOPLAY_INTERVAL_MS;
        settle();
        // eslint-disable-next-line no-use-before-define
        updateProgress(progressDots, state.currentIndex);
        state.isAnimating = false;
      });
    }));
  }

  function movePrev() {
    if (count <= 1 || state.isAnimating) return;
    state.isAnimating = true;
    const before = getBeforeActive(state.currentIndex, state.hasScrolled);
    const prevIndex = wrapIndex(state.currentIndex - 1, count);

    setCircularOrder(cards, state.currentIndex, count, before + 1);
    applyBasePosition(false, before + 1);
    markPeekCards(cards, prevIndex, count, before);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const step = getTrackStep(cards, track);
      track.style.transition = '';
      track.style.transform = `translateX(${dir * before * step}px)`;
      waitTransition(track, () => {
        state.hasScrolled = true;
        state.currentIndex = prevIndex;
        tickRemaining = AUTOPLAY_INTERVAL_MS;
        settle();
        // eslint-disable-next-line no-use-before-define
        updateProgress(progressDots, state.currentIndex);
        state.isAnimating = false;
      });
    }));
  }

  function startAutoplay() {
    if (autoplayTimer || !isPlaying) return;
    tickStart = Date.now();
    // eslint-disable-next-line no-use-before-define
    autoplayTimer = setTimeout(autoplayTick, tickRemaining);
  }

  function jumpTo(index) {
    if (state.isAnimating) return;
    const target = wrapIndex(index, count);
    if (target === state.currentIndex) return;

    state.isAnimating = true;
    const before = getBeforeActive(state.currentIndex, state.hasScrolled);
    const forwardDist = (target - state.currentIndex + count) % count;
    const backwardDist = (state.currentIndex - target + count) % count;
    const goForward = forwardDist <= backwardDist;
    const steps = goForward ? forwardDist : backwardDist;

    if (goForward) {
      setCircularOrder(cards, state.currentIndex, count, before);
      applyBasePosition(false, before);
    } else {
      setCircularOrder(cards, state.currentIndex, count, before + steps);
      applyBasePosition(false, before + steps);
    }
    markPeekCards(cards, target, count, before);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const step = getTrackStep(cards, track);
      const endTranslate = goForward
        ? dir * (before + steps) * step
        : dir * before * step;
      track.style.transition = '';
      track.style.transform = `translateX(${endTranslate}px)`;
      waitTransition(track, () => {
        state.hasScrolled = true;
        state.currentIndex = target;
        tickRemaining = AUTOPLAY_INTERVAL_MS;
        settle();
        // eslint-disable-next-line no-use-before-define
        updateProgress(progressDots, state.currentIndex);
        state.isAnimating = false;
        if (isPlaying) startAutoplay();
      });
    }));
  }

  function autoplayTick() {
    autoplayTimer = null;
    if (state.isAnimating) {
      autoplayTimer = setTimeout(autoplayTick, TRANSITION_FALLBACK_MS);
      return;
    }
    moveNext();
    tickRemaining = AUTOPLAY_INTERVAL_MS;
    tickStart = Date.now();
    autoplayTimer = setTimeout(autoplayTick, AUTOPLAY_INTERVAL_MS);
  }

  function pauseAutoplay() {
    if (!autoplayTimer) return;
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
    tickRemaining = Math.max(0, tickRemaining - (Date.now() - tickStart));
  }

  function stopAutoplay() {
    if (!autoplayTimer) return;
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
    tickRemaining = AUTOPLAY_INTERVAL_MS;
  }

  const controls = createTag('div', { class: `${BLOCK}-controls` });
  const progressBar = createProgressBar(count, (i) => {
    stopAutoplay();
    // eslint-disable-next-line no-use-before-define
    updateProgress(progressDots, i);
    jumpTo(i);
  });
  const playPauseBtn = createPlayPause();
  controls.append(progressBar, playPauseBtn);
  container.append(track, controls);
  el.append(container);

  const progressDots = [...progressBar.querySelectorAll(`.${BLOCK}-progress-dot`)];

  if (prefersReducedMotion()) {
    container.classList.add(`${BLOCK}-expanded`, `${BLOCK}-paused`);
    controls.classList.add(`${BLOCK}-controls-visible`);
    isPlaying = false;
    playPauseBtn.classList.add(`${BLOCK}-show-play`);
    playPauseBtn.setAttribute('aria-label', 'Play');
    dummyCards.forEach((d) => { d.style.display = 'none'; });
    requestAnimationFrame(() => {
      settle();
      updateProgress(progressDots, state.currentIndex);
    });
  }

  if (!prefersReducedMotion()) setStackPositions(cards);

  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    container.classList.toggle(`${BLOCK}-paused`, !isPlaying);
    playPauseBtn.classList.toggle(`${BLOCK}-show-play`, !isPlaying);
    playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    const dall = playPauseBtn.getAttribute('daa-ll');
    if (dall) {
      const label = isPlaying ? dall.replace('Play', 'Pause') : dall.replace('Pause', 'Play');
      playPauseBtn.setAttribute('daa-ll', label);
    }
    const activeFill = progressBar.querySelector(`.${BLOCK}-progress-dot.active .${BLOCK}-progress-fill`);
    if (isPlaying) {
      const elapsed = AUTOPLAY_INTERVAL_MS - tickRemaining;
      if (activeFill) {
        activeFill.style.transform = '';
        activeFill.style.animation = 'none';
        activeFill.getBoundingClientRect();
        activeFill.style.animation = '';
        activeFill.style.animationDelay = `-${elapsed}ms`;
      }
      startAutoplay();
    } else {
      pauseAutoplay();
      if (activeFill) {
        activeFill.style.animation = 'none';
        activeFill.style.transform = 'scaleX(1)';
      }
    }
  });

  let startX = 0;
  let startY = 0;

  function handleSwipe(deltaX, deltaY) {
    if (!container.classList.contains(`${BLOCK}-expanded`)) return;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) >= Math.abs(deltaX)) return;
    stopAutoplay();
    if (deltaX < 0) {
      moveNext();
    } else {
      movePrev();
    }
    if (isPlaying) startAutoplay();
  }

  container.addEventListener('touchstart', (e) => {
    if (e.changedTouches.length !== 1) return;
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.changedTouches.length !== 1) return;
    handleSwipe(e.changedTouches[0].clientX - startX, e.changedTouches[0].clientY - startY);
  }, { passive: true });

  let isDragging = false;
  container.addEventListener('mousedown', (e) => {
    if (!container.classList.contains(`${BLOCK}-expanded`)) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
  });

  container.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    handleSwipe(e.clientX - startX, e.clientY - startY);
  });

  container.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      movePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveNext();
    }
  });

  if (!prefersReducedMotion()) {
    const getNavHeight = () => {
      const nav = document.querySelector('.global-navigation') || document.querySelector('header');
      return nav?.offsetHeight || 0;
    };

    let navHeight = getNavHeight();

    el.style.height = '150vh';
    el.style.overflow = 'clip';
    container.style.position = 'sticky';
    container.style.top = `${navHeight}px`;
    container.style.zIndex = '1';

    const blockObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const h = getNavHeight();
          if (h && h !== navHeight) {
            navHeight = h;
            container.style.top = `${h}px`;
          }
        }
      });
    }, { threshold: 0 });
    blockObserver.observe(el);

    let expandReady = false;

    const computeExpandOffsets = () => {
      const containerWidth = container.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(el).getPropertyValue('--testimonial-card-gap')) || 24;
      const widthPct = parseFloat(getComputedStyle(container).getPropertyValue('--testimonial-card-width')) / 100;
      const cardWidth = window.matchMedia(TABLET_MQ).matches
        ? containerWidth * (widthPct || 5 / 6)
        : containerWidth;

      let marginStart;
      if (isDesktop()) {
        marginStart = (containerWidth - 2 * cardWidth - gap) / 2;
      } else if (window.matchMedia(TABLET_MQ).matches) {
        marginStart = (containerWidth - cardWidth) / 2;
      } else {
        marginStart = 0;
      }

      const stackCenter = containerWidth / 2;
      cards.forEach((card, i) => {
        const carouselCenter = marginStart + i * (cardWidth + gap) + cardWidth / 2;
        card.style.setProperty('--expand-offset', `${carouselCenter - stackCenter}px`);
      });
    };

    const enterExpanded = () => {
      container.classList.add(`${BLOCK}-expanded`);
      container.classList.remove(`${BLOCK}-stack-collapsed`);
      container.style.removeProperty('--stack-progress');
      container.style.removeProperty('--expand-progress');
      cards.forEach((card) => {
        card.style.transform = '';
        card.style.zIndex = '';
        card.style.removeProperty('--stack-depth');
        card.style.removeProperty('--expand-offset');
        card.classList.remove(
          `${BLOCK}-card-front`,
          `${BLOCK}-card-back`,
          `${BLOCK}-card-hidden`,
        );
      });
      dummyCards.forEach((d) => { d.style.display = 'none'; });
      state.currentIndex = 0;
      state.hasScrolled = false;
      tickRemaining = AUTOPLAY_INTERVAL_MS;
      settle();
      requestAnimationFrame(() => {
        controls.classList.add(`${BLOCK}-controls-visible`);
        controls.addEventListener('transitionend', () => {
          updateProgress(progressDots, state.currentIndex);
          startAutoplay();
        }, { once: true });
      });
    };

    const exitExpanded = () => {
      stopAutoplay();
      controls.classList.remove(`${BLOCK}-controls-visible`);
      cards.forEach((card) => {
        card.classList.remove(`${BLOCK}-card-peek`);
        card.style.order = '';
        card.style.transform = '';
      });
      container.style.setProperty('--stack-progress', '1');
      container.style.setProperty('--expand-progress', '1');
      setStackPositions(cards);
      computeExpandOffsets();
      dummyCards.forEach((d) => { d.style.display = ''; });
      container.classList.remove(`${BLOCK}-expanded`);
      container.classList.add(`${BLOCK}-stack-collapsed`);
      track.style.transform = '';
      track.style.transition = 'none';
    };

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const scrolled = Math.max(0, navHeight - rect.top);
      const totalPinDistance = el.offsetHeight - container.offsetHeight;
      if (totalPinDistance <= 0) return;

      if (scrolled <= 0) {
        expandReady = false;
        container.style.setProperty('--stack-progress', '0');
        container.style.setProperty('--expand-progress', '0');
        container.classList.remove(`${BLOCK}-expanded`, `${BLOCK}-stack-collapsed`);
        setStackPositions(cards);
        dummyCards.forEach((d) => { d.style.display = ''; });
        return;
      }

      const animationDistance = totalPinDistance * 0.5;
      const collapseDistance = animationDistance * 0.5;

      const collapseProgress = Math.min(1, scrolled / collapseDistance);
      let expandProgress = 0;

      if (collapseProgress >= 1) {
        if (!expandReady) {
          computeExpandOffsets();
          expandReady = true;
        }
        const expandScrolled = scrolled - collapseDistance;
        expandProgress = Math.min(1, expandScrolled / (animationDistance - collapseDistance));
      }

      const isExpanded = container.classList.contains(`${BLOCK}-expanded`);

      if (expandProgress >= 1 && !isExpanded) {
        enterExpanded();
      } else if (expandProgress < 1 && isExpanded) {
        exitExpanded();
      }

      if (!container.classList.contains(`${BLOCK}-expanded`)) {
        container.style.setProperty('--stack-progress', String(collapseProgress));
        container.classList.toggle(`${BLOCK}-stack-collapsed`, collapseProgress >= 1);
        container.style.setProperty('--expand-progress', String(expandProgress));
        dummyCards.forEach((d) => { d.style.display = expandProgress > 0 ? 'none' : ''; });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          pauseAutoplay();
          container.classList.add(`${BLOCK}-out-of-view`);
        } else {
          container.classList.remove(`${BLOCK}-out-of-view`);
          if (isPlaying && container.classList.contains(`${BLOCK}-expanded`)) {
            startAutoplay();
          }
        }
      });
    }, { threshold: 0 });
    visibilityObserver.observe(el);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (!container.classList.contains(`${BLOCK}-expanded`)) return;
    settle();
  });
  resizeObserver.observe(el);
}

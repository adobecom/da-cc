import { getLibs } from '../../scripts/utils.js';

const miloLibs = getLibs('/libs');
const { createTag } = await import(`${miloLibs}/utils/utils.js`);

const LANA_OPTIONS = {
  tags: 'showcase-marquee',
  errorType: 'i',
  severity: 'error',
};

const PLACEHOLDER_LABELS = ['pause-motion', 'play-motion', 'pause-icon', 'play-icon'];

let animationLabels = {
  playMotion: 'Play',
  pauseMotion: 'Pause',
  pauseIcon: 'Pause icon',
  playIcon: 'Play icon',
};

function logError(message, error) {
  window.lana?.log(`Animation slot text ${message}: ${error}`, LANA_OPTIONS);
}

export function createRollingLogos(logos) {
  const copies = Array.from({ length: 3 }, () => {
    const copy = createTag('div', { class: 'logos-duplicate' });
    logos.forEach((logo) => copy.append(logo.cloneNode(true)));
    return copy;
  });

  const tabletMQ = window.matchMedia('(min-width: 600px)');

  // Create a container to hold all duplicates and apply animation to it
  const logoContainer = createTag('div', { class: 'logo-container' }, copies);

  function handleResize(isTablet) {
    const gap = isTablet ? 80 : 30;
    logoContainer.style.setProperty('--scroll-distance', `-${copies[0].offsetWidth + gap}px`);
    logoContainer.style.setProperty('--logos-gap', `${gap}px`);
  }

  function setupLayout() {
    handleResize(tabletMQ.matches);
    tabletMQ.addEventListener('change', ({ matches }) => handleResize(matches));
  }

  function addScrolling() {
    let lastScrollY = window.scrollY;
    let targetScrollOffset = 0;
    let currentScrollOffset = 0;
    let rafId = null;

    const updateScrollEffect = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      // Reverse the scroll offset multiplier for RTL
      const multiplier = document.dir ? -0.2 : 0.2;
      targetScrollOffset += scrollDelta * multiplier;

      const lerpFactor = 0.08;
      currentScrollOffset += (targetScrollOffset - currentScrollOffset) * lerpFactor;

      logoContainer.style.setProperty('--scroll-offset', `${currentScrollOffset}px`);
      lastScrollY = currentScrollY;
    };

    const animate = () => {
      if (logoContainer.classList.contains('paused')) {
        rafId = null;
        return;
      }
      updateScrollEffect();
      const difference = Math.abs(targetScrollOffset - currentScrollOffset);
      if (difference > 0.1) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
      }
    };

    const onScroll = () => {
      if (logoContainer.classList.contains('paused')) {
        lastScrollY = window.scrollY;
        return;
      }
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  return { addScrolling, setupLayout, logoContainer };
}

async function fetchAnimationLabels(getFedsPlaceholderConfig, replaceKeyArray) {
  try {
    const [pauseMotion, playMotion, pauseIcon, playIcon] = await replaceKeyArray(
      PLACEHOLDER_LABELS,
      getFedsPlaceholderConfig(),
    );
    return { playMotion, pauseMotion, pauseIcon, playIcon, hasFetched: true };
  } catch (err) {
    logError('Failed to fetch animation labels', err);
    return animationLabels;
  }
}

function initAnimationControls({ button, iconWrapper, logoContainer }) {
  if (!button || !iconWrapper || !logoContainer) return;
  let isPlaying = true;
  const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  const updateControlState = (playing) => {
    isPlaying = playing;
    iconWrapper.classList.toggle('is-playing', playing);
    button.setAttribute('aria-label', playing ? animationLabels.pauseMotion : animationLabels.playMotion);
    button.setAttribute('title', playing ? animationLabels.pauseMotion : animationLabels.playMotion);
    button.setAttribute('aria-pressed', String(playing));
  };

  const pauseAnimation = () => {
    updateControlState(false);
    if (reducedMotionMQ.matches) {
      logoContainer.style.animation = '';
      logoContainer.style.transform = '';
      logoContainer.style.setProperty('--marquee-state', 'paused', 'important');
    } else {
      logoContainer.style.removeProperty('--marquee-state');
      const { transform } = getComputedStyle(logoContainer);
      logoContainer.style.animation = 'none';
      logoContainer.style.transform = transform;
    }
    logoContainer.classList.add('paused');
  };

  const playAnimation = () => {
    updateControlState(true);
    if (reducedMotionMQ.matches) {
      logoContainer.style.animation = '';
      logoContainer.style.transform = '';
      logoContainer.style.setProperty('--marquee-state', 'running', 'important');
    } else {
      logoContainer.style.removeProperty('--marquee-state');
      logoContainer.style.animation = '';
      logoContainer.style.transform = '';
    }
    logoContainer.classList.remove('paused');
  };

  const toggleAnimation = () => (isPlaying ? pauseAnimation() : playAnimation());

  const handleKeydown = (event) => {
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      toggleAnimation();
    }
  };

  button.addEventListener('click', (event) => {
    event.preventDefault();
    toggleAnimation();
  });

  button.addEventListener('keydown', handleKeydown);

  reducedMotionMQ.addEventListener('change', ({ matches }) => (matches ? pauseAnimation() : playAnimation()));

  if (reducedMotionMQ.matches) pauseAnimation();
}

function createAnimationControls({ container, getFederatedContentRoot, logoContainer }) {
  const fedRoot = getFederatedContentRoot();
  if (!container || !fedRoot) return;
  const controlsWrapper = createTag('div', { class: 'animation-controls' });

  const button = createTag('button', {
    class: 'pause-play-wrapper',
    title: animationLabels.pauseMotion,
    'aria-label': animationLabels.pauseMotion,
    'aria-pressed': true,
  });

  const iconWrapper = createTag('div', { class: 'offset-filler is-playing' });

  const playIcon = createTag('img', {
    class: 'accessibility-control play-icon',
    alt: animationLabels.playIcon,
    src: `${fedRoot}/federal/assets/svgs/accessibility-play.svg`,
  });

  const pauseIcon = createTag('img', {
    class: 'accessibility-control pause-icon',
    alt: animationLabels.pauseIcon,
    src: `${fedRoot}/federal/assets/svgs/accessibility-pause.svg`,
  });

  iconWrapper.append(playIcon, pauseIcon);
  button.appendChild(iconWrapper);
  controlsWrapper.appendChild(button);

  container.appendChild(controlsWrapper);

  initAnimationControls({
    button,
    iconWrapper,
    logoContainer,
  });
}

function getAuthorLogoLabel(logo) {
  const container = logo.closest('p, li, div');
  if (!container) return '';
  // Authoring for loc: ":ff-logo-google: | [Google]"
  const labels = [...(container.textContent || '').matchAll(/\|\s*\[([^\]]+)\]/g)]
    .map((m) => m[1].trim());
  const icons = container.querySelectorAll('span.icon');
  if (labels.length !== icons.length) return '';
  const idx = [...icons].indexOf(logo);
  return labels[idx] || '';
}

export default async function init(el) {
  const { decorateBlockBg } = await import(`${miloLibs}/utils/decorate.js`);
  const { getFederatedContentRoot, getFedsPlaceholderConfig } = await import(`${miloLibs}/utils/utils.js`);
  const { replaceKeyArray } = await import(`${miloLibs}/features/placeholders.js`);
  animationLabels = await fetchAnimationLabels(
    getFedsPlaceholderConfig,
    replaceKeyArray,
  );
  const children = el.querySelectorAll(':scope > div');
  const foreground = children[children.length - 2];

  // Setup background if exists
  if (children.length > 1) {
    children[0].classList.add('background');
    decorateBlockBg(el, children[0], { useHandleFocalpoint: true });
  }
  foreground.classList.add('foreground', 'container');
  const headline = foreground.querySelector('h1, h2, h3, h4, h5, h6');
  const text = headline.closest('div');
  headline.classList.add('heading');
  headline.nextElementSibling?.classList.add('body');
  text.classList.add('text');
  text.classList.add('copy');

  const logoRowContent = children[children.length - 1];

  if (!logoRowContent) return;

  logoRowContent.classList.add('logo-row');
  const logos = logoRowContent.querySelectorAll('span.icon');
  const logoLabels = [...logos].map((logo) => getAuthorLogoLabel(logo));
  logoRowContent.innerHTML = '';
  // TODO: cut down 1 level of DOM nesting
  const { logoContainer, addScrolling, setupLayout } = createRollingLogos(logos);

  const authoredLabels = logoLabels.filter(Boolean);
  if (authoredLabels.length > 0) {
    const list = createTag('ul', { class: 'sr-only logo-row-sr-list', role: 'list' });
    authoredLabels.forEach((label) => {
      const li = createTag('li');
      li.textContent = label;
      list.append(li);
    });
    logoRowContent.append(list);
  }

  const allLabeled = logoLabels.length > 0 && logoLabels.every((l) => l);
  if (allLabeled) logoContainer.setAttribute('aria-hidden', 'true');

  logoRowContent.append(logoContainer);
  createAnimationControls({ container: logoRowContent, getFederatedContentRoot, logoContainer });
  new IntersectionObserver(([{ isIntersecting }], ob) => {
    if (!isIntersecting) return;
    ob.disconnect();
    setupLayout();
    addScrolling();
  }).observe(el);
}

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function throttle(cb, delay, { trailing = false } = {}) {
  let timer = null;
  let lastArgs = null;
  function tryToEnd() {
    if (lastArgs && trailing) {
      cb.apply(this, lastArgs);
      lastArgs = null;
      timer = setTimeout(tryToEnd.bind(this), delay);
    } else {
      timer = null;
    }
  }
  return function throttled(...args) {
    if (timer) {
      lastArgs = args;
      return;
    }
    cb.apply(this, args);
    timer = setTimeout(tryToEnd.bind(this), delay);
  };
}

function addProgressIMPL(el, NAV_HEIGHT, markers = []) {
  let screenHeight = window.innerHeight;
  let elHeight = el.offsetHeight;
  const content = el.querySelector('.firefly-model-showcase-content');
  let initialContentHeight = content.clientHeight;
  if (el.nextElementSibling?.classList.contains('unity')) {
    const injectionObserver = new MutationObserver(() => {
      if (!content.querySelector('.ex-unity-wrap')) return;
      initialContentHeight = content.clientHeight;
      elHeight = el.offsetHeight;
      injectionObserver.disconnect();
    });
    injectionObserver.observe(content, { childList: true, subtree: true });
  }
  window.addEventListener(
    'resize',
    throttle(() => {
      screenHeight = window.innerHeight;
      elHeight = el.offsetHeight;
    }, 50),
  );

  let ticking = false;

  function updateProgress() {
    ticking = false;
    if (initialContentHeight !== content.clientHeight) return;
    const rect = el.getBoundingClientRect();
    const enterProgress = clamp((screenHeight - rect.top) / elHeight, 0, 1);
    const exitProgress = clamp((-rect.top + NAV_HEIGHT) / elHeight, 0, 1);
    el.style.setProperty('--enter-progress', enterProgress * 100);
    el.style.setProperty('--exit-progress', exitProgress * 100);
    if (markers.length) {
      markers.forEach((marker) => {
        const { name, threshold, type = 'exit' } = marker;
        const progress = type === 'exit' ? exitProgress * 100 : enterProgress * 100;
        const className = `marker-${name}`;
        if (progress >= threshold) {
          el.classList.add(className);
        } else {
          el.classList.remove(className);
        }
      });
    }
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true },
  );
}

// for max-2025-firefly
export default function addParallaxProgress(
  el,
  NAV_HEIGHT = 64,
  isIntersecting = false,
  markers = [],
) {
  if (isIntersecting) {
    addProgressIMPL(el, NAV_HEIGHT, markers);
    return;
  }
  new IntersectionObserver(async (entries, ob) => {
    if (entries[0].isIntersecting) {
      ob.disconnect();
      addProgressIMPL(el, NAV_HEIGHT);
    }
  }).observe(el);
}

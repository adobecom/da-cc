import { createTag, getLibs } from '../../scripts/utils.js';

const FADE_SECONDS = 0.02;
const DRIFT_TOLERANCE_SECONDS = 0.08;
const DECODE_SAMPLE_RATE = 48000;
const LOADER_DELAY_MS = 300;
const LOADER_SPINNER = '<svg class="audio-compare-spinner" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="30" fill="none" stroke="#fff" stroke-opacity="0.17" stroke-width="4"/><path d="M32 2a30 30 0 0 1 0 60" fill="none" stroke="#fff" stroke-opacity="0.94" stroke-width="4" stroke-linecap="round"/></svg>';
const LABEL_DEFAULTS = {
  'audio-play': 'Play',
  'audio-pause': 'Pause',
  'audio-loading': 'Loading',
  'audio-mute': 'Mute',
  'audio-unmute': 'Unmute',
  'audio-seek': 'Seek',
  'audio-version': 'Audio version',
};
const ICONS = {
  play: '<svg viewBox="0 0 24.2069 24.2069" aria-hidden="true" focusable="false"><path d="M5.62681 21.791C5.14515 21.791 4.66408 21.661 4.23089 21.4021C3.40054 20.9057 2.90471 20.031 2.90471 19.0642V5.14284C2.90471 4.17598 3.40056 3.30133 4.23089 2.80489C5.06064 2.30964 6.06473 2.28482 6.91694 2.74461L19.869 9.70529C20.7532 10.1804 21.3022 11.1 21.3022 12.1035C21.3022 13.107 20.7532 14.0266 19.869 14.5018L6.91694 21.4624C6.50974 21.6823 6.06769 21.791 5.62681 21.791ZM5.63095 4.23155C5.41524 4.23155 5.24562 4.31429 5.16229 4.36394C5.02932 4.44313 4.72023 4.67835 4.72023 5.14285V19.0642C4.72023 19.5287 5.02932 19.7639 5.16229 19.8431C5.29526 19.9223 5.64808 20.083 6.05764 19.8644L19.0092 12.9037C19.44 12.6709 19.4867 12.2666 19.4867 12.1035C19.4867 11.9404 19.44 11.5362 19.0092 11.3033L6.05764 4.34265C5.90458 4.26109 5.75979 4.23155 5.63095 4.23155Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6.75 18H4.25C3.00928 18 2 16.9902 2 15.75V4.25C2 3.00977 3.00928 2 4.25 2H6.75C7.99072 2 9 3.00977 9 4.25V15.75C9 16.9902 7.99072 18 6.75 18ZM4.25 3.5C3.83643 3.5 3.5 3.83691 3.5 4.25V15.75C3.5 16.1631 3.83643 16.5 4.25 16.5H6.75C7.16357 16.5 7.5 16.1631 7.5 15.75V4.25C7.5 3.83691 7.16357 3.5 6.75 3.5H4.25Z" fill="currentColor"/><path d="M15.75 18H13.25C12.0093 18 11 16.9902 11 15.75V4.25C11 3.00977 12.0093 2 13.25 2H15.75C16.9907 2 18 3.00977 18 4.25V15.75C18 16.9902 16.9907 18 15.75 18ZM13.25 3.5C12.8364 3.5 12.5 3.83691 12.5 4.25V15.75C12.5 16.1631 12.8364 16.5 13.25 16.5H15.75C16.1636 16.5 16.5 16.1631 16.5 15.75V4.25C16.5 3.83691 16.1636 3.5 15.75 3.5H13.25Z" fill="currentColor"/></svg>',
  volume: '<svg viewBox="0 0 22.1858 22.1858" aria-hidden="true" focusable="false"><path d="M10.2588 20.3409C9.75504 20.3409 9.26106 20.1438 8.88841 19.7711L6.00035 16.8831C5.84544 16.7282 5.63094 16.6393 5.41212 16.6393H3.60519C2.22942 16.6393 1.10929 15.5192 1.10929 14.1434V8.04234C1.10929 6.66656 2.22942 5.54644 3.60519 5.54644H5.41212C5.63095 5.54644 5.84544 5.45761 6.00035 5.30269L8.88841 2.41464C9.44521 1.85674 10.2772 1.691 11.0041 1.99431C11.732 2.29546 12.2022 2.99961 12.2022 3.78716V18.3986C12.2022 19.1861 11.732 19.8903 11.0041 20.1914C10.7625 20.2922 10.509 20.3409 10.2588 20.3409ZM3.60519 7.21038C3.14696 7.21038 2.77322 7.58411 2.77322 8.04235V14.1434C2.77322 14.6017 3.14696 14.9754 3.60519 14.9754H5.41212C6.0686 14.9754 6.71208 15.2419 7.1768 15.7066L10.0649 18.5947C10.1786 18.7073 10.3032 18.6824 10.3671 18.6543C10.431 18.6283 10.5383 18.56 10.5383 18.3986V3.78718C10.5383 3.62577 10.431 3.55753 10.3671 3.53152C10.3032 3.50336 10.1786 3.47844 10.0649 3.5911L7.1768 6.47916C6.71207 6.9439 6.0686 7.21038 5.41212 7.21038H3.60519Z" fill="currentColor"/><path d="M14.4219 14.1402C14.1532 14.1402 13.8889 14.0102 13.7285 13.7697C13.474 13.3873 13.5769 12.8717 13.9593 12.616C14.4154 12.3116 14.6981 11.7266 14.6981 11.0896C14.6981 10.4527 14.4154 9.8677 13.9593 9.56329C13.5769 9.30763 13.474 8.79199 13.7285 8.40958C13.9831 8.02718 14.4988 7.92535 14.8823 8.17884C15.8085 8.7974 16.362 9.88502 16.362 11.0896C16.362 12.2942 15.8085 13.3819 14.8823 14.0004C14.7403 14.0947 14.58 14.1402 14.4219 14.1402Z" fill="currentColor"/><path d="M18.027 15.8041C17.7584 15.8041 17.4941 15.6741 17.3337 15.4347C17.0792 15.0523 17.1821 14.5356 17.5634 14.2799C18.5329 13.6332 19.1352 12.4102 19.1352 11.0896C19.1352 9.76802 18.5329 8.54607 17.5645 7.89934C17.1821 7.64477 17.0792 7.12804 17.3337 6.74563C17.5883 6.36323 18.105 6.26032 18.4874 6.51489C19.913 7.46602 20.7992 9.21879 20.7992 11.0896C20.7992 12.9594 19.9141 14.7121 18.4885 15.6644C18.3466 15.7586 18.1852 15.8041 18.027 15.8041Z" fill="currentColor"/></svg>',
  muted: '<svg viewBox="0 0 22.1858 22.1858" aria-hidden="true" focusable="false"><path d="M10.2588 20.3409C9.75504 20.3409 9.26106 20.1438 8.88841 19.7711L6.00035 16.8831C5.84544 16.7282 5.63094 16.6393 5.41212 16.6393H3.60519C2.22942 16.6393 1.10929 15.5192 1.10929 14.1434V8.04234C1.10929 6.66656 2.22942 5.54644 3.60519 5.54644H5.41212C5.63095 5.54644 5.84544 5.45761 6.00035 5.30269L8.88841 2.41464C9.44521 1.85674 10.2772 1.691 11.0041 1.99431C11.732 2.29546 12.2022 2.99961 12.2022 3.78716V18.3986C12.2022 19.1861 11.732 19.8903 11.0041 20.1914C10.7625 20.2922 10.509 20.3409 10.2588 20.3409ZM3.60519 7.21038C3.14696 7.21038 2.77322 7.58411 2.77322 8.04235V14.1434C2.77322 14.6017 3.14696 14.9754 3.60519 14.9754H5.41212C6.0686 14.9754 6.71208 15.2419 7.1768 15.7066L10.0649 18.5947C10.1786 18.7073 10.3032 18.6824 10.3671 18.6543C10.431 18.6283 10.5383 18.56 10.5383 18.3986V3.78718C10.5383 3.62577 10.431 3.55753 10.3671 3.53152C10.3032 3.50336 10.1786 3.47844 10.0649 3.5911L7.1768 6.47916C6.71207 6.9439 6.0686 7.21038 5.41212 7.21038H3.60519Z" fill="currentColor"/><path d="m14.6 8.4 5.4 5.4m0-5.4-5.4 5.4" fill="none" stroke="currentColor" stroke-width="1.66" stroke-linecap="round"/></svg>',
};

function logAudioCompare(message) {
  window.lana?.log(`upload-marquee audio-compare: ${message}`, { tags: 'upload-marquee', errorType: 'i', severity: 'error' });
}

export function formatTime(seconds) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

async function getLabels() {
  try {
    const miloLibs = getLibs('/libs');
    const [{ getConfig }, { replaceKeyArray }] = await Promise.all([
      import(`${miloLibs}/utils/utils.js`),
      import(`${miloLibs}/features/placeholders.js`),
    ]);
    const keys = Object.keys(LABEL_DEFAULTS);
    const values = await replaceKeyArray(keys, getConfig());
    return Object.fromEntries(keys.map((key, i) => {
      const value = values?.[i];
      const missing = !value || value === key || value === key.replaceAll('-', ' ');
      return [key, missing ? LABEL_DEFAULTS[key] : value];
    }));
  } catch (e) {
    return { ...LABEL_DEFAULTS };
  }
}

async function decodeTracks(tracks) {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx) throw new Error('Web Audio not supported');
  const decoder = new OfflineCtx(2, 1, DECODE_SAMPLE_RATE);
  return Promise.all(tracks.map(async ({ src }) => {
    const res = await fetch(src, { priority: 'low' });
    if (!res.ok) throw new Error(`${res.status} ${src}`);
    return decoder.decodeAudioData(await res.arrayBuffer());
  }));
}

let sharedContext;

export function unlockAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  sharedContext ??= new Ctx();
  if (sharedContext.state === 'suspended') sharedContext.resume().catch(() => {});
  return sharedContext;
}

export function createWebAudioEngine(buffers, initialTrack) {
  let ctx;
  let master;
  let session;
  let selected = initialTrack;
  let muted = false;

  const ramp = (param, value) => {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + FADE_SECONDS);
  };

  const ensureContext = () => {
    if (!ctx) {
      ctx = unlockAudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    } else {
      unlockAudioContext();
    }
  };

  const stop = () => {
    if (!session) return;
    const { out, sources } = session;
    session = null;
    ramp(out.gain, 0);
    const end = ctx.currentTime + FADE_SECONDS;
    sources.forEach((source) => {
      try { source.stop(end); } catch (e) { /* already stopped */ }
    });
    setTimeout(() => out.disconnect(), (FADE_SECONDS * 1000) + 50);
  };

  const start = (offset) => {
    ensureContext();
    stop();
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    const startAt = ctx.currentTime;
    const gains = buffers.map((buffer, i) => {
      const gain = ctx.createGain();
      gain.gain.value = i === selected ? 1 : 0;
      gain.connect(out);
      return gain;
    });
    const sources = buffers.map((buffer, i) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gains[i]);
      source.start(startAt, Math.min(Math.max(offset, 0), buffer.duration));
      return source;
    });
    session = { out, gains, sources, startAt, offset };
    ramp(out.gain, 1);
  };

  return {
    start,
    stop,
    isRunning: () => !!session,
    time: () => (session ? session.offset + (ctx.currentTime - session.startAt) : null),
    select(index) {
      selected = index;
      session?.gains.forEach((gain, i) => ramp(gain.gain, i === index ? 1 : 0));
    },
    setMuted(value) {
      muted = value;
      if (master) ramp(master.gain, value ? 0 : 1);
    },
  };
}

export function createMediaEngine(tracks, initialTrack) {
  const els = tracks.map(({ src }) => createTag('audio', { preload: 'auto', src }));
  let selected = initialTrack;
  let muted = false;
  let running = false;
  const apply = () => els.forEach((audio, i) => { audio.muted = muted || i !== selected; });
  apply();
  return {
    start(offset) {
      running = true;
      els.forEach((audio) => {
        audio.currentTime = offset;
        audio.play()?.catch(() => {});
      });
    },
    stop() {
      running = false;
      els.forEach((audio) => audio.pause());
    },
    isRunning: () => running,
    time: () => (running ? els[selected].currentTime : null),
    select(index) { selected = index; apply(); },
    setMuted(value) { muted = value; apply(); },
  };
}

function scheduleIdle(fn) {
  const run = () => (window.requestIdleCallback
    ? window.requestIdleCallback(fn, { timeout: 2000 })
    : setTimeout(fn, 0));
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

function pickActiveMediaContainer(mediaWrapper) {
  const containers = [...mediaWrapper.querySelectorAll(':scope > .media-container')];
  const active = containers.find((c) => c.querySelector('video') && getComputedStyle(c).display !== 'none')
    || containers.find((c) => c.querySelector('video'));
  if (!active) return null;
  containers.filter((c) => c !== active).forEach((c) => c.remove());
  active.classList.remove('mobile-up', 'tablet-up', 'desktop-up');
  return active;
}

function buildToggle(tracks, selected, labels, onSelect) {
  const group = createTag('div', { class: 'audio-compare-toggle', role: 'radiogroup', 'aria-label': labels['audio-version'] });
  const options = tracks.map(({ label }, i) => createTag('button', {
    type: 'button',
    class: 'audio-compare-option',
    role: 'radio',
    'aria-checked': String(i === selected),
    tabindex: i === selected ? '0' : '-1',
  }, label));
  const choose = (index, focus) => {
    options.forEach((opt, i) => {
      opt.setAttribute('aria-checked', String(i === index));
      opt.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    if (focus) options[index].focus();
    onSelect(index);
  };
  options.forEach((opt, i) => {
    opt.addEventListener('click', () => choose(i, false));
    opt.addEventListener('keydown', (e) => {
      const last = options.length - 1;
      const targets = {
        ArrowRight: (i + 1) % options.length,
        ArrowDown: (i + 1) % options.length,
        ArrowLeft: (i + last) % options.length,
        ArrowUp: (i + last) % options.length,
        Home: 0,
        End: last,
      };
      if (targets[e.key] === undefined) return;
      e.preventDefault();
      choose(targets[e.key], true);
    });
  });
  group.append(...options);
  return group;
}

export default async function initAudioCompare(el, tracks) {
  const mediaWrapper = el.querySelector('.upload-marquee-media');
  if (!mediaWrapper || tracks.length < 2) {
    logAudioCompare(`requires media and 2+ audio tracks (found ${tracks.length})`);
    return null;
  }
  const container = pickActiveMediaContainer(mediaWrapper);
  const video = container?.querySelector('video');
  if (!video) {
    logAudioCompare('no video found');
    return null;
  }
  const labels = { ...LABEL_DEFAULTS };
  let selected = tracks.length - 1;
  let isMuted = false;
  let engine = null;
  let enginePromise = null;
  let rafId = 0;

  video.controls = false;
  video.removeAttribute('controls');
  video.removeAttribute('autoplay');
  video.removeAttribute('loop');
  video.muted = true;
  video.setAttribute('muted', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  video.playsInline = true;
  if (navigator.audioSession) navigator.audioSession.type = 'playback';

  const playBtn = createTag('button', { type: 'button', class: 'audio-compare-play', 'aria-label': labels['audio-play'] });
  playBtn.innerHTML = ICONS.play;
  const muteBtn = createTag('button', { type: 'button', class: 'audio-compare-mute', 'aria-label': labels['audio-mute'] });
  muteBtn.innerHTML = ICONS.volume;
  const time = createTag('span', { class: 'audio-compare-time' }, '00:00 / 00:00');
  const scrubber = createTag('input', {
    type: 'range', class: 'audio-compare-scrubber', min: '0', max: '0', step: 'any', value: '0', 'aria-label': labels['audio-seek'],
  });
  const controls = createTag('div', { class: 'audio-compare-controls' }, [scrubber, playBtn, time, muteBtn]);
  const loader = createTag('div', { class: 'audio-compare-loader', 'aria-hidden': 'true' });
  loader.innerHTML = LOADER_SPINNER;
  const status = createTag('span', { class: 'audio-compare-status', role: 'status' });

  let pendingPlay = false;
  let buffering = false;
  let loaderTimer = 0;
  // Delayed so fast loads never flash the spinner; announced once per loading period.
  const updateLoader = () => {
    if (!pendingPlay && !buffering) {
      clearTimeout(loaderTimer);
      loaderTimer = 0;
      container.classList.remove('is-loading');
      status.textContent = '';
      return;
    }
    if (loaderTimer || container.classList.contains('is-loading')) return;
    loaderTimer = setTimeout(() => {
      loaderTimer = 0;
      container.classList.add('is-loading');
      status.textContent = labels['audio-loading'];
    }, LOADER_DELAY_MS);
  };
  const setBuffering = (value) => {
    buffering = value;
    updateLoader();
  };

  // Audio only runs while the video has data to advance; otherwise the drift check
  // would restart it every frame during buffering and stutter.
  const canPlayAudio = () => engine && !video.paused && !video.seeking
    && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;

  const startAudio = () => {
    if (canPlayAudio()) engine.start(video.currentTime);
  };

  const ensureEngine = () => {
    video.preload = 'auto';
    if (!enginePromise) {
      enginePromise = decodeTracks(tracks)
        .then((buffers) => createWebAudioEngine(buffers, selected))
        .catch((e) => {
          logAudioCompare(`web audio unavailable, using media fallback: ${e.message}`);
          return createMediaEngine(tracks, selected);
        })
        .then((created) => {
          engine = created;
          engine.select(selected);
          engine.setMuted(isMuted);
          startAudio();
          return engine;
        });
    }
    return enginePromise;
  };

  let timeText = '';
  const render = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    scrubber.max = String(duration);
    scrubber.value = String(video.currentTime);
    scrubber.style.setProperty('--audio-compare-progress', `${duration ? (video.currentTime / duration) * 100 : 0}%`);
    const text = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
    if (text === timeText) return;
    timeText = text;
    scrubber.setAttribute('aria-valuetext', text);
    time.textContent = text;
  };

  const seekTo = (seconds) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration || Number.isNaN(seconds)) return;
    video.currentTime = Math.min(Math.max(seconds, 0), duration);
    render();
  };

  const tick = () => {
    render();
    if (engine) {
      if (!canPlayAudio()) {
        if (engine.isRunning()) engine.stop();
      } else if (!engine.isRunning()
        || Math.abs(engine.time() - video.currentTime) > DRIFT_TOLERANCE_SECONDS) {
        startAudio();
      }
    }
    rafId = requestAnimationFrame(tick);
  };

  const setPlayingUi = (playing) => {
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.setAttribute('aria-label', labels[playing ? 'audio-pause' : 'audio-play']);
    container.classList.toggle('is-playing', playing);
  };

  // The play icon stays visible while audio decodes; the centered loader shows progress.
  const setLoadingUi = (loading) => {
    pendingPlay = loading;
    if (loading) {
      playBtn.setAttribute('aria-busy', 'true');
      playBtn.setAttribute('aria-label', labels['audio-loading']);
    } else {
      playBtn.removeAttribute('aria-busy');
      setPlayingUi(!video.paused && !video.ended);
    }
    updateLoader();
  };

  // Treat play-requested-but-not-yet-playing as buffering so the loader doesn't
  // flicker between audio decode finishing and the video's first frame.
  const playVideo = () => {
    setPlayingUi(true);
    setBuffering(true);
    video.play()?.catch((e) => {
      setBuffering(false);
      setPlayingUi(false);
      logAudioCompare(`video play failed: ${e.message}`);
    });
  };

  // Hold playback until both tracks are decoded so the video never starts silent.
  const togglePlay = () => {
    unlockAudioContext();
    if (pendingPlay) {
      setLoadingUi(false);
      return;
    }
    if (!video.paused && !video.ended) {
      video.pause();
      return;
    }
    if (engine) {
      playVideo();
      return;
    }
    setLoadingUi(true);
    ensureEngine().then(() => {
      if (!pendingPlay) return;
      buffering = true;
      setLoadingUi(false);
      playVideo();
    }).catch((e) => {
      setLoadingUi(false);
      logAudioCompare(`audio engine failed: ${e.message}`);
    });
  };

  playBtn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    engine?.setMuted(isMuted);
    muteBtn.innerHTML = isMuted ? ICONS.muted : ICONS.volume;
    muteBtn.setAttribute('aria-label', labels[isMuted ? 'audio-unmute' : 'audio-mute']);
  });
  scrubber.addEventListener('input', () => seekTo(Number(scrubber.value)));
  scrubber.addEventListener('keydown', (e) => {
    const steps = {
      ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5,
    };
    if (e.key === 'Home') seekTo(0);
    else if (e.key === 'End') seekTo(video.duration);
    else if (steps[e.key] !== undefined) seekTo(video.currentTime + steps[e.key]);
    else return;
    e.preventDefault();
  });

  video.addEventListener('play', () => {
    setPlayingUi(true);
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  });
  video.addEventListener('playing', () => {
    setBuffering(false);
    startAudio();
  });
  video.addEventListener('seeked', () => { startAudio(); render(); });
  ['waiting', 'seeking'].forEach((type) => video.addEventListener(type, () => engine?.stop()));
  video.addEventListener('waiting', () => {
    if (!video.paused) setBuffering(true);
  });
  video.addEventListener('pause', () => {
    engine?.stop();
    setBuffering(false);
    cancelAnimationFrame(rafId);
    if (!video.ended) setPlayingUi(false);
    render();
  });
  video.addEventListener('ended', () => {
    engine?.stop();
    setBuffering(false);
    video.currentTime = 0;
    setPlayingUi(false);
    render();
  });
  ['loadedmetadata', 'durationchange'].forEach((type) => video.addEventListener(type, render));

  const toggle = buildToggle(tracks, selected, labels, (index) => {
    selected = index;
    engine?.select(index);
  });

  container.classList.add('audio-compare-player');
  container.append(loader, toggle, controls, status);
  render();

  getLabels().then((resolved) => {
    Object.assign(labels, resolved);
    toggle.setAttribute('aria-label', labels['audio-version']);
    scrubber.setAttribute('aria-label', labels['audio-seek']);
    const playing = !video.paused && !video.ended;
    const playKey = playing ? 'audio-pause' : 'audio-play';
    playBtn.setAttribute('aria-label', labels[pendingPlay ? 'audio-loading' : playKey]);
    muteBtn.setAttribute('aria-label', labels[isMuted ? 'audio-unmute' : 'audio-mute']);
  });

  if (navigator.connection?.saveData) {
    container.addEventListener('pointerenter', ensureEngine, { once: true });
    container.addEventListener('focusin', ensureEngine, { once: true });
  } else {
    scheduleIdle(ensureEngine);
  }
  return { container, video, ensureEngine };
}

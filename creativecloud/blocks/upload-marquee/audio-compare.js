import { createTag, getLibs } from '../../scripts/utils.js';

const FADE_SECONDS = 0.02;
const DRIFT_TOLERANCE_SECONDS = 0.08;
const DECODE_SAMPLE_RATE = 48000;
const LABEL_DEFAULTS = {
  'audio-play': 'Play',
  'audio-pause': 'Pause',
  'audio-mute': 'Mute',
  'audio-unmute': 'Unmute',
  'audio-seek': 'Seek',
  'audio-version': 'Audio version',
};
const ICONS = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 4.2v11.6c0 .6.7 1 1.2.6l9-5.8c.4-.3.4-.9 0-1.2l-9-5.8C6.7 3.2 6 3.6 6 4.2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/></svg>',
  volume: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 7.2a4 4 0 0 1 0 5.6M15.3 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 7.5h3l4-3.5v12l-4-3.5H3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m13 7.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
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

  const startAudio = () => {
    if (engine && !video.paused && !video.seeking) engine.start(video.currentTime);
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
    const audioTime = engine?.isRunning() ? engine.time() : null;
    if (audioTime !== null && Math.abs(audioTime - video.currentTime) > DRIFT_TOLERANCE_SECONDS) {
      startAudio();
    }
    rafId = requestAnimationFrame(tick);
  };

  const setPlayingUi = (playing) => {
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.setAttribute('aria-label', labels[playing ? 'audio-pause' : 'audio-play']);
    container.classList.toggle('is-playing', playing);
  };

  const togglePlay = () => {
    unlockAudioContext();
    ensureEngine();
    if (video.paused || video.ended) {
      setPlayingUi(true);
      video.play()?.catch((e) => {
        setPlayingUi(false);
        logAudioCompare(`video play failed: ${e.message}`);
      });
    } else {
      video.pause();
    }
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
  video.addEventListener('playing', startAudio);
  video.addEventListener('seeked', () => { startAudio(); render(); });
  ['waiting', 'seeking'].forEach((type) => video.addEventListener(type, () => engine?.stop()));
  video.addEventListener('pause', () => {
    engine?.stop();
    cancelAnimationFrame(rafId);
    if (!video.ended) setPlayingUi(false);
    render();
  });
  video.addEventListener('ended', () => {
    engine?.stop();
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
  container.append(toggle, controls);
  render();

  getLabels().then((resolved) => {
    Object.assign(labels, resolved);
    toggle.setAttribute('aria-label', labels['audio-version']);
    scrubber.setAttribute('aria-label', labels['audio-seek']);
    const playing = !video.paused && !video.ended;
    playBtn.setAttribute('aria-label', labels[playing ? 'audio-pause' : 'audio-play']);
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

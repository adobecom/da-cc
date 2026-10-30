import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import initAudioCompare, {
  formatTime,
  createWebAudioEngine,
  createMediaEngine,
} from '../../../creativecloud/blocks/upload-marquee/audio-compare.js';
import { extractAudioTracks } from '../../../creativecloud/blocks/upload-marquee/upload-marquee.js';

const TRACKS = [
  { label: 'Original', src: '/original-audio.mp4' },
  { label: 'Enhanced', src: '/enhanced-audio.mp4' },
];

function createFakeAudioContext() {
  const param = () => {
    const p = {
      value: 0,
      cancelScheduledValues: sinon.spy(),
      setValueAtTime: sinon.spy(),
    };
    p.linearRampToValueAtTime = sinon.spy((v) => { p.value = v; });
    return p;
  };
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    gains: [],
    sources: [],
    createGain() {
      const gain = { gain: param(), connect: sinon.spy(), disconnect: sinon.spy() };
      ctx.gains.push(gain);
      return gain;
    },
    createBufferSource() {
      const source = { connect: sinon.spy(), start: sinon.spy(), stop: sinon.spy() };
      ctx.sources.push(source);
      return source;
    },
  };
  return ctx;
}

function buildPlayerDom() {
  document.body.innerHTML = `
    <div class="upload-marquee audio-compare">
      <div class="upload-marquee-media">
        <div class="media-container mobile-up" style="display:none"><video></video></div>
        <div class="media-container tablet-up desktop-up"><video controls autoplay loop></video></div>
      </div>
    </div>`;
  return document.querySelector('.upload-marquee');
}

describe('audio-compare formatTime', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatTime(0)).to.equal('00:00');
    expect(formatTime(5.9)).to.equal('00:05');
    expect(formatTime(74)).to.equal('01:14');
  });

  it('treats invalid values as zero', () => {
    expect(formatTime(NaN)).to.equal('00:00');
    expect(formatTime(-3)).to.equal('00:00');
    expect(formatTime(Infinity)).to.equal('00:00');
  });
});

describe('audio-compare web audio engine', () => {
  let ctx;
  let originalCtx;

  before(() => {
    originalCtx = window.AudioContext;
    ctx = createFakeAudioContext();
    window.AudioContext = function FakeAudioContext() { return ctx; };
  });

  after(() => {
    window.AudioContext = originalCtx;
  });

  it('starts every track in sync with only the selected track audible', () => {
    const engine = createWebAudioEngine([{ duration: 14 }, { duration: 14 }], 1);
    engine.start(3);
    expect(engine.isRunning()).to.be.true;
    ctx.sources.slice(-2).forEach((source) => expect(source.start.calledWith(0, 3)).to.be.true);
    const [original, enhanced] = ctx.gains.slice(-2);
    expect(original.gain.value).to.equal(0);
    expect(enhanced.gain.value).to.equal(1);
    expect(engine.time()).to.equal(3);
  });

  it('crossfades between tracks on select', () => {
    const engine = createWebAudioEngine([{ duration: 14 }, { duration: 14 }], 1);
    engine.start(0);
    const [original, enhanced] = ctx.gains.slice(-2);
    engine.select(0);
    expect(original.gain.linearRampToValueAtTime.calledWith(1)).to.be.true;
    expect(enhanced.gain.linearRampToValueAtTime.calledWith(0)).to.be.true;
  });

  it('ramps the master gain on mute', () => {
    const engine = createWebAudioEngine([{ duration: 14 }, { duration: 14 }], 1);
    const masterIndex = ctx.gains.length;
    engine.start(0);
    engine.setMuted(true);
    expect(ctx.gains[masterIndex].gain.linearRampToValueAtTime.calledWith(0)).to.be.true;
    engine.setMuted(false);
  });

  it('stops all sources and reports not running', () => {
    const engine = createWebAudioEngine([{ duration: 14 }, { duration: 14 }], 0);
    engine.start(0);
    const sources = ctx.sources.slice(-2);
    engine.stop();
    expect(engine.isRunning()).to.be.false;
    expect(engine.time()).to.equal(null);
    sources.forEach((source) => expect(source.stop.called).to.be.true);
  });
});

describe('audio-compare media engine', () => {
  it('tracks running state and selection', () => {
    const engine = createMediaEngine(TRACKS, 1);
    engine.select(0);
    engine.setMuted(true);
    expect(engine.isRunning()).to.be.false;
    expect(engine.time()).to.equal(null);
    engine.stop();
    expect(engine.isRunning()).to.be.false;
  });
});

describe('audio-compare player', () => {
  let el;
  let video;
  let fetchStub;
  let player;

  const stubPlay = (target) => sinon.stub(target, 'play').callsFake(() => {
    target.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });

  before(async () => {
    fetchStub = sinon.stub(window, 'fetch').rejects(new Error('blocked'));
    el = buildPlayerDom();
    player = await initAudioCompare(el, TRACKS);
    video = el.querySelector('video');
    sinon.stub(video, 'play').callsFake(() => {
      video.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
  });

  after(() => {
    fetchStub.restore();
  });

  it('keeps only the visible media container and strips viewport classes', () => {
    const containers = el.querySelectorAll('.media-container');
    expect(containers.length).to.equal(1);
    expect(containers[0].classList.contains('audio-compare-player')).to.be.true;
    expect(containers[0].classList.contains('desktop-up')).to.be.false;
  });

  it('removes native controls, autoplay and loop and mutes the video', () => {
    expect(video.hasAttribute('controls')).to.be.false;
    expect(video.hasAttribute('autoplay')).to.be.false;
    expect(video.hasAttribute('loop')).to.be.false;
    expect(video.muted).to.be.true;
  });

  it('renders a radiogroup toggle with the last track selected', () => {
    const group = el.querySelector('.audio-compare-toggle');
    expect(group.getAttribute('role')).to.equal('radiogroup');
    expect(group.getAttribute('aria-label')).to.equal('Audio version');
    const options = [...group.querySelectorAll('[role="radio"]')];
    expect(options.map((o) => o.textContent)).to.deep.equal(['Original', 'Enhanced']);
    expect(options[1].getAttribute('aria-checked')).to.equal('true');
    expect(options[1].getAttribute('tabindex')).to.equal('0');
    expect(options[0].getAttribute('tabindex')).to.equal('-1');
  });

  it('moves selection and focus with arrow, Home and End keys', () => {
    const options = [...el.querySelectorAll('.audio-compare-option')];
    options[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(options[0].getAttribute('aria-checked')).to.equal('true');
    expect(document.activeElement).to.equal(options[0]);
    options[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(options[1].getAttribute('aria-checked')).to.equal('true');
    options[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(options[0].getAttribute('aria-checked')).to.equal('true');
    options[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(options[1].getAttribute('aria-checked')).to.equal('true');
  });

  it('selects a track on click', () => {
    const options = [...el.querySelectorAll('.audio-compare-option')];
    options[0].click();
    expect(options[0].getAttribute('aria-checked')).to.equal('true');
    expect(options[1].getAttribute('aria-checked')).to.equal('false');
  });

  it('swaps the play button label when playing and paused', async () => {
    await player.ensureEngine();
    const playBtn = el.querySelector('.audio-compare-play');
    expect(playBtn.getAttribute('aria-label')).to.equal('Play');
    playBtn.click();
    expect(playBtn.getAttribute('aria-label')).to.equal('Pause');
    expect(el.querySelector('.audio-compare-player').classList.contains('is-playing')).to.be.true;
    video.dispatchEvent(new Event('pause'));
    expect(playBtn.getAttribute('aria-label')).to.equal('Play');
  });

  it('toggles mute with an updated label', () => {
    const muteBtn = el.querySelector('.audio-compare-mute');
    expect(muteBtn.getAttribute('aria-label')).to.equal('Mute');
    muteBtn.click();
    expect(muteBtn.getAttribute('aria-label')).to.equal('Unmute');
    muteBtn.click();
    expect(muteBtn.getAttribute('aria-label')).to.equal('Mute');
  });

  it('exposes a labelled scrubber with a readable value', () => {
    const scrubber = el.querySelector('.audio-compare-scrubber');
    expect(scrubber.getAttribute('aria-label')).to.equal('Seek');
    expect(scrubber.getAttribute('aria-valuetext')).to.match(/^\d{2}:\d{2} \/ \d{2}:\d{2}$/);
  });

  it('handles scrubber keyboard seeking and ignores other keys', () => {
    const scrubber = el.querySelector('.audio-compare-scrubber');
    ['ArrowRight', 'PageDown', 'Home', 'End'].forEach((key) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      scrubber.dispatchEvent(event);
      expect(event.defaultPrevented).to.be.true;
    });
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    scrubber.dispatchEvent(tab);
    expect(tab.defaultPrevented).to.be.false;
  });

  it('hides the click surface video from assistive tech', () => {
    expect(video.getAttribute('aria-hidden')).to.equal('true');
    expect(video.getAttribute('tabindex')).to.equal('-1');
  });

  it('resets to the first frame and shows play on ended', () => {
    video.dispatchEvent(new Event('ended'));
    expect(video.currentTime).to.equal(0);
    expect(el.querySelector('.audio-compare-play').getAttribute('aria-label')).to.equal('Play');
  });

  it('shows a loading state until audio is ready, then plays', async () => {
    const result = await initAudioCompare(buildPlayerDom(), TRACKS);
    const play = stubPlay(result.video);
    const playBtn = result.container.querySelector('.audio-compare-play');
    playBtn.click();
    expect(playBtn.classList.contains('is-loading')).to.be.true;
    expect(playBtn.getAttribute('aria-busy')).to.equal('true');
    expect(playBtn.getAttribute('aria-label')).to.equal('Loading');
    expect(play.called).to.be.false;
    await result.ensureEngine();
    await Promise.resolve();
    expect(play.calledOnce).to.be.true;
    expect(playBtn.hasAttribute('aria-busy')).to.be.false;
    expect(playBtn.getAttribute('aria-label')).to.equal('Pause');
  });

  it('cancels a pending play when clicked again while loading', async () => {
    const result = await initAudioCompare(buildPlayerDom(), TRACKS);
    const play = stubPlay(result.video);
    const playBtn = result.container.querySelector('.audio-compare-play');
    playBtn.click();
    playBtn.click();
    await result.ensureEngine();
    await Promise.resolve();
    expect(play.called).to.be.false;
    expect(playBtn.classList.contains('is-loading')).to.be.false;
    expect(playBtn.getAttribute('aria-label')).to.equal('Play');
  });

  it('starts audio only once the video has data to play', async () => {
    const result = await initAudioCompare(buildPlayerDom(), TRACKS);
    const engine = await result.ensureEngine();
    const start = sinon.stub(engine, 'start');
    let readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
    Object.defineProperty(result.video, 'paused', { get: () => false });
    Object.defineProperty(result.video, 'readyState', { get: () => readyState });
    result.video.dispatchEvent(new Event('playing'));
    expect(start.called).to.be.false;
    readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    result.video.dispatchEvent(new Event('playing'));
    expect(start.calledOnce).to.be.true;
  });

  it('falls back to the media engine when decoding fails', async () => {
    const result = await initAudioCompare(buildPlayerDom(), TRACKS);
    const engine = await result.ensureEngine();
    expect(fetchStub.called).to.be.true;
    expect(engine.isRunning()).to.be.false;
    expect(result.video.preload).to.equal('auto');
  });

  it('returns null without enough tracks', async () => {
    expect(await initAudioCompare(buildPlayerDom(), TRACKS.slice(0, 1))).to.equal(null);
  });

  it('returns null without a video', async () => {
    document.body.innerHTML = '<div class="upload-marquee"><div class="upload-marquee-media"><div class="media-container"></div></div></div>';
    expect(await initAudioCompare(document.querySelector('.upload-marquee'), TRACKS)).to.equal(null);
  });
});

describe('upload-marquee extractAudioTracks', () => {
  it('reads label and link rows after the third row and strips #_dnb', () => {
    document.body.innerHTML = `
      <div class="upload-marquee audio-compare">
        <div><div>bg</div></div>
        <div><div>copy</div></div>
        <div><div>content</div></div>
        <div><div>Original</div><div><a href="https://main--da-cc--adobecom.aem.page/drafts/a/original-audio.mp4#_dnb">x</a></div></div>
        <div><div>Enhanced</div><div><a href="https://cdn.example.com/enhanced-audio.mp4#_dnb">x</a></div></div>
        <div><div>No link</div><div></div></div>
      </div>`;
    const rows = document.querySelectorAll('.upload-marquee > div');
    expect(extractAudioTracks(rows)).to.deep.equal([
      { label: 'Original', src: '/drafts/a/original-audio.mp4' },
      { label: 'Enhanced', src: 'https://cdn.example.com/enhanced-audio.mp4' },
    ]);
  });
});

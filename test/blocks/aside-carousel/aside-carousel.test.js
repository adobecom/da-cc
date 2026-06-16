import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

const { setLibs } = await import('../../../creativecloud/scripts/utils.js');
setLibs('https://milo.adobe.com/libs');
const { default: init } = await import('../../../creativecloud/blocks/aside-carousel/aside-carousel.js');

document.body.innerHTML = await readFile({ path: './mocks/body.html' });

describe('aside-carousel', () => {
  let el;
  let singleEl;
  let noClipEl;

  before(async () => {
    el = document.querySelector('#three-slides');
    singleEl = document.querySelector('#single-slide');
    noClipEl = document.querySelector('#no-clip');
    await Promise.all([init(el), init(singleEl), init(noClipEl)]);
  });

  // ===== Structure =====

  it('wraps slides in a slides-track', () => {
    expect(el.querySelector('.slides-track')).to.exist;
    expect(el.querySelectorAll('.slide').length).to.equal(3);
  });

  it('classifies image and text cells on each slide', () => {
    el.querySelectorAll('.slide').forEach((slide) => {
      expect(slide.querySelector('.image')).to.exist;
      expect(slide.querySelector('.text')).to.exist;
    });
  });

  it('svg arrows have aria-hidden', () => {
    el.querySelectorAll('.carousel-prev svg, .carousel-next svg').forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).to.equal('true');
    });
  });

  // ===== Single slide — no controls =====

  it('does not create controls or track for a single slide', () => {
    expect(singleEl.querySelector('.carousel-prev')).to.not.exist;
    expect(singleEl.querySelector('.slides-track')).to.not.exist;
  });

  // ===== Initial button state =====

  it('prev is disabled and next is enabled at start', () => {
    const prev = el.querySelector('.carousel-prev');
    const next = el.querySelector('.carousel-next');
    expect(prev.disabled).to.be.true;
    expect(prev.classList.contains('disabled')).to.be.true;
    expect(next.disabled).to.be.false;
    expect(next.classList.contains('disabled')).to.be.false;
  });

  // ===== Initial aria state =====

  it('first slide is visible and others are aria-hidden at start', () => {
    const slides = el.querySelectorAll('.slide');
    expect(slides[0].getAttribute('aria-hidden')).to.equal('false');
    expect(slides[1].getAttribute('aria-hidden')).to.equal('true');
    expect(slides[2].getAttribute('aria-hidden')).to.equal('true');
  });

  it('links inside hidden slides have tabindex="-1"', () => {
    const hiddenSlide = el.querySelectorAll('.slide')[1];
    hiddenSlide.querySelectorAll('a').forEach((a) => {
      expect(a.getAttribute('tabindex')).to.equal('-1');
    });
  });

  // ===== Navigation =====

  it('clicking next enables prev and advances aria state', () => {
    el.querySelector('.carousel-next').click();
    const slides = el.querySelectorAll('.slide');
    expect(el.querySelector('.carousel-prev').disabled).to.be.false;
    expect(slides[0].getAttribute('aria-hidden')).to.equal('true');
    expect(slides[1].getAttribute('aria-hidden')).to.equal('false');
  });

  it('aria-live region announces the new slide index', () => {
    const live = el.querySelector('.sr-only[aria-live]');
    expect(live.textContent).to.equal('Slide 2 of 3');
  });

  it('clicking prev goes back and re-disables prev', () => {
    el.querySelector('.carousel-prev').click();
    expect(el.querySelector('.carousel-prev').disabled).to.be.true;
    expect(el.querySelectorAll('.slide')[0].getAttribute('aria-hidden')).to.equal('false');
  });

  it('next is disabled when all remaining slides are visible', () => {
    // advance to last reachable position
    const next = el.querySelector('.carousel-next');
    while (!next.disabled) next.click();
    expect(next.disabled).to.be.true;
    expect(next.classList.contains('disabled')).to.be.true;
    // reset
    const prev = el.querySelector('.carousel-prev');
    while (!prev.disabled) prev.click();
  });

  // ===== Keyboard navigation =====

  it('ArrowRight and ArrowLeft navigate slides', () => {
    const slides = el.querySelectorAll('.slide');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(slides[1].getAttribute('aria-hidden')).to.equal('false');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(slides[0].getAttribute('aria-hidden')).to.equal('false');
  });

  // ===== Authored no-clip-left modifier =====

  it('preserves the no-clip-left class through init and still decorates slides', () => {
    expect(noClipEl.classList.contains('no-clip-left')).to.be.true;
    expect(noClipEl.querySelectorAll('.slide').length).to.equal(2);
    expect(noClipEl.querySelector('.slides-track')).to.exist;
  });
});

describe('aside-carousel — RTL', () => {
  let rtlEl;

  before(async () => {
    document.documentElement.dir = 'rtl';
    rtlEl = document.querySelector('#rtl-three-slides');
    await init(rtlEl);
  });

  after(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('next (right arrow) is disabled and prev (left arrow) is enabled at start', () => {
    const prev = rtlEl.querySelector('.carousel-prev');
    const next = rtlEl.querySelector('.carousel-next');
    expect(next.disabled).to.be.true;
    expect(next.classList.contains('disabled')).to.be.true;
    expect(prev.disabled).to.be.false;
    expect(prev.classList.contains('disabled')).to.be.false;
  });

  it('clicking prev (left arrow) advances to slide 2', () => {
    rtlEl.querySelector('.carousel-prev').click();
    const slides = rtlEl.querySelectorAll('.slide');
    expect(slides[0].getAttribute('aria-hidden')).to.equal('true');
    expect(slides[1].getAttribute('aria-hidden')).to.equal('false');
  });

  it('aria-live announces new position after RTL advance', () => {
    expect(rtlEl.querySelector('.sr-only[aria-live]').textContent).to.equal('Slide 2 of 3');
  });

  it('clicking next (right arrow) goes back to slide 1', () => {
    rtlEl.querySelector('.carousel-next').click();
    const slides = rtlEl.querySelectorAll('.slide');
    expect(slides[0].getAttribute('aria-hidden')).to.equal('false');
    expect(rtlEl.querySelector('.carousel-next').disabled).to.be.true;
  });

  it('prev is disabled when all remaining slides are visible in RTL', () => {
    const prev = rtlEl.querySelector('.carousel-prev');
    while (!prev.disabled) prev.click();
    expect(prev.disabled).to.be.true;
    expect(prev.classList.contains('disabled')).to.be.true;
    // reset
    const next = rtlEl.querySelector('.carousel-next');
    while (!next.disabled) next.click();
  });

  it('ArrowLeft advances and ArrowRight goes back in RTL', () => {
    const slides = rtlEl.querySelectorAll('.slide');
    rtlEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(slides[1].getAttribute('aria-hidden')).to.equal('false');
    rtlEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(slides[0].getAttribute('aria-hidden')).to.equal('false');
  });

  it('swipe left advances and swipe right goes back in RTL', () => {
    const slides = rtlEl.querySelectorAll('.slide');
    const mkTouch = (x) => new Touch({
      identifier: 1, target: rtlEl, screenX: x, screenY: 0, clientX: x, clientY: 0, pageX: x, pageY: 0,
    });

    rtlEl.dispatchEvent(new TouchEvent('touchstart', { touches: [mkTouch(300)] }));
    rtlEl.dispatchEvent(new TouchEvent('touchend', { changedTouches: [mkTouch(200)] }));
    expect(slides[1].getAttribute('aria-hidden')).to.equal('false');

    rtlEl.dispatchEvent(new TouchEvent('touchstart', { touches: [mkTouch(200)] }));
    rtlEl.dispatchEvent(new TouchEvent('touchend', { changedTouches: [mkTouch(300)] }));
    expect(slides[0].getAttribute('aria-hidden')).to.equal('false');
  });
});

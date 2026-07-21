import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

document.body.innerHTML = await readFile({ path: './mocks/body.html' });
const ogBody = document.body.innerHTML;

const { setLibs, getLibs } = await import('../../../creativecloud/scripts/utils.js');
setLibs('https://milo.adobe.com/libs');

const { setConfig } = await import(`${getLibs()}/utils/utils.js`);
setConfig({
  locale: { ietf: 'en-US' },
  placeholders: {
    'share-this-page': 'share this page', // lowercase to test toSentenceCase transformation
    'share-to': 'Share to',
    'copy-to-clipboard': 'Copy to clipboard',
    copied: 'Copied',
  },
});

const {
  getSVGsfromFile,
  default: decorate,
} = await import('../../../creativecloud/blocks/firefly-share/firefly-share.js');

const MOCK_FIREFLY_SHARE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="facebook"><path d="M0"/></symbol>
  <symbol id="x"><path d="M1"/></symbol>
  <symbol id="linkedin"><path d="M2"/></symbol>
  <symbol id="pinterest"><path d="M3"/></symbol>
  <symbol id="reddit"><path d="M4"/></symbol>
  <symbol id="clipboard"><path d="M5"/></symbol>
  <symbol id="bar"><path d="M6"/></symbol>
</svg>
`;

const MOCK_SVG_URL = '/cc-shared/assets/svg/firefly-share.svg';

const emptyResponse = () => Promise.resolve({
  ok: true,
  text: () => Promise.resolve(''),
  json: () => Promise.resolve({}),
});

function stubFetchForSvg() {
  return sinon.stub(window, 'fetch').callsFake((input) => {
    const u = typeof input === 'string' ? input : input.url;
    if (String(u).includes('firefly-share')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(MOCK_FIREFLY_SHARE_SVG),
      });
    }
    return emptyResponse();
  });
}

function resetFixtureDom() {
  document.body.innerHTML = ogBody;
}

function ensureClipboard() {
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      configurable: true,
    });
  }
}

describe('firefly-share block', () => {
  let fetchStub;

  before(async () => {
    const miloLibs = getLibs('/libs');
    await Promise.all([
      import(`${miloLibs}/utils/inline.js`),
      import(`${miloLibs}/features/placeholders.js`),
      import(`${miloLibs}/utils/utils.js`),
    ]);
  });

  beforeEach(() => {
    resetFixtureDom();
    ensureClipboard();
    fetchStub = stubFetchForSvg();
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('getSVGsfromFile', () => {
    it('returns null for missing path, failed fetch, or document without root svg', async () => {
      expect(await getSVGsfromFile(null)).to.be.null;
      expect(await getSVGsfromFile('')).to.be.null;

      fetchStub.restore();
      fetchStub = sinon.stub(window, 'fetch').resolves({ ok: false, text: () => Promise.resolve('') });
      expect(await getSVGsfromFile(MOCK_SVG_URL)).to.be.null;

      fetchStub.restore();
      fetchStub = sinon.stub(window, 'fetch').resolves({
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>'),
      });
      expect(await getSVGsfromFile(MOCK_SVG_URL)).to.be.null;
    });

    it('parses svg with and without selector lists', async () => {
      const noSelectors = await getSVGsfromFile(MOCK_SVG_URL);
      expect(noSelectors).to.be.an('array').with.lengthOf(1);
      expect(noSelectors[0].svg.tagName.toLowerCase()).to.equal('svg');
      expect(noSelectors[0].svg.querySelector('symbol#facebook')).to.exist;

      const single = await getSVGsfromFile(MOCK_SVG_URL, 'facebook');
      expect(single[0].name).to.equal('facebook');

      const multi = await getSVGsfromFile(MOCK_SVG_URL, ['facebook', 'x']);
      expect(multi[0].svg.classList.contains('icon-facebook')).to.be.true;
      expect(multi[1].svg.classList.contains('icon-x')).to.be.true;

      const missing = await getSVGsfromFile(MOCK_SVG_URL, ['not-a-real-symbol']);
      expect(missing[0]).to.be.null;
    });
  });

  describe('decorate', () => {
    it('renders social share links and heading correctly', async () => {
      const block = document.querySelector('#share-default');
      await decorate(block);

      const heading = block.querySelector('.tracking-header [role="heading"]');
      expect(heading.getAttribute('aria-level')).to.equal('2');

      const list = block.querySelector('ul.icon-container');
      const shareAnchors = list.querySelectorAll('a[target="_blank"]');
      expect(shareAnchors.length).to.equal(5);
      const hrefs = [...shareAnchors].map((a) => a.href);
      expect(hrefs.some((h) => h.includes('facebook.com/sharer'))).to.be.true;
      expect(hrefs.some((h) => h.includes('x.com/share'))).to.be.true;
      expect(hrefs.some((h) => h.includes('linkedin.com/sharing'))).to.be.true;
      expect(hrefs.some((h) => h.includes('pinterest.com/pin'))).to.be.true;
      expect(hrefs.some((h) => h.includes('reddit.com/submit'))).to.be.true;
    });

    it('clipboard tooltip responds to keyboard and mouse interactions', async () => {
      const block = document.querySelector('#share-default');
      await decorate(block);
      const list = block.querySelector('ul.icon-container');
      const copyButton = list.querySelector('button.copy-to-clipboard');
      const li = copyButton.closest('li');

      // Non-Escape keydown should be a no-op (tooltip state unchanged)
      copyButton.classList.add('hide-copy-tooltip');
      copyButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.true;

      // Escape should hide tooltip
      copyButton.classList.remove('hide-copy-tooltip');
      copyButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.true;

      // Focus should show tooltip
      copyButton.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.false;

      // Blur should hide tooltip
      copyButton.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.true;

      // Mouseenter on li should show tooltip
      li.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.false;

      // Mouseleave should hide tooltip
      li.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.true;
    });

    it('copies URL to clipboard and shows confirmation then hides after timeout', async () => {
      const block = document.querySelector('#share-default');
      await decorate(block);
      const list = block.querySelector('ul.icon-container');
      const copyButton = list.querySelector('button.copy-to-clipboard');
      const live = block.querySelector('.aria-live-container');

      const writeTextStub = sinon.stub(navigator.clipboard, 'writeText').resolves();
      const clock = sinon.useFakeTimers();

      try {
        copyButton.click();
        await Promise.resolve(); // allow promise microtask to settle
        expect(copyButton.classList.contains('copy-to-clipboard-copied')).to.be.true;
        expect(live.textContent.length).to.be.at.least(1);
        expect(live.textContent).to.not.include('\u200b');

        copyButton.click();
        await Promise.resolve();
        expect(copyButton.classList.contains('copy-to-clipboard-copied')).to.be.true;
        expect(live.textContent).to.include('\u200b');

        clock.tick(2000);
        expect(copyButton.classList.contains('hide-copy-tooltip')).to.be.true;
      } finally {
        clock.restore();
        writeTextStub.restore();
      }
    });

    it('does not mark copied when clipboard.writeText rejects', async () => {
      const block = document.querySelector('#share-default');
      await decorate(block);
      const list = block.querySelector('ul.icon-container');
      const copyButton = list.querySelector('button.copy-to-clipboard');
      const live = block.querySelector('.aria-live-container');

      const writeRejectStub = sinon.stub(navigator.clipboard, 'writeText').rejects(new Error('Permission denied'));

      try {
        copyButton.click();
        // wait a microtask so the promise rejection is observed by the handler
        await Promise.resolve();

        // The UI should not show the copied state when writeText fails
        expect(copyButton.classList.contains('copy-to-clipboard-copied')).to.be.false;
        // aria-live should not be updated with a copied message
        expect(live.textContent.length).to.equal(0);
      } finally {
        writeRejectStub.restore();
      }
    });

    it('sets aria-level from previous h3', async () => {
      const afterH3 = document.querySelector('#share-after-h3');
      await decorate(afterH3);
      expect(afterH3.querySelector('[role="heading"]').getAttribute('aria-level')).to.equal('3');
    });

    it('removes first row when block has inline class', async () => {
      const inline = document.querySelector('#share-inline');
      await decorate(inline);
      expect(inline.querySelector(':scope > div')).to.be.null;
    });

    it('uses authored text as heading when provided', async () => {
      const authored = document.querySelector('#share-authored');
      await decorate(authored);
      expect(authored.querySelector('.tracking-header [role="heading"]').textContent.trim()).to.equal('Custom heading');
    });

    it('generates share links from manual anchor elements', async () => {
      const openStub = sinon.stub(window, 'open');

      try {
        const manual = document.querySelector('#share-manual');
        const unknownHostLink = manual.querySelector('a[href="https://x.bar.com/share"]');
        expect(unknownHostLink).to.exist;
        expect(unknownHostLink.closest('p')).to.be.null;

        await decorate(manual);
        const shareAnchors = manual.querySelectorAll('a[target="_blank"]');
        expect(shareAnchors.length).to.equal(2);
        expect([...shareAnchors].some((a) => new URL(a.href).hostname === 'x.bar.com')).to.be.false;

        shareAnchors[0].click();
        expect(openStub.calledOnce).to.be.true;
        // assert the URL was constructed correctly
        expect(openStub.firstCall.args[0]).to.include('x.com/share');
        // assert window.open was called with width parameter
        expect(openStub.firstCall.args[2]).to.include('width=600');
      } finally {
        openStub.restore();
      }
    });

    it('returns early when SVG fetch fails', async () => {
      fetchStub.restore();
      fetchStub = sinon.stub(window, 'fetch').resolves({ ok: false, text: () => Promise.resolve('') });
      const block = document.createElement('div');
      block.innerHTML = '<div></div>';
      document.body.appendChild(block);
      await decorate(block);
      expect(block.querySelector('ul.icon-container')).to.be.null;
      block.remove();
    });

    it('defaults aria-level to 2 when no heading precedes the block', async () => {
      document.body.innerHTML = '<div class="firefly-share" id="share-isolated"><div></div></div>';
      const block = document.querySelector('#share-isolated');
      await decorate(block);
      expect(block.querySelector('[role="heading"]').getAttribute('aria-level')).to.equal('2');
      document.body.innerHTML = ogBody;
    });

    it('uses page URL when document.title is undefined', async () => {
      const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
      try {
        Object.defineProperty(document, 'title', {
          configurable: true,
          get: () => undefined,
        });
        const block = document.createElement('div');
        block.innerHTML = '<div></div>';
        document.body.appendChild(block);
        await decorate(block);
        const pinterest = [...block.querySelectorAll('a')].find((a) => {
          try {
            const url = new URL(a.href);
            return url.hostname === 'pinterest.com' || url.hostname.endsWith('.pinterest.com');
          } catch {
            return false;
          }
        });
        expect(pinterest).to.exist;
        const pUrl = new URL(pinterest.href);
        expect(pUrl.searchParams.get('description')).to.equal(window.location.href);
        block.remove();
      } finally {
        if (desc) {
          Object.defineProperty(document, 'title', desc);
        } else {
          delete document.title;
        }
      }
    });

    it('omits clipboard when navigator.clipboard is unavailable', async () => {
      const prev = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

      try {
        const block = document.createElement('div');
        block.innerHTML = '<div></div>';
        document.body.appendChild(block);
        await decorate(block);
        expect(block.querySelector('button.copy-to-clipboard')).to.be.null;
        block.remove();
      } finally {
        if (prev !== undefined) {
          Object.defineProperty(navigator, 'clipboard', { value: prev, configurable: true });
        } else {
          delete navigator.clipboard;
        }
        ensureClipboard();
      }
    });
  });
});

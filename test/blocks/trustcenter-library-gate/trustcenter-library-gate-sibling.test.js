/* eslint-disable chai-friendly/no-unused-expressions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

window.lana = { log: ({ message, errorMessage, sampleRate }) => {} };
window.adobeIMS = {
  isSignedInUser: () => true,
  signIn: () => {},
  // eslint-disable-next-line arrow-body-style
  getAccessToken: () => { return { token: 'token' }; },
};

const { setConfig } = await import(import.meta.resolve('libs/utils/utils.js'));
const Config = {
  ids: {
    signedOutContainer: 'trustcenter-signedout-container',
    publicDomainContainer: 'trustcenter-publicdomain-container',
    ndaContainer: 'trustcenter-nda-container',
    documentContainer: 'trustcenter-document-container',
    errorContainer: 'trustcenter-error-container',
    signInCta: 'signin-cta',
    signNdaCta: 'sign-nda-cta',
    encryptedAssetLink: 'data-encryptedassetlink',
    ndaiFrameContainer: 'nda-iframe-container',
    ndaiFrame: 'nda-iframe',
    loader: 'loader',
    nonPdfLink: 'non-pdf-link',
  },
};

const { setLibs } = await import('../../../creativecloud/scripts/utils.js');
const { default: init, TrustCenterLibraryGate } = await import('../../../creativecloud/blocks/trustcenter-library-gate/trustcenter-library-gate.js');
sinon.stub(TrustCenterLibraryGate.prototype, 'waitForIms').resolves();

document.body.innerHTML = await readFile({ path: './mocks/trustcenter-library-gate-sibling.html' });
describe('trustcenter library gate (sibling/document page shape)', () => {
  setTimeout(() => {
    window.alloy = () => {};
    window._satellite = { track: (x) => {} };
    window.alloy_all = { set: (x) => {} };
    window.digitalData = { _set: (x) => {} };
  }, 4000);

  const fetchStub = sinon.stub(window, 'fetch');
  let libraryaccessCallCount = 0;
  let documenthandlerCallCount = 0;
  let lastDocumenthandlerUrl = null;

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  before(async () => {
    setLibs('https://milo.adobe.com/libs');
    setConfig({ env: 'test' });
    // fetch must be stubbed BEFORE init(): unlike the legacy block (which only fetches after
    // a user click), this gate checks access immediately during init, so the stub has to be
    // in place first or that initial check races an unstubbed fetch and falls into the error
    // container instead.
    fetchStub.callsFake((url) => {
      let payload = {};
      if (url.pathname.includes('libraryaccess')) {
        libraryaccessCallCount += 1;
        // always NDA_REQUIRED - libraryaccess must only ever be called once (at init). After
        // signing, the gate deliberately does NOT re-call libraryaccess (NDADB sync lag - see
        // onNdaSigned() in trustcenter-library-gate.js), so a second call here would be a bug.
        payload = { status: 'NDA_REQUIRED' };
      } else if (url.pathname.includes('ndahandler')) {
        payload = { esignUrl: window.location, webAccessPoint: window.location, hasSigned: 'false' };
      } else if (url.pathname.includes('documenthandler')) {
        documenthandlerCallCount += 1;
        lastDocumenthandlerUrl = url;
        payload = { fileUrl: `${window.location.origin}/test/blocks/trustcenter-library-gate/mocks/sample.pdf`, isPdf: 'true', fileName: 'sample.pdf', fileType: 'pdf' };
      }
      return {
        json: async () => payload,
        status: 200,
        ok: true,
      };
    });
    const gateEl = document.querySelector('.trustcenter-library-gate');
    await init(gateEl);
    await wait(100); // let the initial async checkAccess() chain settle
  });

  it('should decorate the dom elements for the sibling page shape', () => {
    const domElements = {
      signedOutContainer: document.querySelector(`#${Config.ids.signedOutContainer}`),
      publicDomainContainer: document.querySelector(`#${Config.ids.publicDomainContainer}`),
      errorContainer: document.querySelector(`#${Config.ids.errorContainer}`),
      assetLink: document.querySelector(`div[${Config.ids.encryptedAssetLink}]`),
      ndaContainer: document.querySelector(`#${Config.ids.ndaContainer}`),
      documentContainer: document.querySelector(`#${Config.ids.documentContainer}`),
      signNdaButton: document.querySelector(`#${Config.ids.signNdaCta}`),
      ndaiFrameContainer: document.querySelector(`#${Config.ids.ndaiFrameContainer}`),
      ndaiFrame: document.querySelector(`#${Config.ids.ndaiFrame}`),
      loader: document.querySelector(`#${Config.ids.loader}`),
      nonPdfLinkEl: document.querySelector(`#${Config.ids.nonPdfLink}`),
    };
    let isValidDom = true;
    if (!Object.keys(domElements).every((de) => domElements[de] instanceof HTMLElement)) {
      isValidDom = false;
    }
    expect(isValidDom).to.be.true;
  });

  it('checkAccess with NDA_REQUIRED shows the sign-nda container, not the document container', () => {
    expect(document.querySelector(`#${Config.ids.ndaContainer}`).classList.contains('hidden')).to.be.false;
    expect(document.querySelector(`#${Config.ids.documentContainer}`).classList.contains('hidden')).to.be.true;
  });

  it('Sign NDA click should open the iframe, and ESIGN completion should reveal the document directly (no re-check of libraryaccess)', async () => {
    document.querySelector(`#${Config.ids.signNdaCta}`).click();
    await wait(100);
    const callsBeforeEsign = libraryaccessCallCount;
    const messageEvent = new MessageEvent('message', { data: { type: 'ESIGN' } });
    window.dispatchEvent(messageEvent);
    await wait(100);

    // the whole point of onNdaSigned(): trust the ESIGN signal directly, don't re-query
    // libraryaccess (NDADB may not have synced this signature yet)
    expect(libraryaccessCallCount).to.equal(callsBeforeEsign);
    expect(documenthandlerCallCount).to.equal(1);
    expect(document.querySelector(`#${Config.ids.documentContainer}`).classList.contains('hidden')).to.be.false;

    // documenthandler call after a fresh sign should be marked as a redesign call and hint
    // 'signed', so it tries the live Adobe Sign check first instead of entitlement/NDADB.
    expect(lastDocumenthandlerUrl.searchParams.get('redesign')).to.equal('true');
    expect(lastDocumenthandlerUrl.searchParams.get('reasonHint')).to.equal('signed');
  });

  it('Download click should set the correct file href', () => {
    expect(document.querySelector(`#${Config.ids.nonPdfLink}`).href).to.include('sample.pdf');
  });
});

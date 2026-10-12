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
    ndaContainer: 'trustcenter-nda-container',
    documentContainer: 'trustcenter-document-container',
    loader: 'loader',
  },
};

const { setLibs } = await import('../../../creativecloud/scripts/utils.js');
const { default: init, TrustCenterLibraryGate } = await import('../../../creativecloud/blocks/trustcenter-library-gate/trustcenter-library-gate.js');
sinon.stub(TrustCenterLibraryGate.prototype, 'waitForIms').resolves();

document.body.innerHTML = await readFile({ path: './mocks/trustcenter-library-gate-sibling.html' });

// This covers the exact bug the entitlement/NDADB documenthandler fix addresses: libraryaccess
// grants via entitlement/NDADB, but documenthandler's own independent checks (still) say no -
// the gate must fall back to the sign-nda container, not silently render a broken "ready" state.
describe('trustcenter library gate (sibling page - documenthandler signNDARequired fallback)', () => {
  const fetchStub = sinon.stub(window, 'fetch');
  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  before(async () => {
    setLibs('https://milo.adobe.com/libs');
    setConfig({ env: 'test' });
    fetchStub.callsFake((url) => {
      let payload = {};
      if (url.pathname.includes('libraryaccess')) {
        // granted via entitlement - the user has never personally signed this NDA template
        payload = { status: 'GRANTED', reason: 'entitlement' };
      } else if (url.pathname.includes('documenthandler')) {
        // documenthandler's own checks (still) say no
        payload = { error: 'Please sign an NDA', signNDARequired: true };
      }
      return {
        json: async () => payload,
        status: 200,
        ok: true,
      };
    });
    const gateEl = document.querySelector('.trustcenter-library-gate');
    await init(gateEl);
    await wait(100);
  });

  it('falls back to the sign-nda container instead of rendering a broken document-ready state', () => {
    expect(document.querySelector(`#${Config.ids.ndaContainer}`).classList.contains('hidden')).to.be.false;
    expect(document.querySelector(`#${Config.ids.documentContainer}`).classList.contains('hidden')).to.be.true;
    expect(document.querySelector(`#${Config.ids.loader}`).classList.contains('hidden')).to.be.true;
  });
});

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
    errorContainer: 'trustcenter-error-container',
    signNdaCta: 'sign-nda-cta',
    caasLink: 'data-caaslink',
    ndaiFrameContainer: 'nda-iframe-container',
    ndaiFrame: 'nda-iframe',
    loader: 'loader',
  },
};

const { setLibs } = await import('../../../creativecloud/scripts/utils.js');
const { default: init } = await import('../../../creativecloud/blocks/trustcenter-library-gate/trustcenter-library-gate.js');

document.body.innerHTML = await readFile({ path: './mocks/trustcenter-library-gate-library.html' });
describe('trustcenter library gate (library page shape)', () => {
  setTimeout(() => {
    window.alloy = () => {};
    window._satellite = { track: (x) => {} };
    window.alloy_all = { set: (x) => {} };
    window.digitalData = { _set: (x) => {} };
  }, 4000);

  const fetchStub = sinon.stub(window, 'fetch');

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  before(async () => {
    setLibs('https://milo.adobe.com/libs');
    setConfig({ env: 'test' });
    // fetch must be stubbed BEFORE init(): this gate checks access immediately during init,
    // so the stub has to be in place first or that initial check races an unstubbed fetch.
    fetchStub.callsFake((url) => {
      let payload = {};
      // deliberately never GRANTED here - this test only needs to verify the library-page
      // decoration shape and the shared sign flow; initCaasBlock()'s dynamic import of the
      // real caas.js (and its live chimera-api fetch) is out of scope for this unit test.
      if (url.pathname.includes('libraryaccess')) {
        payload = { status: 'NDA_REQUIRED' };
      } else if (url.pathname.includes('ndahandler')) {
        payload = { esignUrl: window.location, webAccessPoint: window.location, hasSigned: 'false' };
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

  it('should decorate the dom elements for the library page shape', () => {
    const domElements = {
      signedOutContainer: document.querySelector(`#${Config.ids.signedOutContainer}`),
      publicDomainContainer: document.querySelector(`#${Config.ids.publicDomainContainer}`),
      errorContainer: document.querySelector(`#${Config.ids.errorContainer}`),
      ndaContainer: document.querySelector(`#${Config.ids.ndaContainer}`),
      signNdaButton: document.querySelector(`#${Config.ids.signNdaCta}`),
      caasLinkEl: document.querySelector(`div[${Config.ids.caasLink}]`),
      ndaiFrameContainer: document.querySelector(`#${Config.ids.ndaiFrameContainer}`),
      ndaiFrame: document.querySelector(`#${Config.ids.ndaiFrame}`),
      loader: document.querySelector(`#${Config.ids.loader}`),
    };
    let isValidDom = true;
    if (!Object.keys(domElements).every((de) => domElements[de] instanceof HTMLElement)) {
      isValidDom = false;
    }
    expect(isValidDom).to.be.true;
  });

  it('preserves the real caas-link href instead of flattening it to plain text', () => {
    const caasLinkEl = document.querySelector(`div[${Config.ids.caasLink}]`);
    expect(caasLinkEl.dataset.caaslink).to.equal('https://milo.adobe.com/tools/caas#~~fakeEncodedConfig');
  });

  it('checkAccess with NDA_REQUIRED shows the sign-nda container', () => {
    expect(document.querySelector(`#${Config.ids.ndaContainer}`).classList.contains('hidden')).to.be.false;
  });

  it('Sign NDA click should open the iframe', () => {
    document.querySelector(`#${Config.ids.signNdaCta}`).click();
  });
});

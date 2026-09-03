/* eslint-disable consistent-return */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */

import { createTag, getLibs, getConfig } from '../../scripts/utils.js';
import { isEmptyObject, getCookieValue, setCookieValue } from '../../features/trustcenter/cookie-wrapper.js';
import analyticsWrapper from '../../features/trustcenter/analytics-wrapper.js';

// One block, two page shapes:
// - Library page: authored with a 'caas-link' row. When GRANTED access, the gate dynamically
//   inits the real CaaS block so the chimera-api fetch itself never fires pre-access.
// - Sibling (single document) page: authored with an 'nda-encrypted-link' row. When GRANTED acess,
//   gate calls documenthandler to serve that one file.
// Both shapes always require the following gate-state containers below; the sibling shape
// additionally requires the 'ready' (nda-document) state.

const targetMsgContent = {
  rawSignedOutMsg: 'trustcenter-signed-out',
  rawPublicDomainMsg: 'trustcenter-public-domain',
  rawSignMsg: 'trustcenter-nda-sign',
  rawErrorMsg: 'trustcenter-error',
  rawDownloadMsg: 'trustcenter-nda-document',
};

const Config = {
  ids: {
    signedOutContainer: 'trustcenter-signedout-container',
    publicDomainContainer: 'trustcenter-publicdomain-container',
    ndaContainer: 'trustcenter-nda-container',
    documentContainer: 'trustcenter-document-container',
    errorContainer: 'trustcenter-error-container',
    signInCta: 'signin-cta',
    signNdaCta: 'sign-nda-cta',
    caasLink: 'data-caaslink',
    encryptedAssetLink: 'data-encryptedassetlink',
    ndaiFrameContainer: 'nda-iframe-container',
    ndaiFrame: 'nda-iframe',
    loader: 'loader',
    nonPdfLink: 'non-pdf-link',
  },
  selectors: { hiddenItem: 'hidden' },
  constants: {
    adobeDomain: window.location.host.endsWith('.adobe.com') ? '.adobe.com' : '',
    hasSignedCookie: 'trustcenter_nda_signed',
  },
};
const LANA_OPTIONS = {
  tags: 'trustcenter-library-gate',
  errorType: 'i',
  severity: 'error',
};
const lanaLog = window.lana.log;
const unhandledError = (e) => lanaLog({
  message: 'Trust Center Library Gate - unhandled error',
  errorMessage: e ? e.reason || e.error || e.message : 'Error is not valid',
  sampleRate: 10,
  ...LANA_OPTIONS,
});
window.addEventListener('error', unhandledError);
window.addEventListener('unhandledrejection', unhandledError);

export class TrustCenterLibraryGate {
  constructor(el) {
    this.el = el;
    const { env } = getConfig();
    this.prodEndpoint = 'https://www.adobe.com/trustcenter/api/';
    this.stageEndpoint = 'https://www.stage.adobe.com/trustcenter/api/';
    const testApiUrl = env.name !== 'prod' ? new URLSearchParams(window.location.search).get('trustcenterApiUrl') : null;
    if (!this.apiUrl) this.apiUrl = testApiUrl || (env.name === 'prod' ? this.prodEndpoint : this.stageEndpoint);
    this.processMetaSettings();
    this.decorateContainers();
    this.initializeGate();
  }

  // the 'caas-link' row must keep its real <a> (href + text), not get flattened to
  // plain innerText like every other row, otherwise the CaaS config URL would be lost.
  processMetaSettings() {
    this.el.querySelectorAll(':scope > div').forEach((metaSetting) => {
      const key = metaSetting.querySelector('div').innerText.trim();
      const valueCell = metaSetting.querySelector('div:nth-child(2)');
      const anchor = key === 'caas-link' ? valueCell.querySelector('a') : null;

      const d = anchor
        ? createTag('div', { class: key, [Config.ids.caasLink]: anchor.href }, anchor.textContent.trim())
        : createTag('div', { class: key }, valueCell.innerText.trim());
      metaSetting.replaceWith(d);
    });
  }

  decorateMessageContainer(container, containerId, rawClass, ctaId) {
    container.classList.add(Config.selectors.hiddenItem);
    container.classList.remove(rawClass);
    container.id = containerId;
    const btnLink = container.querySelector('.con-button, strong a, em a, a strong, a em');
    if (btnLink && ctaId) {
      const cta = btnLink.nodeName === 'A' ? btnLink : btnLink.closest('a');
      cta.id = ctaId;
      cta.href = '#';
    }
  }

  decorateDocContainer(docContainer, contentWrapper) {
    docContainer.classList.add(Config.selectors.hiddenItem);
    docContainer.classList.remove(targetMsgContent.rawDownloadMsg);
    docContainer.id = Config.ids.documentContainer;
    const btnLink = docContainer.querySelector('.con-button, strong a, em a, a strong, a em');
    if (btnLink) {
      const downloadBtn = btnLink.nodeName === 'A' ? btnLink : btnLink.closest('a');
      downloadBtn.id = Config.ids.nonPdfLink;
      downloadBtn.href = '#';
    }
    const ndaEncryptedLink = this.el.querySelector('.nda-encrypted-link');
    if (ndaEncryptedLink) {
      const encryptedLink = createTag('div', { class: 'encrypted-link', id: 'encrypted-link' });
      encryptedLink.dataset.encryptedassetlink = ndaEncryptedLink.innerText.trim();
      contentWrapper.append(encryptedLink);
    }
  }

  addNdaIframe(contentWrapper) {
    const ndaIframe = createTag('iframe', {
      class: 'nda-iframe',
      id: `${Config.ids.ndaiFrame}`,
    });
    const ndaIframeContainer = createTag(
      'div',
      {
        class: 'nda-iframe-container hidden',
        id: `${Config.ids.ndaiFrameContainer}`,
      },
      ndaIframe,
    );
    contentWrapper.prepend(ndaIframeContainer);
  }

  decorateContainers() {
    const parentSection = this.el.closest('.section');
    this.parentSection = parentSection;
    parentSection.classList.add('trustcenter-container');
    const contentWrapper = createTag('div', { class: 'trustcenter-gate-content' });
    parentSection.append(contentWrapper);

    const signedOutContainer = document.querySelector(`.${targetMsgContent.rawSignedOutMsg}`);
    if (signedOutContainer) {
      this.decorateMessageContainer(signedOutContainer, Config.ids.signedOutContainer, targetMsgContent.rawSignedOutMsg, Config.ids.signInCta);
      contentWrapper.append(signedOutContainer);
    }

    const publicDomainContainer = document.querySelector(`.${targetMsgContent.rawPublicDomainMsg}`);
    if (publicDomainContainer) {
      this.decorateMessageContainer(publicDomainContainer, Config.ids.publicDomainContainer, targetMsgContent.rawPublicDomainMsg, Config.ids.signInCta);
      contentWrapper.append(publicDomainContainer);
    }

    const signContainer = document.querySelector(`.${targetMsgContent.rawSignMsg}`);
    if (signContainer) {
      this.decorateMessageContainer(signContainer, Config.ids.ndaContainer, targetMsgContent.rawSignMsg, Config.ids.signNdaCta);
      contentWrapper.append(signContainer);
    }

    const errorContainer = document.querySelector(`.${targetMsgContent.rawErrorMsg}`);
    if (errorContainer) {
      this.decorateMessageContainer(errorContainer, Config.ids.errorContainer, targetMsgContent.rawErrorMsg);
      contentWrapper.append(errorContainer);
    }

    const docContainer = document.querySelector(`.${targetMsgContent.rawDownloadMsg}`);
    if (docContainer) {
      this.decorateDocContainer(docContainer, contentWrapper);
      contentWrapper.append(docContainer);
    }

    this.addNdaIframe(contentWrapper);
    this.createTcProgressCircle(contentWrapper);
  }

  async waitForIms() {
    const miloLibs = getLibs();
    const { loadIms } = await import(`${miloLibs}/utils/utils.js`);
    await loadIms();
  }

  initializeGate() {
    this.mapDomElements();
    if (!this.areDomElementsValid()) return;

    this.showLoader();
    this.waitForIms()
      .then(() => {
        if (!this.isLibraryPage) {
          const metaEl = createTag('meta', { name: 'pdf-embed-mode', content: 'full-window' });
          document.head.append(metaEl);
        }
        this.hideNDAiFrameListener = this.hideNDAiFrameListener.bind(this);

        if (!window.adobeIMS.isSignedInUser()) {
          // Set by showPublicDomainContainer()'s sign-in CTA on the redirect_uri for direct signin later
          const url = new URL(window.location.href);
          if (url.searchParams.get('forceSignIn') === 'true') {
            url.searchParams.delete('forceSignIn');
            window.history.replaceState({}, '', url);
            window.adobeIMS.signIn();
            return;
          }
          this.showSignedOutContainer();
          return;
        }
        this.checkAccess();
      })
      .catch((err = {}) => {
        this.showErrorContainer({
          message: 'Trust Center Library Gate - IMS onReady issues',
          errorMessage: err.message,
        });
      });
  }

  areDomElementsValid() {
    const common = ['signedOutContainer', 'publicDomainContainer', 'ndaContainer', 'errorContainer', 'ndaiFrameContainer', 'ndaiFrame', 'loader'];
    if (!common.every((de) => this.domElements[de] instanceof HTMLElement)) return false;

    const isLibraryPage = this.domElements.caasLinkEl instanceof HTMLElement;
    const isSiblingPage = this.domElements.documentContainer instanceof HTMLElement
      && this.domElements.assetLink instanceof HTMLElement
      && this.domElements.nonPdfLinkEl instanceof HTMLElement;

    if (isLibraryPage === isSiblingPage) {
      // misconfigured page
      return false;
    }
    this.isLibraryPage = isLibraryPage;
    return true;
  }

  mapDomElements() {
    const signedOutContainer = document.querySelector(`#${Config.ids.signedOutContainer}`);
    this.domElements = {
      signedOutContainer,
      publicDomainContainer: document.querySelector(`#${Config.ids.publicDomainContainer}`),
      ndaContainer: document.querySelector(`#${Config.ids.ndaContainer}`),
      errorContainer: document.querySelector(`#${Config.ids.errorContainer}`),
      documentContainer: document.querySelector(`#${Config.ids.documentContainer}`),
      signInButton: signedOutContainer?.querySelector(`#${Config.ids.signInCta}`),
      signNdaButton: document.querySelector(`#${Config.ids.signNdaCta}`),
      caasLinkEl: document.querySelector(`div[${Config.ids.caasLink}]`),
      assetLink: document.querySelector(`div[${Config.ids.encryptedAssetLink}]`),
      ndaiFrameContainer: document.querySelector(`#${Config.ids.ndaiFrameContainer}`),
      ndaiFrame: document.querySelector(`#${Config.ids.ndaiFrame}`),
      loader: document.querySelector(`#${Config.ids.loader}`),
      nonPdfLinkEl: document.querySelector(`#${Config.ids.nonPdfLink}`),
    };
  }

  track({ data, cta } = {}) {
    if (!analyticsWrapper || !analyticsWrapper.onReady) {
      lanaLog({
        message: 'Trust Center Library Gate - track',
        errorMessage: 'analyticsWrapper is not defined',
        sampleRate: 10,
      });
      return;
    }
    analyticsWrapper.onReady()
      .then(() => {
        // eslint-disable-next-line no-underscore-dangle
        this.pageName = window.alloy_all?.data?._adobe_corpnew?.digitalData.page.pageInfo.pageName;
        // eslint-disable-next-line no-underscore-dangle
        if (!this.pageName || !window._satellite || typeof window._satellite.track !== 'function') return;
        const trackData = `${this.pageName}:${data}`;
        if (cta) { analyticsWrapper.set({ path: 'primaryEvent.eventInfo.eventName', data: trackData }); }
        analyticsWrapper.set({ path: 'page.pageInfo.customPageName', data: trackData });
        // eslint-disable-next-line no-underscore-dangle
        window._satellite.track('event');
      })
      .catch(() => {});
  }

  showContainer(containerEl) {
    const hiddenClass = Config.selectors.hiddenItem;
    [
      this.domElements.signedOutContainer,
      this.domElements.publicDomainContainer,
      this.domElements.ndaContainer,
      this.domElements.errorContainer,
      this.domElements.documentContainer,
      this.domElements.ndaiFrameContainer,
      this.domElements.loader,
    ].forEach((el) => el?.classList.add(hiddenClass));
    containerEl.classList.remove(hiddenClass);
  }

  showErrorContainer({ message, errorMessage } = {}) {
    lanaLog({ message, errorMessage, sampleRate: 10, ...LANA_OPTIONS });
    this.hideLoader();
    this.showContainer(this.domElements.errorContainer);
  }

  showSignedOutContainer() {
    if (!this.signInBtnHasEventListener) {
      this.signInBtnHasEventListener = true;
      this.domElements.signInButton?.addEventListener('click', () => {
        this.track({ data: 'sign in', cta: true });
        window.adobeIMS.signIn();
      });
    }
    this.showContainer(this.domElements.signedOutContainer);
  }

  showPublicDomainContainer() {
    if (!this.publicDomainBtnHasEventListener) {
      this.publicDomainBtnHasEventListener = true;
      this.domElements.publicDomainContainer.querySelector(`#${Config.ids.signInCta}`)?.addEventListener('click', () => {
        this.track({ data: 'sign in:public domain', cta: true });
        this.removeHasSignedNdaCookie();
        const url = new URL(window.location.href);
        url.searchParams.set('forceSignIn', 'true');
        window.adobeIMS.signOut({ redirect_uri: url.toString() });
      });
    }
    this.showContainer(this.domElements.publicDomainContainer);
  }

  showNdaContainer() {
    this.isSigning = false;
    if (!this.ndaBtnHasEventListener) {
      this.ndaBtnHasEventListener = true;
      this.domElements.signNdaButton?.addEventListener('click', () => {
        if (!this.isSigning) {
          this.isSigning = true;
          this.signNDA();
        }
      });
    }
    this.showContainer(this.domElements.ndaContainer);
  }

  showLoader() {
    this.domElements.nonPdfLinkEl?.classList.add(Config.selectors.hiddenItem);
    this.domElements.loader.classList.remove(Config.selectors.hiddenItem);
  }

  hideLoader() {
    this.domElements.nonPdfLinkEl?.classList.remove(Config.selectors.hiddenItem);
    this.domElements.loader.classList.add(Config.selectors.hiddenItem);
  }

  async ioServiceRequest({ method, queryParams } = {}) {
    const accessToken = window.adobeIMS.getAccessToken()?.token;
    if (!accessToken) {
      const err = new Error('accessToken or userId could not be retrieved');
      this.showErrorContainer({ message: 'Trust Center Library Gate - IORequest error.', errorMessage: err.message });
      return Promise.reject(err);
    }
    const requestOptions = {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    };
    const url = new URL(`${this.apiUrl}${method}`);
    Object.entries(queryParams || {}).forEach(([key, value]) => url.searchParams.append(key, value));
    try {
      const response = await fetch(url, requestOptions);
      if (response.status === 200 || response.status === 403) {
        return await response.json();
      }
      throw new Error(`IORequest unsuccessful, API error. Response status ${response.status}. URL: ${url.href}`);
    } catch (err) {
      this.showErrorContainer({ message: 'Trust Center Library Gate - IORequest failed.', errorMessage: err.message });
      throw err;
    }
  }

  // The actual gate decision. Always re-checked against the server - the cookie only ever
  // hints which check to try first, it never substitutes for the real server-side check.
  getReasonHintFromCookie() {
    const cookieValue = getCookieValue(Config.constants.hasSignedCookie);
    if (!cookieValue) return undefined;
    // legacy trustcenter-metadata.js only ever wrote the literal string 'true', for a real
    // esign completion - the closest equivalent of today's 'signed' reason.
    return cookieValue === 'true' ? 'signed' : cookieValue;
  }

  async checkAccess() {
    this.showLoader();
    try {
      const reasonHint = this.getReasonHintFromCookie();
      const queryParams = reasonHint ? { reasonHint } : {};
      const { status, reason } = await this.ioServiceRequest({ method: 'libraryaccess', queryParams });
      if (status === 'PUBLIC_DOMAIN_EMAIL') {
        this.hideLoader();
        this.showPublicDomainContainer();
        return;
      }
      if (status === 'GRANTED') {
        this.setHasSignedNdaCookie(reason);
        await this.onGranted(reason);
        return;
      }
      this.hideLoader();
      this.removeHasSignedNdaCookie();
      this.showNdaContainer();
    } catch (err) {
      const message = 'Trust Center Library Gate - Could not check library access';
      lanaLog({ message, errorMessage: err.message, sampleRate: 10, ...LANA_OPTIONS });
    }
  }

  async onGranted(reasonHint) {
    if (this.isLibraryPage) {
      this.track({ data: `library granted:${reasonHint}` });
      this.revealGrantedContent();
      await this.initCaasBlock();
      this.hideLoader();
      return;
    }
    await this.decryptDocument(reasonHint);
  }

  revealGrantedContent() {
    const hiddenClass = Config.selectors.hiddenItem;
    [
      this.domElements.signedOutContainer,
      this.domElements.publicDomainContainer,
      this.domElements.ndaContainer,
      this.domElements.errorContainer,
      this.domElements.documentContainer,
      this.domElements.ndaiFrameContainer,
    ].forEach((el) => el?.classList.add(hiddenClass));
    document.querySelectorAll('.trustcenter-granted')
      .forEach((el) => el.classList.remove('trustcenter-granted'));
  }

  // Doesn't re-call /libraryaccess - NDADB sync lag could otherwise bounce a legitimate signer.
  async onNdaSigned() {
    this.setHasSignedNdaCookie('signed');
    await this.onGranted('signed');
  }

  hideNDAiFrameListener(e) {
    if (!e.target.closest(`#${Config.ids.ndaiFrame}`)) {
      this.showNdaContainer();
      document.removeEventListener('click', this.hideNDAiFrameListener);
    }
  }

  setHasSignedNdaCookie(reason) {
    let initCookieSetting = false;
    const setCookie = () => {
      if (initCookieSetting) return;
      initCookieSetting = true;
      if (window.adobePrivacy.activeCookieGroups().indexOf('C0003') !== -1) {
        const expiration = new Date();
        expiration.setMonth(expiration.getMonth() + 1);
        setCookieValue(Config.constants.hasSignedCookie, reason, {
          expiration,
          domain: Config.constants.adobeDomain,
          path: '/',
        });
      }
    };
    if (!isEmptyObject(window.adobePrivacy)) {
      setCookie();
    } else {
      ['adobePrivacy:PrivacyConsent', 'adobePrivacy:PrivacyCustom'].forEach((event) => {
        window.addEventListener(event, setCookie);
      });
    }
  }

  removeHasSignedNdaCookie() {
    setCookieValue(Config.constants.hasSignedCookie, '', {
      expiration: new Date(0),
      domain: Config.constants.adobeDomain,
      path: '/',
    });
  }

  async signNDA() {
    this.track({ data: 'sign now', cta: true });
    this.showLoader();
    try {
      const { esignUrl, webAccessPoint, hasSigned } = await this.ioServiceRequest({ method: 'ndahandler' });
      this.hideLoader();
      if (hasSigned) { await this.onNdaSigned(); return; }
      this.openNDAiFrame({ esignUrl, webAccessPoint });
    } catch (err) {
      this.showErrorContainer({ message: 'Trust Center Library Gate - signNDA failed.', errorMessage: err.message });
    }
  }

  openNDAiFrame({ esignUrl, webAccessPoint }) {
    if (!esignUrl || !webAccessPoint) {
      const message = 'Trust Center Library Gate - openNDAiFrame could not open the NDA iFrame';
      this.showErrorContainer({ message });
      return;
    }
    this.domElements.ndaiFrame.src = esignUrl;
    this.showContainer(this.domElements.ndaiFrameContainer);
    document.addEventListener('click', this.hideNDAiFrameListener);
    const handleSign = (e) => {
      const isTrustedOrigin = /^https:\/\/[\w.-]+\.(?:adobesign|echosign|documents\.adobe)\.com$/.test(e.origin) || e.origin === webAccessPoint;
      if (isTrustedOrigin && e.data) {
        let data;
        try {
          data = JSON.parse(e.data);
        } catch (err) { /* Could not parse sign data */ }
        if (data && data.type === 'ESIGN') {
          document.removeEventListener('click', this.hideNDAiFrameListener);
          this.onNdaSigned();
        }
      }
    };
    if (!this.hasHandleSignEventListener) {
      this.hasHandleSignEventListener = true;
      window.addEventListener('message', handleSign, false);
    }
  }

  async initCaasBlock() {
    const { caaslink: caasLink } = this.domElements.caasLinkEl.dataset;
    const linkText = this.domElements.caasLinkEl.textContent.trim();
    const anchor = createTag('a', { href: caasLink }, linkText);
    // Wrapped in a <p> to match the DOM shape CaaS normally gets authored into
    const p = createTag('p', {}, anchor);
    this.parentSection.append(p);
    this.domElements.caasLinkEl.remove();

    const miloLibs = getLibs();
    const { default: initCaas } = await import(`${miloLibs}/blocks/caas/caas.js`);
    await initCaas(anchor);
  }

  async decryptDocument(reasonHint) {
    this.showLoader();
    const encryptedAssetLink = this.base64UrlSafe(this.domElements.assetLink.dataset.encryptedassetlink);
    if (!encryptedAssetLink) {
      this.showErrorContainer({
        message: 'Trust Center Library Gate - decryptDocument failed.',
        errorMessage: `encryptedAssetLink is empty. base64UrlSafe: ${encryptedAssetLink}`
            + ` | encryptedAssetLink: ${this.domElements.assetLink.dataset.encryptedassetlink}`,
      });
      return;
    }
    try {
      const queryParams = { code: encryptedAssetLink, redesign: 'true' };
      if (reasonHint) queryParams.reasonHint = reasonHint;
      const result = await this.ioServiceRequest({ method: 'documenthandler', queryParams });
      if (result.signNDARequired) {
        this.hideLoader();
        this.removeHasSignedNdaCookie();
        this.showNdaContainer();
        return;
      }
      const { fileUrl, isPdf, fileName, fileType } = result;
      this.hideLoader();
      this.track({ data: `asset ready:${fileType}:${fileName}` });
      this.showContainer(this.domElements.documentContainer);
      this.displayFileUrl(fileUrl);
      if (isPdf) await this.openPdf(fileUrl);
    } catch (err) {
      const message = 'Trust Center Library Gate - Could not decrypt trust center link';
      lanaLog({ message, errorMessage: err.message, sampleRate: 10, ...LANA_OPTIONS });
    }
  }

  async openPdf(fileUrl) {
    const anchorTag = createTag('a', { class: 'hidden', href: fileUrl }, fileUrl);
    const anchorContainer = createTag('div', { class: 'view-sdk-container' }, anchorTag);
    this.domElements.documentContainer.insertAdjacentElement('afterend', anchorContainer);
    const miloLibs = getLibs();
    const { default: initPdfViewer } = await import(`${miloLibs}/blocks/pdf-viewer/pdf-viewer.js`);
    await initPdfViewer(anchorTag);
  }

  displayFileUrl(fileUrl) {
    this.domElements.nonPdfLinkEl.href = fileUrl;
    this.domElements.nonPdfLinkEl.classList.remove(Config.selectors.hiddenItem);
  }

  createTcProgressCircle(contentWrapper) {
    const pcircleDom = `
      <div class="progress-circle">
        <div class="progress-circle-track"></div>
        <div class="progress-circle-fills">
            <div class="progress-circle-fill-mask1">
                <div class="progress-circle-fill-submask1">
                    <div class="progress-circle-fill"></div>
                </div>
            </div>
            <div class="progress-circle-fill-mask2">
                <div class="progress-circle-fill-submask2">
                    <div class="progress-circle-fill"></div>
                </div>
            </div>
        </div>
      </div>
    `;
    const progressLoader = createTag(
      'div',
      { class: 'loader hidden', id: `${Config.ids.loader}` },
      pcircleDom,
    );
    contentWrapper.append(progressLoader);
  }

  base64UrlSafe(encoded = '') {
    return encoded.replace(/\+/g, '-').replace(/\//g, '_');
  }
}

function isContentAvailable(targetSection) {
  const hasCommonStates = targetSection.querySelector(`.${targetMsgContent.rawSignedOutMsg}`)
    && targetSection.querySelector(`.${targetMsgContent.rawPublicDomainMsg}`)
    && targetSection.querySelector(`.${targetMsgContent.rawSignMsg}`)
    && targetSection.querySelector(`.${targetMsgContent.rawErrorMsg}`);
  return !!hasCommonStates;
}

function checkRenderStatus(targetSection, res, rej, etime, rtime) {
  if (etime > 20000) {
    rej();
  } else if (isContentAvailable(targetSection)) {
    res();
  } else {
    setTimeout(() => checkRenderStatus(targetSection, res, rej, etime + rtime), rtime);
  }
}

function trucsiContainersRendered(targetSection) {
  return new Promise((res, rej) => {
    try {
      checkRenderStatus(targetSection, res, rej, 0, 100);
    } catch (err) { rej(); }
  });
}

export default function init(el) {
  const targetSection = el.closest('.section');
  if (isContentAvailable(targetSection)) {
    // eslint-disable-next-line no-unused-vars
    const tc = new TrustCenterLibraryGate(el);
  } else {
    trucsiContainersRendered(targetSection)
      .then(() => {
        // eslint-disable-next-line no-unused-vars
        const tc = new TrustCenterLibraryGate(el);
      });
  }
}

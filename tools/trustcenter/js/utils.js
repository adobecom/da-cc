/* Bridge: da-cc previews may not serve /creativecloud/; load from main--cc .aem.live (public code; .aem.page can 401). */
// eslint-disable-next-line import/no-unresolved, import/no-absolute-path
import { getLibs } from 'https://main--cc--adobecom.aem.live/creativecloud/scripts/utils.js';

const PROTECT_URL_SUBMIT = document.querySelector('#generate-protected-link');
const PROTECTED_URL_ELEMENT = document.querySelector('#protected-url');
const DECRYPT_URL_SUBMIT = document.querySelector('#decrypt-link');
const DECRYPTED_URL_ELEMENT = document.querySelector('#decrypted-url');

const ADOBE_EMPLOYEE_DOMAIN = '@adobe.com';
const ERR_SIGN_IN = 'SIGN_IN_REQUIRED';
const ERR_NOT_ADOBE = 'NOT_ADOBE_EMPLOYEE';

async function createProgressCircle(formComponents) {
  if (!formComponents || formComponents.querySelector('.progress-holder')) return;
  const { createTag } = await import(`${getLibs()}/utils/utils.js`);
  const pdom = `<div class="spectrum-ProgressCircle-track"></div><div class="spectrum-ProgressCircle-fills">
    <div class="spectrum-ProgressCircle-fillMask1">
      <div class="spectrum-ProgressCircle-fillSubMask1">
        <div class="spectrum-ProgressCircle-fill"></div>
      </div>
    </div>
    <div class="spectrum-ProgressCircle-fillMask2">
      <div class="spectrum-ProgressCircle-fillSubMask2">
        <div class="spectrum-ProgressCircle-fill"></div>
      </div>
    </div>
  </div>`;
  const prgc = createTag('div', { class: 'spectrum-ProgressCircle spectrum-ProgressCircle--indeterminate' }, pdom);
  const layer = createTag('div', { class: 'progress-holder' }, prgc);
  const formItem = createTag('div', { class: 'form-item progress-item' }, layer);
  formComponents.append(formItem);
}

function showProgressCircle(formComponents) {
  const progressItem = formComponents?.querySelector('.form-item.progress-item');
  if (progressItem) progressItem.classList.add('loading');
}

function hideProgressCircle(formComponents) {
  const progressItem = formComponents?.querySelector('.form-item.progress-item');
  if (progressItem) progressItem.classList.remove('loading');
}

function isNonProd() {
  const search = new URLSearchParams(window.location.search);
  const nonprod = search.get('nonprod');
  return !!nonprod;
}

// eslint-disable-next-line consistent-return
function getEncryptionEndpoint() {
  if (isNonProd() && window.location.host === 'decrypt-url--da-cc--adobecom.aem.page') {
    return 'https://14257-trucsi-dev.adobeioruntime.net/api/v1/web/trust-center-sign-integration/encrypturl';
  }
  const ENCRYPT_STAGE_ENDPOINT = 'https://www.stage.adobe.com/trustcenter/api/encrypturl';
  const ENCRYPT_PROD_ENDPOINT = 'https://www.adobe.com/trustcenter/api/encrypturl';

  const allowedStageHosts = [
    'decrypt-url--da-cc--adobecom.aem.page',
    'encrypt-url--da-cc--adobecom.aem.page',
    'dev--cc--adobecom.aem.page',
    'main--cc--adobecom.aem.page',
    'stage--cc--adobecom.aem.page',
    'main--cc--adobecom.hlx.page',
    'stage--cc--adobecom.hlx.page',
    'stage.adobe.com',
  ];

  const allowedProdHosts = [
    'decrypt-url--da-cc--adobecom.aem.live',
    'encrypt-url--da-cc--adobecom.aem.live',
    'dev--cc--adobecom.aem.live',
    'main--cc--adobecom.aem.live',
    'stage--cc--adobecom.aem.live',
    'main--cc--adobecom.hlx.live',
    'stage--cc--adobecom.hlx.live',
    'dev--cc--adobecom.hlx.live',
    'adobe.com',
  ];

  if (!isNonProd() && allowedProdHosts.includes(window.location.host)) return ENCRYPT_PROD_ENDPOINT;
  if (isNonProd() && allowedProdHosts.includes(window.location.host)) return ENCRYPT_STAGE_ENDPOINT;
  if (allowedStageHosts.includes(window.location.host)) return ENCRYPT_STAGE_ENDPOINT;
}
// eslint-disable-next-line consistent-return
function getDecryptionEndpoint() {
  if (isNonProd() && window.location.host === 'decrypt-url--da-cc--adobecom.aem.page') {
    return 'https://14257-trucsi-dev.adobeioruntime.net/api/v1/web/trust-center-sign-integration/decrypturl';
  }
  const DECRYPT_STAGE_ENDPOINT = 'https://www.stage.adobe.com/trustcenter/api/decrypturl';
  const DECRYPT_PROD_ENDPOINT = 'https://www.adobe.com/trustcenter/api/decrypturl';

  const allowedStageHosts = [
    'decrypt-url--da-cc--adobecom.aem.page',
    'encrypt-url--da-cc--adobecom.aem.page',
    'dev--cc--adobecom.aem.page',
    'main--cc--adobecom.aem.page',
    'stage--cc--adobecom.aem.page',
    'main--cc--adobecom.hlx.page',
    'stage--cc--adobecom.hlx.page',
    'stage.adobe.com',
  ];

  const allowedProdHosts = [
    'decrypt-url--da-cc--adobecom.aem.live',
    'encrypt-url--da-cc--adobecom.aem.live',
    'dev--cc--adobecom.aem.live',
    'main--cc--adobecom.aem.live',
    'stage--cc--adobecom.aem.live',
    'main--cc--adobecom.hlx.live',
    'stage--cc--adobecom.hlx.live',
    'dev--cc--adobecom.hlx.live',
    'adobe.com',
  ];

  if (!isNonProd() && allowedProdHosts.includes(window.location.host)) return DECRYPT_PROD_ENDPOINT;
  if (isNonProd() && allowedProdHosts.includes(window.location.host)) return DECRYPT_STAGE_ENDPOINT;
  if (allowedStageHosts.includes(window.location.host)) return DECRYPT_STAGE_ENDPOINT;
}

function base64UrlSafe(encoded = '') {
  return encoded.replace(/\+/g, '-').replace(/\//g, '_');
}

async function ensureImsLoaded() {
   if (window.adobeIMS) return;
   const { loadIms } = await import(`${getLibs()}/utils/utils.js`);
   await loadIms();
}

// /**
//  * IMS + @adobe.com gate for decrypt only. Server enforces the same; this avoids pointless calls when profile exposes email.
//  * @returns {Promise<string>} Bearer token value (no "Bearer " prefix)
//  */
async function getDecryptBearerToken() {
  await ensureImsLoaded();
  if (!window.adobeIMS?.isSignedInUser()) {
    window.adobeIMS?.signIn();
    throw new Error(ERR_SIGN_IN);
  }
  const token = window.adobeIMS.getAccessToken()?.token;
  if (!token) {
    throw new Error(ERR_SIGN_IN);
  }
  return token;
}

function decryptAccessMessage(code) {
  if (code === ERR_SIGN_IN) {
    return 'Please sign in with your Adobe account to use decryption.';
  }
  if (code === ERR_NOT_ADOBE) {
    return 'Access denied. Decryption is restricted to signed-in Adobe employees (@adobe.com).';
  }
  return 'Could not decrypt the provided url. Please check the input and try again.';
}

async function getEncryptedText(linkUrl) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plainText: linkUrl }),
  };
  const response = await fetch(getEncryptionEndpoint(), options);
  const responseJson = await response.json();
  return responseJson.encryptedCode;
}

async function getDecryptedUrl(encryptedText) {
  const token = await getDecryptBearerToken();
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ encryptedText: base64UrlSafe(encryptedText) }),
  };
  const response = await fetch(getDecryptionEndpoint(), options);
  if (response.status === 403) {
    throw new Error(ERR_NOT_ADOBE);
  }
  if (response.status === 401) {
    throw new Error(ERR_SIGN_IN);
  }
  if (!response.ok) {
    throw new Error('DECRYPT_FAILED');
  }
  const responseJson = await response.json();
  return responseJson.decryptedUrl;
}

function onSubmitButtonAdded(node) {
  node.addEventListener('click', async (e) => {
    const formComponents = node.closest('.form-components');
    try {
      e.preventDefault();
      await createProgressCircle(formComponents);
      showProgressCircle(formComponents);
      const linkUrl = document.querySelector('#plaintexturl').value.trim();
      if (!linkUrl) throw new Error('Cannot have empty url');
      const allowedHosts = ['www.adobe.com'];
      const urlHost = new URL(linkUrl).host;
      if (!isNonProd() && !allowedHosts.includes(urlHost)) {
        PROTECTED_URL_ELEMENT.value = 'Please enter a www.adobe.com asset url';
        throw new Error('Please enter a www.adobe.com asset url');
      }
      PROTECTED_URL_ELEMENT.value = await getEncryptedText(linkUrl);
      hideProgressCircle(formComponents);
    } catch (err) {
      PROTECTED_URL_ELEMENT.value = 'Please enter a valid www.adobe.com asset url';
      hideProgressCircle(formComponents);
      throw err;
    }
  });
}

function onDecryptButtonAdded(node) {
  node.addEventListener('click', async (e) => {
    const formComponents = node.closest('.form-components');
    try {
      e.preventDefault();
      await createProgressCircle(formComponents);
      showProgressCircle(formComponents);
      const encryptedText = document.querySelector('#encryptedurl').value.trim();
      if (!encryptedText) throw new Error('Cannot have empty encrypted url');
      DECRYPTED_URL_ELEMENT.value = await getDecryptedUrl(encryptedText);
      hideProgressCircle(formComponents);
    } catch (err) {
      DECRYPTED_URL_ELEMENT.value = decryptAccessMessage(err.message);
      hideProgressCircle(formComponents);
      throw err;
    }
  });
}

function initTabs() {
  const tabs = document.querySelectorAll('.tc-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    });
  });
}

(async function startObserving() {
  if (PROTECT_URL_SUBMIT) onSubmitButtonAdded(PROTECT_URL_SUBMIT);
  if (DECRYPT_URL_SUBMIT) onDecryptButtonAdded(DECRYPT_URL_SUBMIT);
  initTabs();
}());

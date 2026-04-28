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
  if (window.adobeIMS?.isSignedInUser) return;
  const { loadIms } = await import(`${getLibs()}/utils/utils.js`);
  await loadIms();
  for (let i = 0; i < 50 && typeof window.adobeIMS?.isSignedInUser !== 'function'; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => { setTimeout(r, 100); });
  }
}

// /**
//  * IMS + @adobe.com gate for decrypt only. Server enforces the same; this avoids pointless calls when profile exposes email.
//  * @returns {Promise<string>} Bearer token value (no "Bearer " prefix)
//  */
async function getDecryptBearerToken() {
  try {
    await ensureImsLoaded();
    const ims = window.adobeIMS;
    if (typeof ims?.isSignedInUser !== 'function' || !ims.isSignedInUser()) {
      try { sessionStorage.setItem('trustcenter:returnTo', window.location.href); } catch (_) { /* ignore */ }
      ims?.signIn?.({ redirect_uri: window.location.href });
      throw new Error(ERR_SIGN_IN);
    }
    const token = ims.getAccessToken()?.token;
    if (!token) {
      try { sessionStorage.setItem('trustcenter:returnTo', window.location.href); } catch (_) { /* ignore */ }
      ims.signIn?.({ redirect_uri: window.location.href });
      throw new Error(ERR_SIGN_IN);
    }
    return token;
  } catch (err) {
    if (err.message === ERR_SIGN_IN || err.message === ERR_NOT_ADOBE) throw err;
    throw new Error(ERR_SIGN_IN);
  }
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

const COPY_ICON = '<svg viewBox="0 0 36 36" focusable="false" aria-hidden="true"><path d="M27 6h-1V3a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h2v3a2 2 0 0 0 2 2h17a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM8 25V3h16v3H12a2 2 0 0 0-2 2v17H8zm21 8H12V8h17v25z"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 36 36" focusable="false" aria-hidden="true"><path d="M13.5 27.4 4.1 18l2.83-2.83L13.5 21.74 29.07 6.17 31.9 9z"/></svg>';

function setOutput(element, value, { isError = false } = {}) {
  element.value = value;
  element.classList.toggle('has-error', isError);
  const copyBtn = document.querySelector(`.tc-copy-btn[data-copy-target="${element.id}"]`);
  if (copyBtn) {
    copyBtn.hidden = isError || !value;
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.setAttribute('aria-label', `Copy ${element.id === 'protected-url' ? 'encrypted' : 'decrypted'} URL`);
  }
}

function initCopyButtons() {
  document.querySelectorAll('.tc-copy-btn').forEach((btn) => {
    btn.hidden = true;
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target?.value) return;
      try {
        await navigator.clipboard.writeText(target.value);
      } catch (_) {
        target.select();
        document.execCommand('copy');
      }
      btn.classList.add('copied');
      btn.innerHTML = CHECK_ICON;
      btn.setAttribute('aria-label', 'Copied');
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = COPY_ICON;
        btn.setAttribute('aria-label', `Copy ${target.id === 'protected-url' ? 'encrypted' : 'decrypted'} URL`);
      }, 1500);
    });
  });
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
        setOutput(PROTECTED_URL_ELEMENT, 'Please enter a www.adobe.com asset url', { isError: true });
        throw new Error('Please enter a www.adobe.com asset url');
      }
      setOutput(PROTECTED_URL_ELEMENT, await getEncryptedText(linkUrl));
      hideProgressCircle(formComponents);
    } catch (err) {
      setOutput(PROTECTED_URL_ELEMENT, 'Please enter a valid www.adobe.com asset url', { isError: true });
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
      setOutput(DECRYPTED_URL_ELEMENT, await getDecryptedUrl(encryptedText));
      hideProgressCircle(formComponents);
    } catch (err) {
      setOutput(DECRYPTED_URL_ELEMENT, decryptAccessMessage(err.message), { isError: true });
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
  initCopyButtons();
}());

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
    return 'Sign in with your Adobe account to use decryption.';
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

const COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" focusable="false" aria-hidden="true"><rect height="1" rx="0.25" width="1" x="16" y="11" class="fill"/><rect height="1" rx="0.25" width="1" x="16" y="9" class="fill"/><rect height="1" rx="0.25" width="1" x="16" y="7" class="fill"/><rect height="1" rx="0.25" width="1" x="16" y="5" class="fill"/><rect height="1" rx="0.25" width="1" x="16" y="3" class="fill"/><rect height="1" rx="0.25" width="1" x="16" y="1" class="fill"/><rect height="1" rx="0.25" width="1" x="14" y="1" class="fill"/><rect height="1" rx="0.25" width="1" x="12" y="1" class="fill"/><rect height="1" rx="0.25" width="1" x="10" y="1" class="fill"/><rect height="1" rx="0.25" width="1" x="8" y="1" class="fill"/><rect height="1" rx="0.25" width="1" x="6" y="1" class="fill"/><rect height="1" rx="0.25" width="1" x="6" y="3" class="fill"/><rect height="1" rx="0.25" width="1" x="6" y="5" class="fill"/><rect height="1" rx="0.25" width="1" x="6" y="7" class="fill"/><rect height="1" rx="0.25" width="1" x="6" y="9" class="fill"/><rect height="1" rx="0.25" width="1" x="6" y="11" class="fill"/><rect height="1" rx="0.25" width="1" x="8" y="11" class="fill"/><rect height="1" rx="0.25" width="1" x="10" y="11" class="fill"/><rect height="1" rx="0.25" width="1" x="12" y="11" class="fill"/><rect height="1" rx="0.25" width="1" x="14" y="11" class="fill"/><path d="M5,6H1.5a.5.5,0,0,0-.5.5v10a.5.5,0,0,0,.5.5h10a.5.5,0,0,0,.5-.5V13H5.5a.5.5,0,0,1-.5-.5Z" class="fill"/></svg>';
const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" focusable="false" aria-hidden="true"><path class="fill" d="M15.656,3.8625l-.1815-.1875a.75.75,0,0,0-1.0605,0L6.7275,11.55,3.4915,8.31a.75.75,0,0,0-1.0605,0l-.1845.1875a.75.75,0,0,0,0,1.0605l3.952,3.9555a.75.75,0,0,0,1.0605,0l8.3925-8.391A.75.75,0,0,0,15.656,3.8625Z"/></svg>';

function setOutput(element, value, { isError = false } = {}) {
  element.value = value;
  element.classList.toggle('has-error', isError);
  const copyBtn = document.querySelector(`.tc-copy-btn[data-copy-target="${element.id}"]`);
  if (copyBtn) {
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.setAttribute('aria-label', `Copy ${element.id === 'protected-url' ? 'encrypted' : 'decrypted'} URL`);
  }
}

function initCopyButtons() {
  document.querySelectorAll('.tc-copy-btn').forEach((btn) => {
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

function getDecryptOutputContainer() {
  return DECRYPTED_URL_ELEMENT?.closest('.tc-output');
}

function hideDecryptSignInMessage() {
  const overlay = getDecryptOutputContainer()?.querySelector('.tc-signin-msg');
  if (overlay) overlay.hidden = true;
}

function showDecryptSignInMessage() {
  const container = getDecryptOutputContainer();
  if (!container) return;
  let overlay = container.querySelector('.tc-signin-msg');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'tc-signin-msg';
    const inner = document.createElement('span');
    inner.className = 'tc-signin-msg-inner';
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'tc-signin-link';
    link.textContent = 'Sign in';
    link.addEventListener('click', async () => {
      try { sessionStorage.setItem('trustcenter:returnTo', window.location.href); } catch (_) { /* ignore */ }
      await ensureImsLoaded();
      window.adobeIMS?.signIn?.({ redirect_uri: window.location.href });
    });
    inner.appendChild(link);
    inner.appendChild(document.createTextNode(' '));
    const rest = document.createElement('span');
    rest.className = 'tc-signin-msg-rest';
    rest.textContent = 'with your Adobe account to use decryption.';
    inner.appendChild(rest);
    overlay.appendChild(inner);
    container.appendChild(overlay);
  }
  overlay.hidden = false;
}

function onDecryptButtonAdded(node) {
  node.addEventListener('click', async (e) => {
    const formComponents = node.closest('.form-components');
    try {
      e.preventDefault();
      hideDecryptSignInMessage();
      await createProgressCircle(formComponents);
      showProgressCircle(formComponents);
      const encryptedText = document.querySelector('#encryptedurl').value.trim();
      if (!encryptedText) throw new Error('Cannot have empty encrypted url');
      setOutput(DECRYPTED_URL_ELEMENT, await getDecryptedUrl(encryptedText));
      hideProgressCircle(formComponents);
    } catch (err) {
      if (err.message === ERR_SIGN_IN) {
        setOutput(DECRYPTED_URL_ELEMENT, '', { isError: true });
        showDecryptSignInMessage();
      } else {
        setOutput(DECRYPTED_URL_ELEMENT, decryptAccessMessage(err.message), { isError: true });
      }
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

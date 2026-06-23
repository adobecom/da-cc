import { getLibs } from '../../scripts/utils.js';

const FORM_MARKUP = `
  <div class="content">
    <div class="tc-tool-plain" role="region" aria-labelledby="decrypt-the-asset-link">
      <div class="cc-forms default spacing-m">
        <div class="form-components">
          <div class="form-item">
            <label for="encryptedurl">Enter the protected link*</label>
            <input type="text" class="cc-form-component" name="encryptedurl" id="encryptedurl"
              required="required" data-required="required" placeholder="Enter the protected link*">
          </div>
          <div class="form-item">
            <a href="#" class="tc-submit-btn cc-form-component submit decrypt-link"
              id="decrypt-link" daa-ll="Decrypt Link-1--" data-http-link="true">Generate Decrypted Link</a>
          </div>
          <div class="form-item">
            <div class="tc-output">
              <textarea name="decrypted-url" id="decrypted-url" rows="10"
                placeholder="Decrypted URL will appear here..." readonly></textarea>
              <button type="button" class="tc-copy-btn" data-copy-target="decrypted-url" aria-label="Copy decrypted URL" title="Copy"></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

const ERR_EMPTY_ENCRYPTED = 'EMPTY_ENCRYPTED_INPUT';

const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" focusable="false" aria-hidden="true"><path class="fill" d="M15.656,3.8625l-.1815-.1875a.75.75,0,0,0-1.0605,0L6.7275,11.55,3.4915,8.31a.75.75,0,0,0-1.0605,0l-.1845.1875a.75.75,0,0,0,0,1.0605l3.952,3.9555a.75.75,0,0,0,1.0605,0l8.3925-8.391A.75.75,0,0,0,15.656,3.8625Z"/></svg>';

const COPY_ICON_URL = '/creativecloud/icons/copy.svg';
let copyIconHtml = null;
const copyIconPromise = fetch(COPY_ICON_URL)
  .then((r) => r.text())
  .then((svg) => { copyIconHtml = svg; return svg; });

let imsLoadPromise;

async function ensureImsLoaded() {
  if (window.adobeIMS?.getAccessToken?.()?.token) return;
  if (!imsLoadPromise) {
    imsLoadPromise = (async () => {
      const { loadIms, setConfig, getConfig } = await import(`${getLibs()}/utils/utils.js`);
      if (!getConfig()?.imsClientId) {
        setConfig({ imsClientId: 'adobedotcom-cc', miloLibs: getLibs() });
      }
      await loadIms();
      for (let i = 0; i < 50 && typeof window.adobeIMS?.isSignedInUser !== 'function'; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => { setTimeout(r, 100); });
      }
    })();
  }
  await imsLoadPromise;
}

async function getBearerToken() {
  await ensureImsLoaded();
  const token = window.adobeIMS?.getAccessToken?.()?.token;
  if (!token) throw new Error('No IMS token available');
  return token;
}

function isNonProd() {
  return !!new URLSearchParams(window.location.search).get('nonprod');
}

function getDecryptionEndpoint() {
  const STAGE = 'https://www.stage.adobe.com/trustcenter/api/decrypturl';
  const PROD = 'https://www.adobe.com/trustcenter/api/decrypturl';

  const stageHosts = [
    'main--da-cc--adobecom.aem.page',
    'stage--da-cc--adobecom.aem.page',
    'dev--cc--adobecom.aem.page',
    'main--cc--adobecom.aem.page',
    'stage--cc--adobecom.aem.page',
    'main--cc--adobecom.hlx.page',
    'stage--cc--adobecom.hlx.page',
    'stage.adobe.com',
    'www.stage.adobe.com',
  ];

  const prodHosts = [
    'main--da-cc--adobecom.aem.live',
    'stage--da-cc--adobecom.aem.live',
    'dev--cc--adobecom.aem.live',
    'main--cc--adobecom.aem.live',
    'stage--cc--adobecom.aem.live',
    'main--cc--adobecom.hlx.live',
    'stage--cc--adobecom.hlx.live',
    'dev--cc--adobecom.hlx.live',
    'adobe.com',
  ];

  const { host } = window.location;
  if (!isNonProd() && prodHosts.includes(host)) return PROD;
  if (isNonProd() && prodHosts.includes(host)) return STAGE;
  if (stageHosts.includes(host)) return STAGE;
  if (host.endsWith('--da-cc--adobecom.aem.page') || host.endsWith('--cc--adobecom.aem.page')) return STAGE;
  throw new Error(`Decryption is not supported on host: ${host}`);
}

async function getDecryptedUrl(encryptedText) {
  const token = await getBearerToken();
  const response = await fetch(getDecryptionEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ encryptedText: encryptedText.trim() }),
  });
  if (response.status === 401) throw new Error('SIGN_IN_REQUIRED');
  if (response.status === 403) throw new Error('NOT_ADOBE_EMPLOYEE');
  if (!response.ok) throw new Error('DECRYPT_FAILED');
  const json = await response.json();
  if (!json.decryptedUrl) throw new Error('DECRYPT_FAILED');
  return json.decryptedUrl;
}

function setOutput(element, value, { isError = false } = {}) {
  element.value = value;
  element.classList.toggle('has-error', isError);
  const copyBtn = document.querySelector(`.tc-copy-btn[data-copy-target="${element.id}"]`);
  if (copyBtn) {
    copyBtn.classList.remove('copied');
    if (copyIconHtml) copyBtn.innerHTML = copyIconHtml;
    copyBtn.setAttribute('aria-label', 'Copy decrypted URL');
  }
}

async function createProgressCircle(formComponents) {
  if (!formComponents || formComponents.querySelector('.progress-holder')) return;
  const { createTag } = await import(`${getLibs()}/utils/utils.js`);
  const pdom = `<div class="spectrum-ProgressCircle-track"></div><div class="spectrum-ProgressCircle-fills">
    <div class="spectrum-ProgressCircle-fillMask1"><div class="spectrum-ProgressCircle-fillSubMask1"><div class="spectrum-ProgressCircle-fill"></div></div></div>
    <div class="spectrum-ProgressCircle-fillMask2"><div class="spectrum-ProgressCircle-fillSubMask2"><div class="spectrum-ProgressCircle-fill"></div></div></div>
  </div>`;
  const prgc = createTag('div', { class: 'spectrum-ProgressCircle spectrum-ProgressCircle--indeterminate' }, pdom);
  const layer = createTag('div', { class: 'progress-holder' }, prgc);
  formComponents.append(createTag('div', { class: 'form-item progress-item' }, layer));
}

function showProgressCircle(formComponents) {
  formComponents?.querySelector('.form-item.progress-item')?.classList.add('loading');
}

function hideProgressCircle(formComponents) {
  formComponents?.querySelector('.form-item.progress-item')?.classList.remove('loading');
}

function initCopyButtons() {
  document.querySelectorAll('.tc-copy-btn').forEach((btn) => {
    if (copyIconHtml) btn.innerHTML = copyIconHtml;
    else copyIconPromise.then((svg) => { btn.innerHTML = svg; }).catch(() => {});

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
        if (copyIconHtml) btn.innerHTML = copyIconHtml;
        btn.setAttribute('aria-label', 'Copy decrypted URL');
      }, 1500);
    });
  });
}

function initDecryptButton() {
  const btn = document.querySelector('#decrypt-link');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const formComponents = btn.closest('.form-components');
    const output = document.querySelector('#decrypted-url');
    try {
      await createProgressCircle(formComponents);
      showProgressCircle(formComponents);
      const encryptedText = document.querySelector('#encryptedurl').value.trim();
      if (!encryptedText) throw new Error(ERR_EMPTY_ENCRYPTED);
      setOutput(output, await getDecryptedUrl(encryptedText));
    } catch (err) {
      let msg;
      if (err.message === ERR_EMPTY_ENCRYPTED) msg = 'Please enter the protected link.';
      else if (err.message === 'NOT_ADOBE_EMPLOYEE') msg = 'Access denied. This tool is for Adobe employees only (@adobe.com).';
      else if (err.message === 'SIGN_IN_REQUIRED') msg = 'Session expired. Please refresh the page and sign in again.';
      else if (err.message === 'No IMS token available') msg = 'Authentication failed. Please refresh the page and sign in again.';
      else if (err.message?.startsWith('Decryption is not supported on host:')) msg = err.message;
      else msg = 'Could not decrypt the provided url. Please check the input and try again.';
      setOutput(output, msg, { isError: true });
    } finally {
      hideProgressCircle(formComponents);
    }
  });
}

export default async function init(el) {
  const { loadStyle } = await import(`${getLibs()}/utils/utils.js`);
  loadStyle('/creativecloud/features/cc-forms/components/progress-circle.css');
  loadStyle('/creativecloud/blocks/cc-forms/cc-forms.css');

  el.classList.add('tc-form-section');
  el.innerHTML = FORM_MARKUP;

  copyIconPromise.catch(() => {}).finally(() => {
    initCopyButtons();
    el.classList.add('decrypt-ready');
  });

  initDecryptButton();
}

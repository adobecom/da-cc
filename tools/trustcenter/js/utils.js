import { getLibs } from '../../../creativecloud/scripts/utils.js';

/*
 * Protect URL tool (Trust Center).
 *
 * The decrypt tool used to live here too, but it moved to a gated, preview-only
 * block: creativecloud/blocks/decrypt/. Encryption needs no auth (the encrypturl
 * endpoint is unauthenticated), so this file is intentionally auth-free.
 */

function getProtectUrlSubmit() {
  return document.querySelector('#generate-protected-link');
}

function getProtectedUrlElement() {
  return document.querySelector('#protected-url');
}

const COPY_ICON_URL = '/creativecloud/icons/copy.svg';
let copyIconHtml = null;
const copyIconPromise = fetch(COPY_ICON_URL)
  .then((response) => response.text())
  .then((svg) => {
    copyIconHtml = svg;
    return svg;
  });
const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" focusable="false" aria-hidden="true"><path class="fill" d="M15.656,3.8625l-.1815-.1875a.75.75,0,0,0-1.0605,0L6.7275,11.55,3.4915,8.31a.75.75,0,0,0-1.0605,0l-.1845.1875a.75.75,0,0,0,0,1.0605l3.952,3.9555a.75.75,0,0,0,1.0605,0l8.3925-8.391A.75.75,0,0,0,15.656,3.8625Z"/></svg>';

function setCopyButtonIcon(btn) {
  if (!btn) return;
  if (copyIconHtml) {
    btn.innerHTML = copyIconHtml;
    return;
  }
  copyIconPromise.then((svg) => {
    btn.innerHTML = svg;
  }).catch(() => {});
}

function setOutput(element, value, { isError = false } = {}) {
  element.value = value;
  element.classList.toggle('has-error', isError);
  const copyBtn = document.querySelector(`.tc-copy-btn[data-copy-target="${element.id}"]`);
  if (copyBtn) {
    copyBtn.classList.remove('copied');
    setCopyButtonIcon(copyBtn);
    copyBtn.setAttribute('aria-label', 'Copy encrypted URL');
  }
}

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

function getEncryptionEndpoint() {
  const ENCRYPT_STAGE_ENDPOINT = 'https://www.stage.adobe.com/trustcenter/api/encrypturl';
  const ENCRYPT_PROD_ENDPOINT = 'https://www.adobe.com/trustcenter/api/encrypturl';

  const allowedStageHosts = [
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

  const allowedProdHosts = [
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
  if (!isNonProd() && allowedProdHosts.includes(host)) return ENCRYPT_PROD_ENDPOINT;
  if (isNonProd() && allowedProdHosts.includes(host)) return ENCRYPT_STAGE_ENDPOINT;
  if (allowedStageHosts.includes(host)) return ENCRYPT_STAGE_ENDPOINT;
  throw new Error(`Encryption is not supported on host: ${host}`);
}

async function getEncryptedText(linkUrl) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plainText: linkUrl }),
  };
  const response = await fetch(getEncryptionEndpoint(), options);
  const responseJson = await response.json();
  // encrypturl returns standard Node base64 (+, /, optional = padding).
  return responseJson.encryptedCode;
}

function initCopyButtons() {
  document.querySelectorAll('.tc-copy-btn').forEach((btn) => {
    setCopyButtonIcon(btn);
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target?.value) return;
      try {
        await navigator.clipboard.writeText(target.value);
      } catch (_) { /* clipboard unavailable, skip */ }
      btn.classList.add('copied');
      btn.innerHTML = CHECK_ICON;
      btn.setAttribute('aria-label', 'Copied');
      setTimeout(() => {
        btn.classList.remove('copied');
        setCopyButtonIcon(btn);
        btn.setAttribute('aria-label', 'Copy encrypted URL');
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
        setOutput(getProtectedUrlElement(), 'Please enter a www.adobe.com asset url', { isError: true });
        throw new Error('Please enter a www.adobe.com asset url');
      }
      setOutput(getProtectedUrlElement(), await getEncryptedText(linkUrl));
      hideProgressCircle(formComponents);
    } catch (err) {
      const endpointMsg = err.message?.startsWith('Encryption is not supported on host:')
        ? err.message
        : 'Please enter a valid www.adobe.com asset url';
      setOutput(getProtectedUrlElement(), endpointMsg, { isError: true });
      hideProgressCircle(formComponents);
    }
  });
}

(async function startObserving() {
  const protectSubmit = getProtectUrlSubmit();
  if (protectSubmit) onSubmitButtonAdded(protectSubmit);
  copyIconPromise.catch(() => {}).finally(() => {
    initCopyButtons();
    document.body.classList.add('ready');
  });
}());

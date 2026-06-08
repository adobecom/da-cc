import { getLibs } from '../../../creativecloud/scripts/utils.js';

function getProtectUrlSubmit() {
  return document.querySelector('#generate-protected-link');
}

function getProtectedUrlElement() {
  return document.querySelector('#protected-url');
}

function getDecryptUrlSubmit() {
  return document.querySelector('#decrypt-link');
}

function getDecryptedUrlElement() {
  return document.querySelector('#decrypted-url');
}

function isDecryptPage() {
  return Boolean(getDecryptUrlSubmit());
}

function isProtectPage() {
  return Boolean(getProtectUrlSubmit());
}

const ADOBE_EMPLOYEE_DOMAIN = '@adobe.com';
const ERR_SIGN_IN = 'SIGN_IN_REQUIRED';
const ERR_NOT_ADOBE = 'NOT_ADOBE_EMPLOYEE';
const ERR_EMPTY_ENCRYPTED = 'EMPTY_ENCRYPTED_INPUT';
/** Decrypt UI + API only on da-cc Edge preview (*.aem.page), per internal policy. */
const ERR_DECRYPT_HOST_DISALLOWED = 'DECRYPT_HOST_DISALLOWED';

/** Decrypt only on da-cc *.aem.page (e.g. stage--da-cc--adobecom.aem.page). Not .aem.live/www. */
function isDecryptUtilityPageHostAllowed() {
  const { hostname } = window.location;
  return hostname.endsWith('--da-cc--adobecom.aem.page');
}

const DECRYPT_HOST_DISALLOWED_MESSAGE = (
  'This decryption tool is only available on internal da-cc preview (*.adobecom.aem.page), for example '
  + 'https://stage--da-cc--adobecom.aem.page/tools/trustcenter/decrypt.html — not on .aem.live or www.adobe.com.'
);

const DECRYPT_FIELD_HINT_DEFAULT = (
  'Sign in with your Adobe account required for decryption.'
);
/** Shared localStorage: idle + max session for Trust Center utility UX */
/** (server still validates tokens). */
const TRUSTCENTER_IDLE_MS = 30 * 60 * 1000;
const TRUSTCENTER_MAX_SESSION_MS = 8 * 60 * 60 * 1000;
const LS_LAST_ACTIVITY = 'trustcenter:lastActivityAt';
const LS_SESSION_START = 'trustcenter:utilitySessionStartAt';
const LS_SIGNOUT_BROADCAST = 'trustcenter:utilitySignOutAt';

let trustCenterSyncInitialized = false;
let sessionTerminateInProgress = false;
let handlingPeerSignOut = false;
let signInPending = false;
let imsLoadPromise;

function clearTrustCenterSessionKeys() {
  try {
    localStorage.removeItem(LS_LAST_ACTIVITY);
    localStorage.removeItem(LS_SESSION_START);
  } catch (_) { /* ignore */ }
}

function broadcastUtilitySignOut() {
  try {
    localStorage.setItem(LS_SIGNOUT_BROADCAST, String(Date.now()));
  } catch (_) { /* ignore */ }
}

function touchTrustCenterActivity() {
  const now = String(Date.now());
  try {
    localStorage.setItem(LS_LAST_ACTIVITY, now);
    if (!localStorage.getItem(LS_SESSION_START)) {
      localStorage.setItem(LS_SESSION_START, now);
    }
  } catch (_) { /* ignore */ }
}

function isTrustCenterIdleOrMaxSessionExpired() {
  const now = Date.now();
  try {
    const last = parseInt(localStorage.getItem(LS_LAST_ACTIVITY), 10);
    const start = parseInt(localStorage.getItem(LS_SESSION_START), 10);
    if (Number.isFinite(last) && now - last > TRUSTCENTER_IDLE_MS) return true;
    if (Number.isFinite(start) && now - start > TRUSTCENTER_MAX_SESSION_MS) return true;
  } catch (_) { /* ignore */ }
  return false;
}

/** Pass-through options some IMS builds honor (avoid silent wrong-account reuse). */
function imsSignInOptions() {
  const redirectUri = window.location.href;
  return {
    redirect_uri: redirectUri,
    reAuthenticate: true,
    prompt: 'login',
  };
}

async function ensureImsLoaded() {
  // Only skip when we already have a usable token — do not bail on
  // isSignedInUser alone, or loadIms() may never run and getAccessToken stays empty.
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

function requestSignIn(opts = { redirect_uri: window.location.href }) {
  if (signInPending || handlingPeerSignOut) return;
  signInPending = true;
  window.adobeIMS?.signIn?.(opts);
}

async function ensureImsThenRequestSignIn(opts) {
  await ensureImsLoaded();
  if (handlingPeerSignOut) return;
  requestSignIn(opts);
}

/** Pull email from JWT payload when profile API does not return it. */
function parseJwtEmail(token) {
  try {
    const part = token.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64));
    const email = json.email || json.preferred_username || json.username;
    return email ? String(email).toLowerCase() : '';
  } catch {
    return '';
  }
}

async function getDecryptActorEmail(ims) {
  if (typeof ims?.getProfile === 'function') {
    try {
      const profile = await ims.getProfile();
      const raw = profile?.email || profile?.primaryEmail;
      if (raw) return String(raw).toLowerCase();
    } catch (_) { /* fall through */ }
  }
  const token = ims?.getAccessToken?.()?.token;
  return token ? parseJwtEmail(token) : '';
}

function getDecryptFieldHintEl() {
  return document.querySelector('#tc-decrypt-field-hint');
}

function resetDecryptFieldHint() {
  const el = getDecryptFieldHintEl();
  if (!el) return;
  el.textContent = DECRYPT_FIELD_HINT_DEFAULT;
  el.classList.remove('tc-field-hint-signed-in');
  const signOutBtn = document.querySelector('#tc-decrypt-sign-out');
  if (signOutBtn) signOutBtn.hidden = true;
}

function updateDecryptFieldHintForAdobeEmployee(email) {
  const el = getDecryptFieldHintEl();
  if (!el) return;
  const display = email?.trim();
  el.textContent = display
    ? `Signed in as ${display}`
    : 'Signed in with your Adobe corporate account.';
  el.classList.add('tc-field-hint-signed-in');
  const signOutBtn = document.querySelector('#tc-decrypt-sign-out');
  if (signOutBtn) signOutBtn.hidden = false;
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
    copyBtn.setAttribute('aria-label', `Copy ${element.id === 'protected-url' ? 'encrypted' : 'decrypted'} URL`);
  }
}

function getDecryptOutputContainer() {
  return getDecryptedUrlElement()?.closest('.tc-output');
}

function getDecryptSignInOverlay() {
  return document.getElementById('decrypt-signin-btn')?.closest('.tc-signin-msg')
    ?? getDecryptOutputContainer()?.querySelector('.tc-signin-msg');
}

function hideDecryptSignInMessage() {
  const overlay = getDecryptSignInOverlay();
  if (overlay) overlay.hidden = true;
}

function showDecryptSignInMessage() {
  resetDecryptFieldHint();
  clearTrustCenterSessionKeys();
  const overlay = getDecryptSignInOverlay();
  if (overlay) overlay.hidden = false;
}

function setDecryptFormInteractive(enabled) {
  const input = document.querySelector('#encryptedurl');
  const btn = getDecryptUrlSubmit();
  if (input) {
    input.disabled = !enabled;
    input.toggleAttribute('disabled', !enabled);
  }
  if (btn) {
    btn.style.pointerEvents = enabled ? '' : 'none';
    btn.toggleAttribute('aria-disabled', !enabled);
    btn.classList.toggle('tc-decrypt-disabled', !enabled);
  }
}

function applyDecryptUtilityHostLock() {
  if (!isDecryptPage()) return;
  setDecryptFormInteractive(false);
  const output = getDecryptedUrlElement();
  if (output) {
    setOutput(output, DECRYPT_HOST_DISALLOWED_MESSAGE, { isError: true });
  }
}

/** IMS teardown + broadcast; imsSignInOptions() reduces staging IMS bounce-back. */
async function decryptPageSignOutAndPromptSignIn() {
  broadcastUtilitySignOut();
  try {
    await ensureImsLoaded();
    const ims = window.adobeIMS;
    if (typeof ims?.signOut === 'function') await ims.signOut();
  } catch (_) { /* ignore */ }
  clearTrustCenterSessionKeys();
  resetDecryptFieldHint();
  requestSignIn(imsSignInOptions());
}

async function performUtilitySessionTerminated() {
  if (sessionTerminateInProgress) return;
  sessionTerminateInProgress = true;
  try {
    if (isDecryptPage()) {
      await decryptPageSignOutAndPromptSignIn();
      return;
    }
    broadcastUtilitySignOut();
    try {
      await ensureImsLoaded();
      const ims = window.adobeIMS;
      if (typeof ims?.signOut === 'function') await ims.signOut();
    } catch (_) { /* ignore */ }
    clearTrustCenterSessionKeys();
    window.location.reload();
  } finally {
    sessionTerminateInProgress = false;
  }
}

async function handleCrossTabSignOutEvent() {
  if (handlingPeerSignOut) return;
  handlingPeerSignOut = true;
  try {
    await ensureImsLoaded();
    const ims = window.adobeIMS;
    if (typeof ims?.signOut === 'function') await ims.signOut();
  } catch (_) { /* ignore */ }
  clearTrustCenterSessionKeys();
  if (isDecryptPage()) resetDecryptFieldHint();
  window.location.reload();
}

async function checkTrustCenterSessionShouldExpire() {
  if (!isDecryptPage() && !isProtectPage()) return;
  if (isDecryptPage() && !isDecryptUtilityPageHostAllowed()) return;
  await ensureImsLoaded();
  const ims = window.adobeIMS;
  const token = ims?.getAccessToken?.()?.token;
  if (!token) return;
  if (isDecryptPage()) {
    const email = await getDecryptActorEmail(ims);
    if (!email?.endsWith(ADOBE_EMPLOYEE_DOMAIN)) return;
  }
  if (isTrustCenterIdleOrMaxSessionExpired()) {
    await performUtilitySessionTerminated();
  }
}

/** Other tabs: IMS signed out elsewhere — reload so UI matches cookies. */
async function verifyDecryptSignedInStillHasToken() {
  if (!isDecryptPage()) return;
  if (!isDecryptUtilityPageHostAllowed()) return;
  const hint = getDecryptFieldHintEl();
  if (!hint?.classList.contains('tc-field-hint-signed-in')) return;
  await ensureImsLoaded();
  const ims = window.adobeIMS;
  const token = ims?.getAccessToken?.()?.token;
  if (!token) window.location.reload();
}

function initTrustCenterCrossTabAndSession() {
  if (trustCenterSyncInitialized) return;
  trustCenterSyncInitialized = true;

  window.addEventListener('storage', (e) => {
    if (e.key !== LS_SIGNOUT_BROADCAST || e.newValue == null) return;
    handleCrossTabSignOutEvent().catch(() => {});
  });

  const onInterval = () => {
    checkTrustCenterSessionShouldExpire().catch(() => {});
    verifyDecryptSignedInStillHasToken().catch(() => {});
  };
  setInterval(onInterval, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onInterval();
  });

  let lastActivity = 0;
  const onActivity = () => {
    if (Date.now() - lastActivity < 30_000) return;
    lastActivity = Date.now();
    touchTrustCenterActivity();
  };
  ['pointerdown', 'keydown', 'scroll'].forEach((evt) => {
    document.addEventListener(evt, onActivity, { passive: true, capture: true });
  });
}

/** Static access-denied UI; manual sign-in only (no auto-redirect). */
function showNonAdobeAccessDenied() {
  const output = getDecryptedUrlElement();
  if (!isDecryptPage() || !output) return;
  setDecryptFormInteractive(false);
  setOutput(
    output,
    'Access denied. This tool is for Adobe employees only (@adobe.com).',
    { isError: true },
  );
  showDecryptSignInMessage();
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
function getDecryptionEndpoint() {
  const DECRYPT_STAGE_ENDPOINT = 'https://www.stage.adobe.com/trustcenter/api/decrypturl';
  const DECRYPT_PROD_ENDPOINT = 'https://www.adobe.com/trustcenter/api/decrypturl';

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
  if (!isNonProd() && allowedProdHosts.includes(host)) return DECRYPT_PROD_ENDPOINT;
  if (isNonProd() && allowedProdHosts.includes(host)) return DECRYPT_STAGE_ENDPOINT;
  if (allowedStageHosts.includes(host)) return DECRYPT_STAGE_ENDPOINT;
  throw new Error(`Decryption is not supported on host: ${host}`);
}

function initDecryptSignOutButton() {
  const btn = document.querySelector('#tc-decrypt-sign-out');
  if (!btn || btn.dataset.tcBound === '1') return;
  btn.dataset.tcBound = '1';
  btn.addEventListener('click', () => {
    decryptPageSignOutAndPromptSignIn().catch(() => {});
  });
}

function initDecryptSignInButton() {
  const btn = document.getElementById('decrypt-signin-btn');
  if (!btn || btn.dataset.tcBound === '1') return;
  btn.dataset.tcBound = '1';
  btn.addEventListener('click', () => {
    ensureImsThenRequestSignIn().catch(() => {});
  });
}

async function initDecryptImsGate() {
  if (handlingPeerSignOut) return;
  if (!isDecryptPage()) return;
  if (!isDecryptUtilityPageHostAllowed()) {
    applyDecryptUtilityHostLock();
    return;
  }
  await ensureImsLoaded();
  if (handlingPeerSignOut) return;
  const ims = window.adobeIMS;
  const token = ims?.getAccessToken?.()?.token;
  if (!token) {
    if (handlingPeerSignOut) return;
    requestSignIn();
    return;
  }
  const email = await getDecryptActorEmail(ims);
  if (handlingPeerSignOut) return;
  if (email && email.endsWith(ADOBE_EMPLOYEE_DOMAIN)) {
    if (isTrustCenterIdleOrMaxSessionExpired()) {
      await performUtilitySessionTerminated();
      return;
    }
    touchTrustCenterActivity();
    hideDecryptSignInMessage();
    updateDecryptFieldHintForAdobeEmployee(email);
  } else if (email) {
    showNonAdobeAccessDenied();
  } else {
    setOutput(
      getDecryptedUrlElement(),
      'Unable to verify your identity. Please sign out and try again.',
      { isError: true },
    );
    setDecryptFormInteractive(false);
  }
}
async function getDecryptBearerToken() {
  try {
    await ensureImsLoaded();
    const ims = window.adobeIMS;
    if (typeof ims?.isSignedInUser !== 'function' || !ims.isSignedInUser()) {
      requestSignIn();
      throw new Error(ERR_SIGN_IN);
    }
    const token = ims.getAccessToken()?.token;
    if (!token) {
      requestSignIn();
      throw new Error(ERR_SIGN_IN);
    }
    return token;
  } catch (err) {
    if (err.message === ERR_SIGN_IN || err.message === ERR_NOT_ADOBE) throw err;
    throw new Error(ERR_SIGN_IN);
  }
}

function decryptAccessMessage(code) {
  if (code === ERR_EMPTY_ENCRYPTED) {
    return 'Please enter the protected link.';
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
  // encrypturl returns standard Node base64 (+, /, optional = padding).
  return responseJson.encryptedCode;
}

async function getDecryptedUrl(encryptedText) {
  if (!isDecryptUtilityPageHostAllowed()) {
    throw new Error(ERR_DECRYPT_HOST_DISALLOWED);
  }
  const token = await getDecryptBearerToken();
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // decrypturl accepts standard or URL-safe base64 in JSON; server normalizes -/_ only.
    body: JSON.stringify({ encryptedText: encryptedText.trim() }),
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

function initCopyButtons() {
  document.querySelectorAll('.tc-copy-btn').forEach((btn) => {
    setCopyButtonIcon(btn);
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
        setCopyButtonIcon(btn);
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
        setOutput(getProtectedUrlElement(), 'Please enter a www.adobe.com asset url', { isError: true });
        throw new Error('Please enter a www.adobe.com asset url');
      }
      setOutput(getProtectedUrlElement(), await getEncryptedText(linkUrl));
      hideProgressCircle(formComponents);
      touchTrustCenterActivity();
    } catch (err) {
      const endpointMsg = err.message?.startsWith('Encryption is not supported on host:')
        ? err.message
        : 'Please enter a valid www.adobe.com asset url';
      setOutput(getProtectedUrlElement(), endpointMsg, { isError: true });
      hideProgressCircle(formComponents);
    }
  });
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
      if (!encryptedText) throw new Error(ERR_EMPTY_ENCRYPTED);
      setOutput(getDecryptedUrlElement(), await getDecryptedUrl(encryptedText));
      hideProgressCircle(formComponents);
      touchTrustCenterActivity();
    } catch (err) {
      if (err.message === ERR_SIGN_IN) {
        setOutput(getDecryptedUrlElement(), '', { isError: true });
        showDecryptSignInMessage();
      } else if (err.message === ERR_NOT_ADOBE) {
        showNonAdobeAccessDenied();
      } else if (err.message === ERR_DECRYPT_HOST_DISALLOWED) {
        applyDecryptUtilityHostLock();
      } else if (err.message?.startsWith('Decryption is not supported on host:')) {
        setOutput(getDecryptedUrlElement(), err.message, { isError: true });
      } else {
        setOutput(getDecryptedUrlElement(), decryptAccessMessage(err.message), { isError: true });
      }
      hideProgressCircle(formComponents);
    }
  });
}

(async function startObserving() {
  if (isDecryptPage()) {
    initTrustCenterCrossTabAndSession();
  }
  const protectSubmit = getProtectUrlSubmit();
  if (protectSubmit) onSubmitButtonAdded(protectSubmit);
  const decryptSubmit = getDecryptUrlSubmit();
  if (decryptSubmit) {
    initDecryptSignOutButton();
    initDecryptSignInButton();
    if (!isDecryptUtilityPageHostAllowed()) {
      applyDecryptUtilityHostLock();
    } else {
      onDecryptButtonAdded(decryptSubmit);
      initDecryptImsGate().catch(() => {});
    }
  } else {
    ensureImsLoaded().catch(() => {});
  }
  copyIconPromise.catch(() => {}).finally(() => {
    initCopyButtons();
    document.body.classList.add('ready');
  });
}());

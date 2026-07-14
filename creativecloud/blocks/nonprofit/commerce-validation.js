import {
  EDU_VALIDATION_CONFIG,
  NONPROFIT_VALIDATION_TYPE,
  VALIDATION_STATUS,
} from './constants.js';

const TERMINAL_STATUSES = new Set([
  VALIDATION_STATUS.APPROVED,
  VALIDATION_STATUS.DECLINED,
  VALIDATION_STATUS.PENDING,
]);

export function formatPersonId(profile) {
  const userId = profile?.userId || profile?.sub;
  if (!userId) return null;
  return userId.includes('@AdobeID') ? userId : `${userId}@AdobeID`;
}

export function parseEffectiveDate(raw) {
  if (!raw) return null;
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function buildValidationSearchUrl({
  baseUrl,
  personId,
  effectiveDate,
  country,
  type = NONPROFIT_VALIDATION_TYPE,
}) {
  const params = new URLSearchParams({ 'person-id': personId, type });
  if (effectiveDate) params.set('effective-date', effectiveDate);
  if (country) params.set('country', country);
  return `${baseUrl}?${params.toString()}`;
}

export function resolveValidationResult(status, validation) {
  const normalizedStatus = status?.toUpperCase?.() || VALIDATION_STATUS.UNKNOWN;

  if (TERMINAL_STATUSES.has(normalizedStatus)) {
    return { type: 'status', status: normalizedStatus, validation };
  }

  return { type: 'form', status: normalizedStatus, validation };
}

export function getEduValidationConfig(envName) {
  return envName === 'prod' ? EDU_VALIDATION_CONFIG.prod : EDU_VALIDATION_CONFIG.stage;
}

export async function fetchRenewalValidation({
  baseUrl,
  apiKey,
  personId,
  effectiveDate,
  country,
  accessToken,
  type = NONPROFIT_VALIDATION_TYPE,
}) {
  const url = buildValidationSearchUrl({
    baseUrl,
    personId,
    effectiveDate,
    country,
    type,
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': apiKey,
    },
  });

  if (response.status === 404) {
    return { type: 'form', status: null, validation: null };
  }

  if (!response.ok) {
    const error = new Error(`Edu validation GET failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const validation = await response.json();
  return resolveValidationResult(validation.status, validation);
}

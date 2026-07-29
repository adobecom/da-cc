import {
  EDU_VALIDATION_CONFIG,
  VALIDATION_STATUS,
  VERIFICATION_SEGMENT,
} from './constants.js';

const TERMINAL_STATUSES = new Set([
  VALIDATION_STATUS.APPROVED,
  VALIDATION_STATUS.DECLINED,
  VALIDATION_STATUS.PENDING,
]);

export function formatPersonId(profile) {
  const userId = profile?.userId || profile?.sub;
  if (!userId) return null;

  // Some IMS identifiers may include additional domain/tenant parts (e.g.
  // "abc@tenant@..."), which would produce invalid person-id values when we
  // append the expected "@AdobeID" suffix. Normalize by taking the left-most
  // identifier portion before any "@" and then ensure the canonical AdobeID
  // suffix is present.
  const decoded = String(userId);
  const base = decoded.split('@')[0];
  return base.includes('@AdobeID') ? base : `${base}@AdobeID`;
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
  verificationSegment = VERIFICATION_SEGMENT.NONPROFIT,
}) {
  const params = new URLSearchParams({
    'person-id': personId,
    'verification-segment': verificationSegment,
  });
  if (effectiveDate) params.set('effective-date', effectiveDate);
  if (country) params.set('country', country);
  return `${baseUrl}?${params.toString()}`;
}

export async function createRenewalValidation({
  baseUrl,
  apiKey,
  accessToken,
  personId,
  emailId,
  firstName,
  lastName,
  country,
  organizationId,
  organizationName,
  nonprofitDetails = {},
  verificationSegment = VERIFICATION_SEGMENT.NONPROFIT,
}) {
  const payload = {
    'verification-segment': verificationSegment,
    'person-id': personId,
    'email-id': emailId,
    'first-name': firstName,
    'last-name': lastName,
    country,
    'nonprofit-details': { language: nonprofitDetails.language },
  };

  if (organizationId) {
    payload['organization-id'] = organizationId;
  } else {
    if (organizationName) {
      payload['organization-name'] = organizationName;
    }

    if (nonprofitDetails['registry-id']) {
      payload['nonprofit-details']['registry-id'] = nonprofitDetails['registry-id'];
    }
    if (nonprofitDetails['registry-name']) {
      payload['nonprofit-details']['registry-name'] = nonprofitDetails['registry-name'];
    }
    if (nonprofitDetails.website) {
      payload['nonprofit-details'].website = nonprofitDetails.website;
    }
    if (nonprofitDetails['address-line-1']) {
      payload['nonprofit-details']['address-line-1'] = nonprofitDetails['address-line-1'];
    }
    if (nonprofitDetails['address-line-2']) {
      payload['nonprofit-details']['address-line-2'] = nonprofitDetails['address-line-2'];
    }
    if (nonprofitDetails.city) {
      payload['nonprofit-details'].city = nonprofitDetails.city;
    }
    if (nonprofitDetails.postal) {
      payload['nonprofit-details'].postal = nonprofitDetails.postal;
    }
    if (nonprofitDetails.state) {
      payload['nonprofit-details'].state = nonprofitDetails.state;
    }
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = new Error(`Edu validation POST failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
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
  verificationSegment = VERIFICATION_SEGMENT.NONPROFIT,
}) {
  const url = buildValidationSearchUrl({
    baseUrl,
    personId,
    effectiveDate,
    country,
    verificationSegment,
  });

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
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

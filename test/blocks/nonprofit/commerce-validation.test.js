import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import {
  buildValidationSearchUrl,
  fetchRenewalValidation,
  formatPersonId,
  parseEffectiveDate,
  resolveValidationResult,
} from '../../../creativecloud/blocks/nonprofit/commerce-validation.js';

describe('commerce-validation', () => {
  it('should format person-id with AdobeID suffix', () => {
    expect(formatPersonId({ userId: 'ABC123' })).to.equal('ABC123@AdobeID');
    expect(formatPersonId({ userId: 'ABC123@AdobeID' })).to.equal('ABC123@AdobeID');
  });

  it('should parse effective date from ISO or YYYY-MM-DD values', () => {
    expect(parseEffectiveDate('2026-08-06T07:00:01.000+00:00')).to.equal('2026-08-06');
    expect(parseEffectiveDate('2026-08-06')).to.equal('2026-08-06');
    expect(parseEffectiveDate('invalid')).to.equal(null);
  });

  it('should build validation search URL with verification-segment and effective date', () => {
    const url = buildValidationSearchUrl({
      baseUrl: 'https://commerce-stg.adobe.com/v1/edu-validations',
      personId: 'ABC123@AdobeID',
      effectiveDate: '2026-08-06',
      country: 'US',
    });

    expect(url).to.contain('person-id=ABC123%40AdobeID');
    expect(url).to.contain('verification-segment=NONPROFIT');
    expect(url).to.contain('effective-date=2026-08-06');
    expect(url).to.contain('country=US');
    expect(url).to.not.contain('type=');
  });

  it('should resolve terminal statuses to status view', () => {
    expect(resolveValidationResult('APPROVED', {}).type).to.equal('status');
    expect(resolveValidationResult('PENDING', {}).type).to.equal('status');
    expect(resolveValidationResult('DECLINED', {}).type).to.equal('status');
    expect(resolveValidationResult('UNKNOWN', {}).type).to.equal('form');
  });

  it('should treat 404 as form flow', async () => {
    const fetchStub = sinon.stub(window, 'fetch').resolves({
      status: 404,
      ok: false,
    });

    const result = await fetchRenewalValidation({
      baseUrl: 'https://commerce-stg.adobe.com/v1/edu-validations',
      apiKey: 'test-key',
      personId: 'ABC123@AdobeID',
      accessToken: 'token',
    });

    expect(result.type).to.equal('form');
    expect(result.validation).to.equal(null);
    fetchStub.restore();
  });
});

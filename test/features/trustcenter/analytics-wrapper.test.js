import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const { default: analyticsWrapper } = await import('../../../creativecloud/features/trustcenter/analytics-wrapper.js');

describe('analyticsWrapper', () => {
  beforeEach(() => {
    delete window.alloy_all;
    delete window.digitalData;
    sinon.restore();
  });

  it('resolves immediately when analytics is already ready', async () => {
    window.alloy_all = { set: sinon.spy() };

    await analyticsWrapper.onReady();

    expect(analyticsWrapper.set).to.be.a('function');
  });

  it('runs the alloy and legacy setter branches and catches thrown errors', async () => {
    const alloySet = sinon.stub().throws(new Error('alloy failed'));
    const legacySet = sinon.stub().throws(new Error('legacy failed'));
    window.alloy_all = { set: alloySet };
    window.digitalData = { _set: legacySet };

    await analyticsWrapper.onReady();

    expect(() => analyticsWrapper.set({ path: 'page.name', data: 'test-page' })).to.not.throw();
    expect(alloySet.calledOnceWithExactly('data._adobe_corpnew.digitalData.page.name', 'test-page')).to.equal(true);
    expect(legacySet.calledOnceWithExactly('page.name', 'test-page')).to.equal(true);
  });

  it('batches valid payloads through the shared setter', async () => {
    const alloySet = sinon.spy();
    const legacySet = sinon.spy();
    window.alloy_all = { set: alloySet };
    window.digitalData = { _set: legacySet };
    const setSpy = sinon.spy(analyticsWrapper, 'set');

    analyticsWrapper.batchSet([
      { path: 'first', data: 'one' },
      { path: 'second', data: 'two' },
    ]);

    expect(setSpy.callCount).to.equal(2);
  });
});

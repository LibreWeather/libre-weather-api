import { strict as assert } from 'node:assert';

import { cacheDuration } from '../src/middleware/cacheDuration';

describe('cacheDuration', () => {
  it('keeps current shorter than the 20 minute client poll', () => {
    assert.equal(cacheDuration('/weather/1,2/unit/METRIC/current'), '15 minutes');
  });

  it('keeps hourly and daily shorter than their client polls', () => {
    assert.equal(cacheDuration('/weather/1,2/unit/METRIC/hourly'), '45 minutes');
    assert.equal(cacheDuration('/weather/1,2/unit/METRIC/daily'), '6 hours');
  });

  it('leaves the combined forecast and other routes at 20 minutes', () => {
    assert.equal(cacheDuration('/weather/1,2/unit/METRIC'), '20 minutes');
    assert.equal(cacheDuration('/alerts/1,2'), '20 minutes');
  });
});

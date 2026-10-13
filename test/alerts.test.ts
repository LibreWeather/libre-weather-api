import { strict as assert } from 'node:assert';

import { AlertsService, AlertsUnavailableError, sortAlerts } from '../src/alerts/alerts.service';
import MetNo from '../src/alerts/providers/MetNo';
import Nws, { unwrap } from '../src/alerts/providers/Nws';
import type { AlertProvider } from '../src/alerts/providers/AlertProvider';
import { AlertSeverity, AlertSource, type Alert } from '../src/alerts/types';

const alert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'a',
  source: AlertSource.NWS,
  event: 'Wind Advisory',
  headline: 'Wind Advisory',
  description: '',
  instruction: null,
  severity: AlertSeverity.MODERATE,
  urgency: null,
  certainty: null,
  onset: 0,
  expires: null,
  ends: null,
  sender: 'NWS',
  areas: '',
  url: null,
  ...overrides,
});

const provider = (
  source: AlertSource,
  result: Alert[] | null | Error,
  covers = true
): AlertProvider & { calls: number } => ({
  source,
  calls: 0,
  mayCover: () => covers,
  async fetch() {
    this.calls++;
    if (result instanceof Error) throw result;
    return result;
  },
});

describe('NWS alerts', () => {
  it('normalizes CAP properties from api.weather.gov', () => {
    const [out] = Nws.serialize({
      features: [
        {
          properties: {
            '@id': 'https://api.weather.gov/alerts/urn:oid:1',
            id: 'urn:oid:1',
            event: 'Tornado Warning',
            headline: 'Tornado Warning issued by NWS Kansas City',
            description: '  At 4:05 PM a tornado was observed.  ',
            instruction: 'TAKE COVER NOW!',
            severity: 'Extreme',
            urgency: 'Immediate',
            certainty: 'Observed',
            status: 'Actual',
            onset: '2026-10-13T16:05:00-05:00',
            expires: '2026-10-13T16:45:00-05:00',
            ends: null,
            senderName: 'NWS Kansas City/Pleasant Hill MO',
            areaDesc: 'Jackson, MO',
          },
        },
      ],
    });
    assert.equal(out.source, AlertSource.NWS);
    assert.equal(out.severity, AlertSeverity.EXTREME);
    assert.equal(out.description, 'At 4:05 PM a tornado was observed.');
    assert.equal(out.instruction, 'TAKE COVER NOW!');
    assert.equal(out.onset, Date.parse('2026-10-13T21:05:00Z'));
    assert.equal(out.expires, Date.parse('2026-10-13T21:45:00Z'));
    assert.equal(out.ends, null);
    assert.equal(out.url, 'https://api.weather.gov/alerts/urn:oid:1');
  });

  it('drops test and exercise messages', () => {
    const out = Nws.serialize({
      features: [{ properties: { id: 't', event: 'Test Message', status: 'Test' } }],
    });
    assert.deepEqual(out, []);
  });

  it('reflows hard-wrapped product text but keeps paragraphs and list items', () => {
    const text
      = '* WHAT...Flooding caused by excessive rainfall continues to be\npossible.\n\n'
        + '* ADDITIONAL DETAILS...\n- Heavy rainfall possible this evening into\nWednesday morning.\n- http://www.weather.gov/safety/flood\n';
    assert.equal(
      unwrap(text),
      '* WHAT...Flooding caused by excessive rainfall continues to be possible.\n\n'
      + '* ADDITIONAL DETAILS...\n- Heavy rainfall possible this evening into Wednesday morning.\n- http://www.weather.gov/safety/flood'
    );
  });

  it('only tries points in or near US coverage', () => {
    const nws = new Nws();
    assert.equal(nws.mayCover(39.1, -94.6), true);
    assert.equal(nws.mayCover(13.4, 144.8), true);
    assert.equal(nws.mayCover(51.5, -0.12), false);
  });
});

describe('MET Norway alerts', () => {
  it('normalizes MetAlerts features', () => {
    const [out] = MetNo.serialize({
      features: [
        {
          when: { interval: ['2026-10-15T00:00:00+00:00', '2026-10-15T15:00:00+00:00'] },
          properties: {
            id: '2.49.0.1.578.0.1',
            eventAwarenessName: 'Heavy rain',
            title: 'Heavy rain, yellow level, Parts of Vestland county',
            description: 'Up to 60 mm of rain.',
            consequences: 'Local flooding is possible.',
            instruction: 'Clear drains.',
            severity: 'Moderate',
            certainty: 'Likely',
            status: 'Actual',
            area: 'Parts of Vestland county',
            web: '\n  https://www.met.no/farevarsler\n ',
          },
        },
      ],
    });
    assert.equal(out.event, 'Heavy rain');
    assert.equal(out.severity, AlertSeverity.MODERATE);
    assert.equal(out.description, 'Up to 60 mm of rain.\n\nLocal flooding is possible.');
    assert.equal(out.onset, Date.parse('2026-10-15T00:00:00Z'));
    assert.equal(out.expires, Date.parse('2026-10-15T15:00:00Z'));
    assert.equal(out.url, 'https://www.met.no/farevarsler');
  });

  it('decides coverage by bounding box', () => {
    const metno = new MetNo();
    assert.equal(metno.mayCover(59.91, 10.75), true);
    assert.equal(metno.mayCover(78.2, 15.6), true);
    assert.equal(metno.mayCover(39.1, -94.6), false);
  });
});

describe('AlertsService', () => {
  it('sorts by severity, then onset', () => {
    const sorted = sortAlerts([
      alert({ id: 'minor', severity: AlertSeverity.MINOR, onset: 1 }),
      alert({ id: 'late-severe', severity: AlertSeverity.SEVERE, onset: 20 }),
      alert({ id: 'early-severe', severity: AlertSeverity.SEVERE, onset: 10 }),
      alert({ id: 'extreme', severity: AlertSeverity.EXTREME, onset: 30 }),
    ]);
    assert.deepEqual(
      sorted.map((a) => a.id),
      ['extreme', 'early-severe', 'late-severe', 'minor']
    );
  });

  it('merges every provider that covers the point', async () => {
    const service = new AlertsService([
      provider(AlertSource.NWS, [alert({ id: 'n' })]),
      provider(AlertSource.METNO, [alert({ id: 'm', source: AlertSource.METNO, severity: AlertSeverity.SEVERE })]),
    ]);
    const out = await service.forPoint(1, 1);
    assert.equal(out.coverage, true);
    assert.deepEqual(out.sources, [AlertSource.NWS, AlertSource.METNO]);
    assert.deepEqual(
      out.alerts.map((a) => a.id),
      ['m', 'n']
    );
  });

  it('reports no coverage instead of an empty all-clear', async () => {
    const skipped = provider(AlertSource.METNO, [], false);
    const service = new AlertsService([provider(AlertSource.NWS, null), skipped]);
    const out = await service.forPoint(51.5, -0.12);
    assert.deepEqual(out, { coverage: false, sources: [], alerts: [] });
    assert.equal(skipped.calls, 0);
  });

  it('keeps working when one provider fails', async () => {
    const service = new AlertsService([
      provider(AlertSource.NWS, new Error('boom')),
      provider(AlertSource.METNO, [alert({ id: 'm' })]),
    ]);
    const out = await service.forPoint(1, 1);
    assert.deepEqual(out.sources, [AlertSource.METNO]);
    assert.equal(out.alerts.length, 1);
  });

  it('fails loudly when every covering provider fails', async () => {
    const service = new AlertsService([provider(AlertSource.NWS, new Error('boom'))]);
    await assert.rejects(service.forPoint(1, 1), AlertsUnavailableError);
  });

  it('drops alerts that have already expired', async () => {
    const service = new AlertsService([
      provider(AlertSource.NWS, [alert({ id: 'old', expires: 500 }), alert({ id: 'live', expires: 5000 })]),
    ]);
    const out = await service.forPoint(1, 1, 1000);
    assert.deepEqual(
      out.alerts.map((a) => a.id),
      ['live']
    );
  });

  it('caches nearby lookups briefly', async () => {
    const nws = provider(AlertSource.NWS, []);
    const service = new AlertsService([nws]);
    await service.forPoint(39.1031, -94.5822, 0);
    await service.forPoint(39.1049, -94.5799, 60_000);
    assert.equal(nws.calls, 1);
    await service.forPoint(39.1031, -94.5822, 5 * 60_000);
    assert.equal(nws.calls, 2);
  });
});

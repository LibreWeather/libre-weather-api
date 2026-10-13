import { AlertSource, toEpoch, toSeverity, type Alert } from '../types';
import { USER_AGENT, type AlertProvider } from './AlertProvider';

type NwsProperties = {
  id: string;
  event: string;
  headline?: string | null;
  description?: string | null;
  instruction?: string | null;
  severity?: string | null;
  urgency?: string | null;
  certainty?: string | null;
  status?: string | null;
  onset?: string | null;
  effective?: string | null;
  expires?: string | null;
  ends?: string | null;
  senderName?: string | null;
  areaDesc?: string | null;
  '@id'?: string;
};

export type NwsResponse = {
  features?: { properties: NwsProperties }[];
};

/**
 * NWS products are hard-wrapped near 69 columns. Rejoin wrapped lines so clients can reflow
 * the text, keeping blank-line paragraph breaks and lines that open a `*` or `-` list item.
 */
export const unwrap = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]*\n(?![ \t]*[*-] )[ \t]*/g, ' '))
    .join('\n\n');

/**
 * US National Weather Service alerts (api.weather.gov), covering the US and its territories.
 * Points outside NWS coverage come back as a 400 "out of bounds", which maps to `null`.
 */
export default class Nws implements AlertProvider {
  readonly source = AlertSource.NWS;

  #root = 'https://api.weather.gov';

  mayCover(lat: number, lon: number) {
    // Western hemisphere plus the Pacific territories (Guam, CNMI) past the antimeridian.
    return lat > -20 && lat < 75 && (lon < -60 || lon > 130);
  }

  async fetch(lat: number, lon: number) {
    const point = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const res = await fetch(`${this.#root}/alerts/active?point=${point}&status=actual`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
    });
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) throw new Error(`NWS alerts failed: ${res.status}`);
    return Nws.serialize((await res.json()) as NwsResponse);
  }

  static serialize(data: NwsResponse): Alert[] {
    return (data.features ?? [])
      .map(({ properties: p }) => p)
      .filter((p) => !p.status || p.status === 'Actual')
      .map((p) => ({
        id: p.id,
        source: AlertSource.NWS,
        event: p.event,
        headline: p.headline || p.event,
        description: unwrap(p.description ?? ''),
        instruction: unwrap(p.instruction ?? '') || null,
        severity: toSeverity(p.severity),
        urgency: p.urgency ?? null,
        certainty: p.certainty ?? null,
        onset: toEpoch(p.onset ?? p.effective),
        expires: toEpoch(p.expires),
        ends: toEpoch(p.ends),
        sender: p.senderName || 'National Weather Service',
        areas: p.areaDesc ?? '',
        url: p['@id'] ?? null,
      }));
  }
}

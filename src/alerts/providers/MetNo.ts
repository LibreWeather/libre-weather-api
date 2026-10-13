import { AlertSource, toEpoch, toSeverity, type Alert } from '../types';
import { USER_AGENT, type AlertProvider } from './AlertProvider';

type MetNoProperties = {
  id: string;
  event?: string;
  eventAwarenessName?: string;
  title?: string;
  description?: string;
  instruction?: string;
  consequences?: string;
  severity?: string;
  certainty?: string;
  status?: string;
  area?: string;
  eventEndingTime?: string;
  web?: string;
};

export type MetNoResponse = {
  features?: { properties: MetNoProperties; when?: { interval?: string[] } }[];
};

/**
 * MET Norway MetAlerts, covering mainland Norway, Svalbard and surrounding waters.
 * The API answers any point with an empty list, so coverage is decided by bounding box.
 */
export default class MetNo implements AlertProvider {
  readonly source = AlertSource.METNO;

  #root = 'https://api.met.no/weatherapi/metalerts/2.0';

  mayCover(lat: number, lon: number) {
    return lat >= 57 && lat <= 82 && lon >= 2 && lon <= 34;
  }

  async fetch(lat: number, lon: number) {
    if (!this.mayCover(lat, lon)) return null;
    const res = await fetch(`${this.#root}/current.json?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&lang=en`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`MET Norway alerts failed: ${res.status}`);
    return MetNo.serialize((await res.json()) as MetNoResponse);
  }

  static serialize(data: MetNoResponse): Alert[] {
    return (data.features ?? [])
      .filter(({ properties: p }) => !p.status || p.status === 'Actual')
      .map(({ properties: p, when }) => {
        const [start, end] = when?.interval ?? [];
        const description = [p.description, p.consequences].filter(Boolean).join('\n\n');
        return {
          id: p.id,
          source: AlertSource.METNO,
          event: p.eventAwarenessName || p.event || 'Weather warning',
          headline: (p.title ?? '').trim() || p.eventAwarenessName || 'Weather warning',
          description: description.trim(),
          instruction: p.instruction?.trim() || null,
          severity: toSeverity(p.severity),
          urgency: null,
          certainty: p.certainty ?? null,
          onset: toEpoch(start),
          expires: toEpoch(end),
          ends: toEpoch(p.eventEndingTime ?? end),
          sender: 'MET Norway',
          areas: p.area ?? '',
          url: p.web?.trim() || null,
        };
      });
  }
}

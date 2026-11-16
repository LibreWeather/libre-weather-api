import type { Response } from 'express';

/** `all` is the legacy combined payload. The others are fetched and cached on their own. */
export type WeatherPart = 'all' | 'current' | 'hourly' | 'daily';

export const isWeatherSlice = (part: string): part is Exclude<WeatherPart, 'all'> =>
  part === 'current' || part === 'hourly' || part === 'daily';

export type BackendOptions = {
  lat?: string;
  lon?: string;
  unit?: string;
  tz?: string;
  part?: WeatherPart;
  /** Key for this request. Open-Meteo ignores it. */
  key?: string;
};

export default class Backend {
  async fetch(res: Response, options: BackendOptions): Promise<unknown> {
    const { lat, lon } = options;

    if (!lat || !lon) {
      return res.json({
        error: 'Bad request, either latitude and longitude or weather location code are required.',
        code: 400,
      });
    }
    return null;
  }

  serialize(_data: unknown, _unit: string, _part?: WeatherPart): any {
    return undefined;
  }

  /** JSON body of a successful forecast response, or null when the upstream call failed. */
  protected async readForecast(url: string): Promise<unknown | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object') return null;
      const record = data as Record<string, unknown>;
      if (record.error === true || typeof record.error === 'string') return null;
      if (record.cod != null && String(record.cod) !== '200') return null;
      return data;
    } catch {
      return null;
    }
  }
}

import type { Response } from 'express';

export type BackendOptions = {
  lat?: string;
  lon?: string;
  unit?: string;
  tz?: string;
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

  serialize(_data: unknown, _unit: string): any {
    return undefined;
  }
}

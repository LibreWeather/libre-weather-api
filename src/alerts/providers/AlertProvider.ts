import type { Alert, AlertSource } from '../types';

export const USER_AGENT = process.env.ALERTS_USER_AGENT || '(libreweather.com, admin@libreweather.com)';

export interface AlertProvider {
  readonly source: AlertSource;

  /**
   * Cheap pre-check so providers that clearly can't answer aren't called.
   * Returning true does not guarantee coverage; `fetch` may still return null.
   */
  mayCover(lat: number, lon: number): boolean;

  /**
   * Active alerts for a point.
   * @returns alerts, or null when the provider does not cover the point
   */
  fetch(lat: number, lon: number): Promise<Alert[] | null>;
}

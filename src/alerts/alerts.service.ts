import { Injectable } from '@nestjs/common';
import { logger } from '../utils';
import MetNo from './providers/MetNo';
import Nws from './providers/Nws';
import type { AlertProvider } from './providers/AlertProvider';
import { SEVERITY_RANK, type Alert, type AlertsResponse } from './types';

const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX = 500;

export class AlertsUnavailableError extends Error {}

/**
 * Order alerts most severe first, then by soonest onset.
 * @param {Alert[]} alerts unsorted alerts
 * @returns {Alert[]} sorted copy
 */
export const sortAlerts = (alerts: Alert[]) =>
  [...alerts].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      || (a.onset ?? 0) - (b.onset ?? 0)
      || a.id.localeCompare(b.id)
  );

@Injectable()
export class AlertsService {
  #cache = new Map<string, { at: number; value: AlertsResponse }>();

  constructor(private readonly providers: AlertProvider[] = [new Nws(), new MetNo()]) {}

  async forPoint(lat: number, lon: number, now = Date.now()): Promise<AlertsResponse> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.#cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

    const candidates = this.providers.filter((provider) => provider.mayCover(lat, lon));
    const results = await Promise.allSettled(candidates.map((provider) => provider.fetch(lat, lon)));

    const response: AlertsResponse = { coverage: false, sources: [], alerts: [] };
    let failures = 0;
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        failures++;
        logger.warn(`${candidates[i].source} alerts unavailable: ${(result.reason as Error)?.message}`);
        return;
      }
      if (result.value === null) return;
      response.coverage = true;
      response.sources.push(candidates[i].source);
      response.alerts.push(...result.value);
    });

    if (failures && !response.coverage) {
      throw new AlertsUnavailableError('All covering alert providers failed');
    }

    response.alerts = sortAlerts(response.alerts.filter((alert) => !alert.expires || alert.expires > now));

    if (this.#cache.size >= CACHE_MAX) this.#cache.delete(this.#cache.keys().next().value!);
    this.#cache.set(key, { at: now, value: response });
    return response;
  }
}

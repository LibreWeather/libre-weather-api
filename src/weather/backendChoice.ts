import { BackendId } from '../utils/backends';

export { BackendId };

const IDS = new Set<string>(Object.values(BackendId));

export type BackendChoice = {
  /** Backend fetched first. Also the cache key. */
  backend: BackendId;
  key: string;
  /** The request named a backend that will not be tried. */
  rejected: boolean;
};

const isBackend = (value: string): value is BackendId => IDS.has(value);

/** A key is one trimmed token. Empty and spaced values are unusable. */
export const usableKey = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const key = value.trim();
  return key.length > 0 && !/\s/.test(key) ? key : '';
};

export const envKey = (backend: BackendId) => {
  if (backend === BackendId.OWM) return usableKey(process.env.OWM_KEY);
  if (backend === BackendId.PIRATE) return usableKey(process.env.PIRATE_WEATHER_KEY);
  return '';
};

export const configuredBackend = (): BackendId | null => {
  const value = process.env.BACKEND;
  return value && isBackend(value) ? value : null;
};

const headerText = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw : '';
};

/**
 * Which backend a request will try first.
 * An unknown name, an unusable key, or a keyed backend with no key at all
 * falls back to the configured backend. Open-Meteo ignores the key.
 * A bad key for the configured backend is ignored in favor of the env key.
 */
export const chooseBackend = (requested: unknown, headerKey: unknown): BackendChoice | null => {
  const configured = configuredBackend();
  if (!configured) return null;

  const rawRequest = headerText(requested).trim();
  const rawKey = headerText(headerKey);
  const keyUsable = usableKey(rawKey);
  const keyBad = rawKey.trim().length > 0 && !keyUsable;

  const configuredChoice = (rejected: boolean): BackendChoice => ({
    backend: configured,
    key: envKey(configured),
    rejected,
  });

  if (!rawRequest) {
    return { backend: configured, key: keyUsable || envKey(configured), rejected: false };
  }
  if (!isBackend(rawRequest)) return configuredChoice(true);
  if (rawRequest === BackendId.METEO) return { backend: BackendId.METEO, key: '', rejected: false };
  if (rawRequest === configured && keyBad) return configuredChoice(false);
  if (keyBad) return configuredChoice(true);

  const key = keyUsable || envKey(rawRequest);
  if (!key) return configuredChoice(rawRequest !== configured);
  return { backend: rawRequest, key, rejected: false };
};

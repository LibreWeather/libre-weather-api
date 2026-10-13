export enum AlertSeverity {
  EXTREME = 'EXTREME',
  SEVERE = 'SEVERE',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
  UNKNOWN = 'UNKNOWN'
}

export enum AlertSource {
  NWS = 'NWS',
  METNO = 'METNO'
}

export type Alert = {
  /** Provider-scoped identifier, stable across updates of the same message. */
  id: string;
  source: AlertSource;
  /** Short event name, e.g. "Tornado Warning". */
  event: string;
  headline: string;
  description: string;
  instruction: string | null;
  severity: AlertSeverity;
  /** CAP urgency, e.g. "Immediate", "Expected". */
  urgency: string | null;
  /** CAP certainty, e.g. "Observed", "Likely". */
  certainty: string | null;
  /** Epoch milliseconds. */
  onset: number | null;
  /** Epoch milliseconds; when this message stops being current. */
  expires: number | null;
  /** Epoch milliseconds; when the hazard itself is expected to end. */
  ends: number | null;
  sender: string;
  areas: string;
  url: string | null;
};

export type AlertsResponse = {
  /** Whether any configured provider covers the requested point. */
  coverage: boolean;
  /** Providers that answered for this point. */
  sources: AlertSource[];
  alerts: Alert[];
};

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  [AlertSeverity.EXTREME]: 4,
  [AlertSeverity.SEVERE]: 3,
  [AlertSeverity.MODERATE]: 2,
  [AlertSeverity.MINOR]: 1,
  [AlertSeverity.UNKNOWN]: 0,
};

export const toSeverity = (value?: string | null): AlertSeverity => {
  const upper = (value ?? '').toUpperCase();
  return (Object.values(AlertSeverity) as string[]).includes(upper) ? (upper as AlertSeverity) : AlertSeverity.UNKNOWN;
};

export const toEpoch = (value?: string | null): number | null => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
};

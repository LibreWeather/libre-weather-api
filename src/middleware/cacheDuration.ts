/**
 * How long a response stays in the API cache.
 * Shorter than the matching client poll (20 min, 1 hour, 12 hours) so that poll is a cache miss
 * and the screen actually changes. Everything else, including the legacy combined forecast, stays at 20 minutes.
 * @param {string} path request path
 * @returns {string} duration understood by apicache
 */
export const cacheDuration = (path: string) => {
  if (path.endsWith('/current')) return '15 minutes';
  if (path.endsWith('/hourly')) return '45 minutes';
  if (path.endsWith('/daily')) return '6 hours';
  return '20 minutes';
};

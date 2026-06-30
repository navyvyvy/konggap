export type CacheEntry<T> = {
  expiresAt: number;
  pending?: Promise<T>;
  value?: T;
};

export const OFFER_CACHE_TTL_MS = 30 * 60 * 1000;

export function cacheKey(query: string) {
  return query.trim().toLowerCase() || "생두";
}

export async function getCachedValue<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  load: () => Promise<T>,
  now = Date.now(),
  ttlMs = OFFER_CACHE_TTL_MS,
  refresh = false,
) {
  const cached = cache.get(key);
  if (!refresh && cached?.value && cached.expiresAt > now) return cached.value;
  if (cached?.pending) return cached.pending;

  const pending = load().then((value) => {
    cache.set(key, { value, expiresAt: now + ttlMs });
    return value;
  }).catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, { pending, expiresAt: 0 });
  return pending;
}

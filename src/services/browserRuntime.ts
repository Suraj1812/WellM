export type RuntimeLoadCache<T> = { pending?: Promise<T> };

/** Reuse the runtime's supported ready/loading promise before attempting initialization. */
export function ensureLocalRuntime<T>(
  getCurrentLoad: () => Promise<T> | undefined,
  load: () => Promise<T>,
  cache: RuntimeLoadCache<T>,
): Promise<T> {
  const current = getCurrentLoad();
  if (current) return current;
  if (cache.pending) return cache.pending;

  let loading: Promise<T>;
  try {
    loading = load();
  } catch (error) {
    // If another initializer won, adopt its supported promise. Other errors
    // remain failures and are surfaced to the user.
    const existing = getCurrentLoad();
    if (!existing) return Promise.reject(error);
    loading = existing;
  }
  const shared = loading.finally(() => {
    if (cache.pending === shared) cache.pending = undefined;
  });
  cache.pending = shared;
  return shared;
}

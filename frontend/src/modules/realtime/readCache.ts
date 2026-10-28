import {
  matchesTopics,
  subscribeResourceChanges,
  topicsForUrl,
} from "@/modules/realtime/resourceBus";

// TYPES
interface CacheEntry {
  value: object;
  expires: number;
  topics: string[];
}
interface PendingRead {
  request: Promise<object>;
  controller: AbortController;
  consumers: number;
  settled: boolean;
  invalidated: boolean;
  topics: string[];
}

// STATE
const entries = new Map<string, CacheEntry>();
const pending = new Map<string, PendingRead>();
const inFlight = new Set<PendingRead>();
let generation = 0;

// ACTIONS
const abortedRead = (): DOMException =>
  new DOMException("La lectura fue cancelada.", "AbortError");
export const clearReadCache = (): void => {
  generation++;
  entries.clear();
  inFlight.forEach((entry) => entry.controller.abort());
  pending.clear();
};
subscribeResourceChanges(({ topics }) => {
  inFlight.forEach((entry) => {
    if (matchesTopics(entry.topics, topics)) entry.invalidated = true;
  });
  pending.forEach((entry, key) => {
    if (matchesTopics(entry.topics, topics)) pending.delete(key);
  });
  entries.forEach((entry, key) => {
    if (matchesTopics(entry.topics, topics)) entries.delete(key);
  });
});
export const readCacheTtl = (url: string): number => {
  if (
    /auth|availability|available-slots|quote|checkout|wallet|payment|tracking|exports\/[^/?]+\/download/.test(
      url,
    )
  )
    return 0;
  return /analytics|dashboard|reports/.test(url) ? 15000 : 5000;
};
const consumeRead = <T>(
  key: string,
  entry: PendingRead,
  signal?: AbortSignal,
): Promise<T> => {
  if (signal?.aborted || entry.controller.signal.aborted)
    return Promise.reject(abortedRead());
  entry.consumers++;
  return new Promise<T>((resolve, reject) => {
    let released = false;
    const release = (): boolean => {
      if (released) return false;
      released = true;
      signal?.removeEventListener("abort", cancel);
      entry.controller.signal.removeEventListener("abort", cancel);
      entry.consumers--;
      if (entry.consumers === 0 && !entry.settled) {
        if (pending.get(key) === entry) pending.delete(key);
        entry.controller.abort();
      }
      return true;
    };
    const cancel = (): void => {
      if (release()) reject(abortedRead());
    };
    signal?.addEventListener("abort", cancel, { once: true });
    entry.controller.signal.addEventListener("abort", cancel, { once: true });
    entry.request.then(
      (value) => {
        if (release()) resolve((value as { data: T }).data);
      },
      (error) => {
        if (release()) reject(error);
      },
    );
  });
};
export const cachedRead = async <T>(
  key: string,
  url: string,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  cacheable = true,
  signal?: AbortSignal,
): Promise<T> => {
  if (signal?.aborted) throw abortedRead();
  const ttl = cacheable ? readCacheTtl(url) : 0;
  if (!ttl) return fetcher(signal);
  const cached = entries.get(key);
  if (cached && cached.expires > Date.now())
    return (cached.value as { data: T }).data;
  const active = pending.get(key);
  if (active && !active.controller.signal.aborted)
    return consumeRead<T>(key, active, signal);
  const version = generation;
  const controller = new AbortController();
  const entry: PendingRead = {
    request: Promise.resolve({}),
    controller,
    consumers: 0,
    settled: false,
    invalidated: false,
    topics: topicsForUrl(url),
  };
  entry.request = fetcher(controller.signal)
    .then((data) => {
      const value = { data };
      if (
        version === generation &&
        !entry.invalidated &&
        !controller.signal.aborted
      ) {
        entries.set(key, {
          value,
          expires: Date.now() + ttl,
          topics: entry.topics,
        });
        if (entries.size > 150)
          entries.delete(entries.keys().next().value || "");
      }
      return value;
    })
    .finally(() => {
      entry.settled = true;
      inFlight.delete(entry);
      if (pending.get(key) === entry) pending.delete(key);
    });
  pending.set(key, entry);
  inFlight.add(entry);
  return consumeRead<T>(key, entry, signal);
};

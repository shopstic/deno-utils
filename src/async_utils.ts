import { deferred, delay } from "./deps/std_async.ts";

export { deferred, delay };

export async function timeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  rejection: () => unknown = () => `Promise timed out after ${timeoutMs}ms`,
): Promise<T> {
  const opponent = deferred<T>();
  const timer = setTimeout(() => {
    opponent.reject(rejection());
  }, timeoutMs);

  try {
    return await Promise.race([
      promise,
      opponent,
    ]);
  } finally {
    clearTimeout(timer);
    opponent.resolve(null as unknown as T);
    await opponent.catch(() => Promise.resolve());
  }
}

export function memoizePromise<T>(create: () => Promise<T>): typeof create {
  let memoized: Promise<T> | null = null;

  return () => {
    if (!memoized) {
      memoized = create();
    }
    return memoized;
  };
}

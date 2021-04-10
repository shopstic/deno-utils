export function delay(delayMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function timeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  rejection: () => unknown = () => `Promise timed out after ${timeoutMs}ms`,
): Promise<T> {
  const controller = control<T>();
  const timer = setTimeout(() => {
    controller.reject(rejection());
  }, timeoutMs);

  try {
    return await Promise.race([
      promise,
      controller.promise,
    ]);
  } finally {
    clearTimeout(timer);
    controller.resolve(null as unknown as T);
    await controller.promise.catch(() => Promise.resolve());
  }
}

export function memoize<T>(create: () => Promise<T>): typeof create {
  let memoized: Promise<T> | null = null;

  return () => {
    if (!memoized) {
      memoized = create();
    }
    return memoized;
  };
}

export interface PromiseController<V> {
  resolve(value: V): void;
  reject(error: unknown): void;
  promise: Promise<V>;
}

export function control<V>(): PromiseController<V> {
  let resolveFn: PromiseController<V>["resolve"] | undefined = undefined;
  let rejectFn: PromiseController<V>["reject"] | undefined = undefined;

  const promise = new Promise<V>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    resolve: resolveFn!,
    reject: rejectFn!,
    promise,
  };
}

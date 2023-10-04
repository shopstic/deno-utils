import { deferred, delay } from "./deps/std_async.ts";
export { deferred, delay };

export function memoizePromise<T>(create: () => Promise<T>): typeof create {
  let memoized: Promise<T> | null = null;

  return () => {
    if (!memoized) {
      memoized = create();
    }
    return memoized;
  };
}

export function promiseTimeout<T>(timeoutMs: number, fn: () => Promise<T>, error: () => Error) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(error());
    }, timeoutMs);

    fn().finally(() => {
      clearTimeout(timeout);
    }).then(resolve, reject);
  });
}

export function promiseWithAbortableTimeout<T>(
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  return fn(abortController.signal).finally(() => {
    clearTimeout(timeout);
  });
}

export class AllSettledTogetherTimeoutError extends Error {
  settledResults: Record<string, PromiseSettledResult<unknown>>;

  constructor(message: string, settledPromises: Record<string, PromiseSettledResult<unknown>>) {
    super(message);
    this.settledResults = settledPromises;
    Object.setPrototypeOf(this, AllSettledTogetherTimeoutError.prototype);
  }
}

type Awaited<T> = T extends Promise<infer U> ? U : T;

type KeyedPromises<T> = {
  [K in keyof T]: Promise<T[K]>;
};

type KeyedPromiseSettledResults<T> = {
  [K in keyof T]: PromiseSettledResult<T[K]>;
};

// deno-lint-ignore no-explicit-any
export async function promiseAllKeyed<T extends Record<string, any>>(
  keyedPromises: KeyedPromises<T>,
): Promise<T> {
  const keys = Object.keys(keyedPromises);
  const values = Object.values(keyedPromises);

  const results = await Promise.all(values);

  const resolvedMap: Partial<T> = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    resolvedMap[key as keyof T] = results[i] as Awaited<T[keyof T]>;
  }

  return resolvedMap as T;
}

// deno-lint-ignore no-explicit-any
export function promiseAllSettledTogether<T extends Record<string, any>>(
  promises: KeyedPromises<T>,
  withinMs: number,
): Promise<KeyedPromiseSettledResults<T>> {
  return new Promise<KeyedPromiseSettledResults<T>>((resolve, reject) => {
    const settledPromises: Record<string, PromiseSettledResult<unknown>> = {};
    const pendingKeys: Set<string> = new Set(Object.keys(promises));

    if (pendingKeys.size === 0) {
      resolve({} as KeyedPromiseSettledResults<T>);
    } else {
      let timeout: number | null = null;

      // Function to set the timeout and handle it.
      const startTimeout = () => {
        timeout = setTimeout(() => {
          reject(
            new AllSettledTogetherTimeoutError(
              `The following promises did not complete within ${withinMs}ms from the first settled promise: ${
                Array.from(pendingKeys).join(", ")
              }`,
              settledPromises,
            ),
          );
        }, withinMs);
      };

      const wrappedPromises = Object.entries(promises).map(async ([key, promise]) => {
        try {
          const value = await promise;
          if (timeout === null) startTimeout();
          settledPromises[key] = { status: "fulfilled", value };
          pendingKeys.delete(key);
        } catch (reason) {
          if (timeout === null) startTimeout();
          settledPromises[key] = { status: "rejected", reason };
          pendingKeys.delete(key);
        } finally {
          if (pendingKeys.size === 0) {
            if (timeout !== null) {
              clearTimeout(timeout);
              timeout = null;
            }
            // deno-lint-ignore no-explicit-any
            resolve(settledPromises as any as KeyedPromiseSettledResults<T>);
          }
        }
      });

      Promise.all(wrappedPromises);
    }
  });
}

export function combineAbortSignals(signal1: AbortSignal, signal2?: AbortSignal) {
  const controller = new AbortController();
  const combinedSignal = controller.signal;

  if (signal1.aborted || signal2?.aborted) {
    controller.abort();
    return {
      [Symbol.dispose]() {},
      signal: combinedSignal,
    };
  }

  const onAbort = () => {
    controller.abort();
    cleanUp();
  };

  const cleanUp = () => {
    signal1.removeEventListener("abort", onAbort);
    signal2?.removeEventListener("abort", onAbort);
  };

  signal1.addEventListener("abort", onAbort);
  signal2?.addEventListener("abort", onAbort);

  return {
    [Symbol.dispose]() {
      cleanUp();
    },
    signal: combinedSignal,
  };
}

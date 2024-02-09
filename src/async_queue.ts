import { Deferred, deferred, delay } from "./deps/std_async.ts";
import { Semaphore } from "./semaphore.ts";

export abstract class AsyncReadonlyQueue<T> {
  static fromAsyncGenerator<U>(it: AsyncGenerator<U>, maxBufferSize = 1): AsyncReadonlyQueue<U> {
    const queue = new AsyncQueue<U>(maxBufferSize);
    (async () => {
      for await (const item of it) {
        if (queue.isCompleted) return;
        await queue.enqueue(item);
        if (queue.isCompleted) return;
      }
      queue.complete();
    })();
    return queue;
  }

  abstract items(): AsyncGenerator<T>;

  detach() {
    this._parents = undefined;
    return this;
  }

  protected _isCompleted = false;
  protected _pausePromise: Deferred<void> | null = null;

  constructor(
    protected _name: string,
    protected _maxBufferSize: number,
    protected _onComplete?: () => void,
    protected _parents?: AsyncReadonlyQueue<unknown>[],
  ) {}

  get isCompleted() {
    return this._isCompleted;
  }

  setPaused(paused: boolean) {
    if (paused && !this._pausePromise) {
      this._pausePromise = deferred<void>();
    } else if (!paused && this._pausePromise) {
      this._pausePromise.resolve();
      this._pausePromise = null;
    }
  }

  complete(): boolean {
    if (!this._isCompleted) {
      this._isCompleted = true;
      this._onComplete?.();
      this._parents?.forEach((p) => p.complete());
      return true;
    }
    return false;
  }

  flatten<U = T extends Promise<infer U> ? U : never>(): AsyncReadonlyQueue<U> {
    return this.transform("flatten", async function* (it) {
      for await (const item of it) {
        yield item as U;
      }
    });
  }

  to(queue: AsyncQueue<T>): Promise<void> {
    return (async () => {
      for await (const item of this.items()) {
        if (queue.isCompleted) return;
        await queue.enqueue(item);
        if (queue.isCompleted) return;
      }

      queue.complete();
    })();
  }

  protected _spawn<U>(name: string, bufferSize?: number, onComplete?: () => void): AsyncQueue<U> {
    return new AsyncQueue<U>(bufferSize ?? 1, { name, onComplete }, [this]);
  }

  /**
   * Transforms the queue into a new `AsyncQueue` using a provided function.
   *
   * @param fn - A function that takes an AsyncIterable of the existing queue items and returns a new AsyncIterable.
   * @returns A new `AsyncQueue` containing the transformed items.
   */
  transform<U>(
    name: string,
    fn: (it: AsyncIterable<T>, signal: AbortSignal) => AsyncIterable<U>,
    bufferSize?: number,
  ): AsyncReadonlyQueue<U> {
    const abortController = new AbortController();
    const mappedQueue = this._spawn<U>(name, bufferSize, () => {
      abortController.abort();
    });

    (async () => {
      for await (const newItem of fn(this.items(), abortController.signal)) {
        if (mappedQueue.isCompleted) return;
        await mappedQueue.enqueue(newItem);
        if (mappedQueue.isCompleted) return;
      }

      mappedQueue.complete();
    })();

    return mappedQueue;
  }

  drop(count: number) {
    if (count < 1) {
      throw new Error("drop() count must be greater than 0, got " + count);
    }

    return this.transform(`drop(${count})`, async function* (it) {
      let i = 0;
      for await (const item of it) {
        i++;
        if (i > count) {
          yield item;
        }
      }
    });
  }

  take(count: number) {
    if (count < 1) {
      throw new Error("take() count must be greater than 0, got " + count);
    }

    return this.transform(`take(${count})`, async function* (it) {
      let i = 0;
      for await (const item of it) {
        yield item;
        i++;
        if (i >= count) {
          break;
        }
      }
    });
  }

  takeWhile(fn: (value: T) => Promise<boolean> | boolean, inclusive = false) {
    return this.transform("takeWhile", async function* (it) {
      for await (const item of it) {
        if (await fn(item)) {
          yield item;
        } else {
          if (inclusive) {
            yield item;
          }
          break;
        }
      }
    });
  }

  collectArray(): Promise<T[]> {
    return this.reduce<T[]>([], (acc, item) => {
      acc.push(item);
      return acc;
    });
  }

  collectSet(): Promise<Set<T>> {
    return this.reduce<Set<T>>(new Set<T>(), (acc, item) => {
      acc.add(item);
      return acc;
    });
  }

  tap(fn: (value: T, signal: AbortSignal) => Promise<void> | void): AsyncReadonlyQueue<T> {
    return this.transform("tap", async function* (it, signal) {
      for await (const item of it) {
        try {
          await fn(item, signal);
        } catch (e) {
          if (e.name === "AbortError") {
            return;
          }
          throw e;
        }
        yield item;
      }
    });
  }

  fork() {
    return this.transform("fork", (it) => it).detach();
  }

  /**
   * Maps each item in the queue to a new item using a provided function.
   *
   * @param fn - A function that takes an item of type T and returns a new item of type U.
   * @returns A new `AsyncQueue` containing the mapped items.
   */

  map<U>(fn: (value: T, signal: AbortSignal) => Promise<U> | U): AsyncReadonlyQueue<U> {
    return this.transform("map", async function* (it, signal) {
      for await (const item of it) {
        try {
          yield await fn(item, signal);
        } catch (e) {
          if (e.name === "AbortError") {
            return;
          }
          throw e;
        }
      }
    });
  }

  /**
   *  It is similar to a map, but it transforms elements statefully. statefulMap allows us to map and accumulate in the same operation.
   */
  statefulMap<S, U>(
    state: S,
    fn: (accumulator: S, value: T, signal: AbortSignal) => Promise<[S, U]> | [S, U],
  ): AsyncReadonlyQueue<U> {
    let accumulator = state;

    return this.transform("statefulMap", async function* (it, signal) {
      for await (const item of it) {
        const [newAccumulator, newItem] = await fn(accumulator, item, signal);
        accumulator = newAccumulator;
        yield newItem;
      }
    });
  }

  switchMap<U>(fn: (value: T, signal: AbortSignal) => Promise<U>) {
    let currentAc = new AbortController();
    const mappedQueue = this._spawn<U>("switchMap", 1, () => {
      currentAc.abort();
    });

    (async () => {
      let currentPromise: Promise<boolean> | undefined = undefined;

      for await (const newItem of this.items()) {
        if (mappedQueue.isCompleted) return;

        if (currentPromise !== undefined) {
          currentAc.abort();
          await currentPromise;
        }

        if (mappedQueue.isCompleted) return;

        currentAc = new AbortController();
        currentPromise = fn(newItem, currentAc.signal)
          .then((toEmit) => {
            if (!mappedQueue.isCompleted) {
              return mappedQueue.enqueue(toEmit);
            }
            return false;
          })
          .catch((e) => {
            if (e.name === "AbortError") {
              return false;
            }
            return Promise.reject(e);
          });
      }

      if (currentPromise) {
        await currentPromise;
      }

      mappedQueue.complete();
    })();

    return mappedQueue;
  }

  /**
   * Maps each item in the queue to a new item using a provided function,
   * but with a maximum number of concurrent operations.
   *
   * @param concurrencyLimit - The maximum number of concurrent calls to the mapping function.
   * @param fn - A function that takes an item of type T and returns a new item of type U.
   * @returns A new `AsyncQueue` containing the mapped items.
   */
  concurrentMap<U>(
    concurrencyLimit: number,
    fn: (value: T, signal: AbortSignal) => Promise<U> | U,
  ): AsyncReadonlyQueue<U> {
    if (concurrencyLimit < 1) {
      throw new Error("concurrentMap() concurrencyLimit must be greater than 0, got " + concurrencyLimit);
    }

    const abortController = new AbortController();
    const mappedQueue = this._spawn<U>(`concurrentMap(${concurrencyLimit})`, 1, () => abortController.abort());
    const semaphore = new Semaphore(concurrencyLimit);

    const handleItem = async (item: T) => {
      if (mappedQueue.isCompleted) return;
      let newItem: U;

      try {
        newItem = await fn(item, abortController.signal);
      } catch (e) {
        if (e.name === "AbortError") {
          return;
        }
        throw e;
      }

      if (mappedQueue.isCompleted) return;
      await mappedQueue.enqueue(newItem);
    };

    const activePromises = new Set<Promise<void>>();

    (async () => {
      for await (const item of this.items()) {
        if (mappedQueue.isCompleted) break;

        await semaphore.acquire();
        const job = handleItem(item)
          .finally(() => {
            activePromises.delete(job);
            semaphore.release();
          });

        activePromises.add(job);

        if (mappedQueue.isCompleted) break;
      }

      // Wait for remaining promises to complete
      await Promise.all(activePromises);

      mappedQueue.complete();
    })();

    return mappedQueue;
  }

  /**
   * Filters the items in the queue based on a provided function.
   *
   * @param fn - A function that takes an item of type T and returns a boolean indicating whether to include the item.
   * @returns A new `AsyncQueue` containing only the items that pass the filter function.
   */

  filter<U>(fn: (value: T, signal: AbortSignal) => Promise<boolean> | boolean): AsyncReadonlyQueue<T> {
    return this.transform("filter", async function* (it, signal) {
      for await (const item of it) {
        try {
          if (await fn(item, signal)) {
            yield item;
          }
        } catch (e) {
          if (e.name === "AbortError") {
            return;
          }
          throw e;
        }
      }
    });
  }

  /**
   * Reduces the queue to a single value by applying a reducer function to each item in the queue.
   *
   * The reducer function takes an accumulator and an item from the queue, and returns a new accumulator.
   *
   * @param initialValue - The initial value of the accumulator.
   * @param reducer - A function that takes the accumulator and an item, and returns a new accumulator.
   *
   * @returns A promise that resolves to the final value of the accumulator after processing all items in the queue.
   */

  async reduce<U>(initialValue: U, reducer: (accumulator: U, value: T) => Promise<U> | U): Promise<U> {
    let accumulator = initialValue;

    for await (const item of this.items()) {
      accumulator = await reducer(accumulator, item);
    }

    return accumulator;
  }

  /**
   * Applies a function to each item in the queue to produce a new queue of accumulated values.
   *
   * The function takes an accumulator and an item from the queue, and returns a new accumulator.
   * Each new accumulator value is emitted as an item in the resulting queue.
   *
   * @param initialValue - The initial value of the accumulator.
   * @param fn - A function that takes the accumulator and an item, and returns a new accumulator.
   *
   * @returns A new `AsyncQueue` containing the accumulated values.
   */
  scan<U>(
    initialValue: U,
    fn: (accumulator: U, value: T, signal: AbortSignal) => Promise<U> | U,
  ): AsyncReadonlyQueue<U> {
    let accumulator = initialValue;

    return this.transform("scan", async function* (it, signal) {
      for await (const item of it) {
        try {
          accumulator = await fn(accumulator, item, signal);
        } catch (e) {
          if (e.name === "AbortError") {
            return;
          }
          throw e;
        }
        yield accumulator;
      }
    });
  }

  conflate<U>(reducer: (prior: T, next: T) => Promise<T> | T): AsyncReadonlyQueue<T> {
    let accumulator: T | undefined = undefined;

    const conflatedQueue = new AsyncKeepLastQueue<T>("conflate", this._maxBufferSize);

    (async () => {
      for await (const item of this.items()) {
        if (conflatedQueue.isCompleted) return;
        if (accumulator === undefined) {
          accumulator = item;
        } else {
          accumulator = await reducer(accumulator, item);
        }

        conflatedQueue.accumulate(accumulator);
        if (conflatedQueue.isCompleted) return;
      }

      conflatedQueue.complete();
    })();

    return conflatedQueue;
  }

  conflateWithSeed<U>(
    seed: U,
    reducer: (prior: U, next: T, signal: AbortSignal) => Promise<U> | U,
  ): AsyncReadonlyQueue<U> {
    let accumulator: U = seed;

    const abortController = new AbortController();
    const conflatedQueue = new AsyncKeepLastQueue<U>(
      "conflateWithSeed",
      this._maxBufferSize,
      () => abortController.abort(),
    );

    (async () => {
      for await (const item of this.items()) {
        if (conflatedQueue.isCompleted) return;
        try {
          accumulator = await reducer(accumulator, item, abortController.signal);
        } catch (e) {
          if (e.name === "AbortError") {
            return;
          }
          throw e;
        }

        conflatedQueue.accumulate(accumulator);
        if (conflatedQueue.isCompleted) return;
      }

      conflatedQueue.complete();
    })();

    return conflatedQueue;
  }

  conflateWithSeedFn<U>(
    seedFn: (next: T, signal: AbortSignal) => Promise<U> | U,
    reducer: (prior: U, next: T, signal: AbortSignal) => Promise<U> | U,
  ): AsyncReadonlyQueue<U> {
    let accumulator: U | undefined;

    const abortController = new AbortController();
    const signal = abortController.signal;
    const conflatedQueue = new AsyncKeepLastQueue<U>(
      "conflateWithSeedFn",
      this._maxBufferSize,
      () => abortController.abort(),
      undefined,
      () => {
        accumulator = undefined;
      },
    );

    (async () => {
      for await (const item of this.items()) {
        if (conflatedQueue.isCompleted) return;
        try {
          if (accumulator === undefined) {
            accumulator = await seedFn(item, signal);
          } else {
            accumulator = await reducer(accumulator, item, signal);
          }
        } catch (e) {
          if (e.name === "AbortError") {
            return;
          }
          throw e;
        }

        conflatedQueue.accumulate(accumulator);
        if (conflatedQueue.isCompleted) return;
      }

      conflatedQueue.complete();
    })();

    return conflatedQueue;
  }

  debounce(durationMs: number): AsyncReadonlyQueue<T> {
    if (durationMs < 1) {
      throw new Error("debounce() durationMs must be greater than 0, got " + durationMs);
    }

    let lastItem: T | undefined = undefined;
    let timer: number | undefined = undefined;

    const debouncedQueue = new AsyncKeepLastQueue<T>("debounce", this._maxBufferSize);

    (async () => {
      for await (const item of this.items()) {
        if (debouncedQueue.isCompleted) break;

        lastItem = item;

        if (timer !== undefined) {
          clearTimeout(timer);
        }

        timer = setTimeout(() => {
          timer = undefined;
          const emit = lastItem;
          debouncedQueue.accumulate(emit!);
          lastItem = undefined;
        }, durationMs);

        if (debouncedQueue.isCompleted) break;
      }

      if (timer !== undefined) {
        clearTimeout(timer);
        debouncedQueue.accumulate(lastItem!);
      }

      debouncedQueue.complete();
    })();

    return debouncedQueue;
  }

  throttleWithStats(
    count: number,
    perDurationMs: number,
  ): AsyncReadonlyQueue<{ item: T; remainingTokens: number; resetInMs: number }> {
    if (count < 1) {
      throw new Error("throttle() count must be greater than 0, got " + count);
    }

    if (perDurationMs < 1) {
      throw new Error("throttle() perDurationMs must be greater than 0, got " + perDurationMs);
    }

    let tokens = count;
    let lastRefillTime = performance.now();

    return this.transform("throttleWithStats", async function* (it, signal) {
      for await (const item of it) {
        // Emit item and consume a token
        yield {
          item,
          remainingTokens: --tokens,
          resetInMs: Math.max(0, perDurationMs - (performance.now() - lastRefillTime)),
        };

        const currentTime = performance.now();
        const timeSinceLastRefill = currentTime - lastRefillTime;

        // Refill tokens based on time passed
        if (timeSinceLastRefill >= perDurationMs) {
          tokens = Math.min(count, tokens + Math.floor(timeSinceLastRefill / perDurationMs) * count);
          lastRefillTime = currentTime;
        }

        // If no tokens available, wait
        if (tokens <= 0) {
          const remainingTime = perDurationMs - timeSinceLastRefill;

          try {
            await delay(remainingTime, { signal });
          } catch (e) {
            // Ignore abort exception
            if (e.name === "AbortError") {
              return;
            }
            throw e;
          }

          // Refill tokens after waiting
          tokens = count;
          lastRefillTime = performance.now();
        }
      }
    });
  }

  /**
   * Limits the rate at which items are emitted.
   *
   * @param count - The maximum number of items to emit in a given duration.
   * @param perDurationMs - The duration in milliseconds in which up to `count` items will be emitted.
   *
   * @returns A new `AsyncQueue` that throttles the emissions based on the rate limit parameters.
   */

  throttle(count: number, perDurationMs: number): AsyncReadonlyQueue<T> {
    return this.throttleWithStats(count, perDurationMs).map(({ item }) => item);
  }

  initialDelay(durationMs: number): AsyncReadonlyQueue<T> {
    if (durationMs < 1) {
      throw new Error("initialDelay() durationMs must be greater than 0, got " + durationMs);
    }

    let isFirst = true;
    return this.transform("initialDelay", async function* (it, signal) {
      for await (const item of it) {
        if (isFirst) {
          isFirst = false;
          try {
            await delay(durationMs, { signal });
          } catch (e) {
            // Ignore abort exception
            if (e.name === "AbortError") {
              return;
            }
            throw e;
          }
        }
        yield item;
      }
    });
  }

  idleTimeout(durationMs: number): AsyncReadonlyQueue<T> {
    if (durationMs < 1) {
      throw new Error("idleTimeout() durationMs must be greater than 0, got " + durationMs);
    }

    let timeoutId: number | null = null;
    const timeoutQueue = this._spawn<T>(`idleTimeout(${durationMs})`);

    const resetTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutQueue.complete();
      }, durationMs);
    };

    (async () => {
      resetTimeout();

      for await (const item of this.items()) {
        if (timeoutQueue.isCompleted) break;
        resetTimeout();
        await timeoutQueue.enqueue(item);
        if (timeoutQueue.isCompleted) break;
      }

      timeoutQueue.complete();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    })();

    return timeoutQueue;
  }

  groupWithin(count: number, durationMs: number): AsyncReadonlyQueue<T[]> {
    if (count < 1) {
      throw new Error("groupWithin() count must be greater than 0, got " + count);
    }

    if (durationMs < 1) {
      throw new Error("groupWithin() durationMs must be greater than 0, got " + durationMs);
    }

    const groupedQueue = this._spawn<T[]>(`groupWithin(${count})`);

    (async () => {
      let buffer: T[] = [];
      let timer: number | null = null;

      const flush = async () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (buffer.length > 0) {
          if (!groupedQueue.isCompleted) {
            await groupedQueue.enqueue(buffer);
          }
          buffer = [];
        }
      };

      for await (const item of this.items()) {
        if (groupedQueue.isCompleted) break;
        buffer.push(item);

        if (!timer) {
          timer = setTimeout(flush, durationMs);
        }

        if (buffer.length >= count) {
          await flush();
        }
        if (groupedQueue.isCompleted) break;
      }

      await flush();
      groupedQueue.complete();
    })();

    return groupedQueue;
  }
}

export class AsyncKeepLastQueue<T> extends AsyncReadonlyQueue<T> {
  protected _itemPromise = deferred<T>();
  protected _isItemPendingRead = false;
  protected _isPulling = false;

  constructor(
    protected _name: string,
    protected _maxBufferSize: number,
    protected _onComplete?: () => void,
    protected _parents?: AsyncReadonlyQueue<unknown>[],
    protected _onEmit?: () => void,
  ) {
    super(_name, _maxBufferSize, _onComplete, _parents);
  }

  accumulate(item: T) {
    this._isItemPendingRead = true;

    if (this._isPulling) {
      const promise = this._itemPromise;
      this._itemPromise = deferred<T>();
      promise.resolve(item);
    } else {
      this._itemPromise = deferred<T>();
      this._itemPromise.resolve(item);
    }
  }

  async *items(): AsyncGenerator<T> {
    while (this._isItemPendingRead || !this.isCompleted) {
      this._isPulling = true;
      const next = await this._itemPromise;
      this._isPulling = false;

      this._isItemPendingRead = false;

      this._onEmit?.();
      yield next;
    }
  }
}

const enqueuedPromise = Promise.resolve(true);

export class AsyncQueue<T> extends AsyncReadonlyQueue<T> {
  static merge<T>(maxBufferSize: number, queues: AsyncReadonlyQueue<T>[]): AsyncReadonlyQueue<T> {
    if (maxBufferSize < 1) {
      throw new Error("AsyncQueue.merge() maxBufferSize must be greater than 0, got " + maxBufferSize);
    }

    const mergedQueue = new AsyncQueue<T>(maxBufferSize, undefined, queues);

    for (const queue of queues) {
      queue.to(mergedQueue);
    }

    return mergedQueue;
  }

  protected _buffer: T[] = [];
  protected _resolveQueue: ((succeeded: boolean) => void)[] = [];
  protected _yieldQueue: (() => void)[] = [];
  protected _rejectOnFull: boolean;

  constructor(maxBufferSize = 1, { rejectOnFull = false, name = "anonymous", onComplete }: {
    rejectOnFull?: boolean;
    onComplete?: () => void;
    name?: string;
  } = {}, parents?: AsyncReadonlyQueue<unknown>[]) {
    super(name, maxBufferSize, onComplete, parents);
    this._rejectOnFull = rejectOnFull;
  }

  from(queue: AsyncReadonlyQueue<T>): Promise<void> {
    return queue.to(this);
  }

  get isFull(): boolean {
    return this._buffer.length >= this._maxBufferSize;
  }

  // prepend(value: T): Promise<void> {
  //   if (this._isCompleted) {
  //     return Promise.reject(new Error("The queue is completed. No more items can be prepended."));
  //   }

  //   if (!this.isFull) {
  //     this._buffer.unshift(value);
  //     this._onBufferEnlarged();
  //     return resolvedPromise;
  //   }

  //   if (this._rejectOnFull) {
  //     return Promise.reject(new Error(`The queue is full with current size ${this._buffer.length}`));
  //   }

  //   // If the buffer is full, wait for it to have space
  //   return new Promise((resolve) => {
  //     this._resolveQueue.push(() => {
  //       this._buffer.unshift(value);
  //       resolve();
  //     });
  //   });
  // }

  /**
   * Adds an item to the end of the queue.
   *
   * @param value - The item to be added to the queue.
   * @returns A promise that resolves once the item has been enqueued.
   * @throws Error if the queue is marked as completed or if the queue is full and `rejectOnFull` is set to true.
   */
  enqueue(value: T): Promise<boolean> {
    if (this._isCompleted) {
      return Promise.reject(new Error("The queue is completed. No more items can be enqueued."));
    }

    if (!this.isFull) {
      this._buffer.push(value);
      this._onBufferEnlarged();
      return enqueuedPromise;
    }

    if (this._rejectOnFull) {
      return Promise.reject(new Error(`The queue is full with current size ${this._buffer.length}`));
    }

    // If the buffer is full, wait for it to have space
    return new Promise<boolean>((resolve) => {
      this._resolveQueue.push((succeeded: boolean) => {
        if (succeeded) {
          this._buffer.push(value);
        }
        resolve(succeeded);
      });
    });
  }

  _onBufferEnlarged() {
    // If there are any pending yield operations, fulfill one
    if (this._yieldQueue.length > 0) {
      this._yieldQueue.shift()!();
    }
  }

  /**
   * Marks the queue as completed, preventing any more items from being enqueued.
   *
   * This will also resolve any pending yield operations on the queue.
   */
  complete(): boolean {
    const result = super.complete();

    if (result) {
      for (const resolve of this._yieldQueue) {
        resolve();
      }

      for (const resolve of this._resolveQueue) {
        resolve(false);
      }
    }

    return result;
  }

  async *items(): AsyncGenerator<T> {
    if (this._isCompleted && this._buffer.length === 0) {
      throw new Error(`[${this._name}] Trying to iterate items of an already completed, empty queue`);
    }

    while (true) {
      if (this._pausePromise !== null) {
        await this._pausePromise;
      }

      if (this._buffer.length > 0) {
        const value = this._buffer.shift();

        // If there are any pending enqueue operations, fulfill one
        if (this._resolveQueue.length > 0) {
          this._resolveQueue.shift()!(true);
        }

        yield value as T;
      } else {
        if (this._isCompleted) {
          return;
        }
        // If the buffer is empty, wait for it to have data
        await new Promise<void>((resolve) => {
          this._yieldQueue.push(resolve);
        });
      }
    }
  }
}

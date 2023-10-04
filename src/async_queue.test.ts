import { AsyncQueue } from "./async_queue.ts";
import { deferred, delay } from "./async_utils.ts";
import { chunk, slidingWindows } from "./deps/std_collections.ts";
import { assertAlmostEquals, assertEquals, assertRejects } from "./deps/std_testing.ts";

Deno.test("enqueue() enforces buffer limit", async () => {
  const queue = new AsyncQueue<number>(1);

  await queue.enqueue(1);

  let isSecondEnqueueDone = false;

  const secondEnqueuePromise = (async () => {
    const ret = await queue.enqueue(2);
    isSecondEnqueueDone = true;
    return ret;
  })();

  await delay(100);

  assertEquals(isSecondEnqueueDone, false, "Second enqueue should not be done yet");

  queue.complete();

  assertEquals(await secondEnqueuePromise, false);
});

Deno.test("enqueue() rejects on buffer full if configured", async () => {
  const queue = new AsyncQueue<number>(2, { rejectOnFull: true });

  await queue.enqueue(1);
  await queue.enqueue(2);

  assertRejects(() => queue.enqueue(3), Error, "The queue is full with current size 2");

  for await (const item of queue.items()) {
    assertEquals(item, 1);
    await queue.enqueue(3);
    return;
  }

  queue.complete();
});

Deno.test("complete() stops generator after calling complete", async () => {
  const queue = new AsyncQueue<number>(2);

  await queue.enqueue(1);
  await queue.enqueue(2);

  const results: number[] = [];

  for await (const item of queue.items()) {
    results.push(item);
    if (results.length === 1) {
      queue.complete();
    }
  }

  assertEquals(results, [1, 2]);
});

Deno.test("enqueue() throws error if enqueue is called after complete", async () => {
  const queue = new AsyncQueue<number>(2);

  queue.complete();

  await assertRejects(
    async () => {
      await queue.enqueue(1);
    },
    Error,
    "The queue is completed. No more items can be enqueued.",
  );
});

Deno.test("map() squares each element in the queue", async () => {
  const queue = new AsyncQueue<number>(5);
  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  await queue.complete();

  const results = await queue.map((n) => n * n).collectArray();
  assertEquals(results, [1, 4, 9]);
});

Deno.test("filter() keeps only even numbers", async () => {
  const queue = new AsyncQueue<number>(10);

  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  await queue.enqueue(4);
  await queue.enqueue(5);
  await queue.enqueue(6);
  queue.complete();

  const results = await queue.filter((n) => n % 2 === 0).collectArray();
  assertEquals(results, [2, 4, 6]);
});

Deno.test("reduce() sums up the elements in the queue", async () => {
  // Create a new AsyncQueue and populate it
  const queue = new AsyncQueue<number>(10);
  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  await queue.enqueue(4);
  await queue.enqueue(5);
  queue.complete();

  // Use .reduce to sum up the elements in the queue
  const sum = await queue.reduce(0, (acc, n) => acc + n);

  // Verify that the sum is correct
  assertEquals(sum, 15);
});

Deno.test("scan() calculates running sum", async () => {
  // Create a new AsyncQueue and populate it
  const originalQueue = new AsyncQueue<number>(10);
  await originalQueue.enqueue(1);
  await originalQueue.enqueue(2);
  await originalQueue.enqueue(3);
  await originalQueue.enqueue(4);
  await originalQueue.enqueue(5);
  originalQueue.complete();

  const sumQueue = originalQueue.scan(0, (acc, n) => acc + n);

  const results = await sumQueue.collectArray();

  assertEquals(results, [1, 3, 6, 10, 15]);
});

Deno.test("conflate() basic", async () => {
  const queue = new AsyncQueue<number>(10);

  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  await queue.enqueue(4);

  const conflatedQueue = queue.conflate((_, b) => b);
  queue.complete();

  const results = await conflatedQueue.tap(() => delay(100)).collectArray();
  assertEquals(results, [1, 4]);
});

Deno.test("debounce() basic", async () => {
  const queue = new AsyncQueue<number>(10);
  const debouncedQueue = queue.debounce(100);

  await queue.enqueue(1);
  await queue.enqueue(2);

  setTimeout(() => {
    queue.enqueue(3);
  }, 50);

  setTimeout(() => {
    queue.enqueue(4);
    queue.complete();
  }, 100);

  const results = await debouncedQueue.collectArray();
  assertEquals(results, [4]);
});

Deno.test("debounce() respects backpressure", async () => {
  const queue = new AsyncQueue<number>(10);
  const debouncedQueue = queue.debounce(50);

  const delays = [10, 20, 30, 40, 50, 150, 250];

  (async () => {
    const promises = delays.map(async (d) => {
      await delay(d);
      await queue.enqueue(d);
    });
    await Promise.all(promises);
    queue.complete();
  })();

  const results = await debouncedQueue.tap(() => delay(300)).collectArray();

  assertEquals(results, [50, 250]);
});

Deno.test("throttle() basic", async () => {
  const queue = new AsyncQueue<number>(10);
  for (let i = 0; i < 10; i++) {
    await queue.enqueue(i);
  }
  queue.complete();

  const throttled = queue.throttle(2, 100); // 2 items per 100ms

  const start = performance.now();
  const results = await throttled
    .map(() => performance.now() - start)
    .collectArray();

  const pairs = chunk(results, 2);

  for (const [previous, next] of pairs) {
    const gap = Math.abs(next - previous);
    assertAlmostEquals(gap, 0, 20);
  }

  for (const [previous, next] of slidingWindows(pairs, 2)) {
    const elapsed = next.reduce((a, b) => Math.max(a, b)) - previous.reduce((a, b) => Math.max(a, b));
    assertAlmostEquals(elapsed, 100, 50);
  }
});

Deno.test("concurrentMap() basic", async () => {
  const queue = new AsyncQueue<number>(10);
  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  queue.complete();

  const transformed = queue.concurrentMap(2, (x) => x * 2);

  assertEquals(await transformed.collectSet(), new Set([2, 4, 6]));
});

Deno.test("concurrentMap() enforces concurrency limit", async () => {
  const queue = new AsyncQueue<number>(10);
  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  await queue.enqueue(4);
  await queue.enqueue(5);

  const lock = deferred();
  const transformed = queue.map((v) => v).concurrentMap(4, async (x) => {
    if (x === 1) {
      await lock;
    }
    return x;
  });

  assertEquals(await transformed.take(3).detach().collectSet(), new Set([2, 3, 4]));
  lock.resolve();
  queue.complete();
  assertEquals(await transformed.collectSet(), new Set([1, 5]));
});

Deno.test("groupWithin() groups elements within specified time and count", async () => {
  const queue = new AsyncQueue<number>(10);

  (async () => {
    for (let i = 1; i <= 4; i++) {
      await queue.enqueue(i);
      await delay(50); // 50ms delay between each enqueue
    }
    queue.enqueue(5);
    queue.complete();
  })();

  const result = await queue.groupWithin(3, 100).collectArray();

  assertEquals(result, [
    [1, 2],
    [3, 4],
    [5],
  ]);
});

Deno.test("groupWithin() works with varying intervals", async () => {
  const queue = new AsyncQueue<number>(10);

  // Enqueue items with varying intervals
  (async () => {
    const items = [10, 30, 50, 10, 120];
    for (let i = 0; i < items.length; i++) {
      await delay(items[i]);
      await queue.enqueue(i);
    }
    queue.complete();
  })();

  const result = await queue.groupWithin(3, 100).collectArray(); // group up to 3 items within 100ms

  assertEquals(result, [
    [0, 1, 2],
    [3],
    [4],
  ]);
});

Deno.test("setPaused() pauses and resumes the queue", async () => {
  const queue = new AsyncQueue<number>(10);

  await queue.enqueue(1);
  await queue.enqueue(2);
  await queue.enqueue(3);
  await queue.enqueue(4);

  const collected: number[] = [];

  setTimeout(() => {
    assertEquals(collected, [1, 2]);
    queue.setPaused(false);
    queue.complete();
  }, 200);

  for await (const item of queue.items()) {
    collected.push(item);
    if (collected.length === 2) {
      queue.setPaused(true);
    }
  }

  assertEquals(collected, [1, 2, 3, 4]);
});

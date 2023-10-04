import { AsyncQueue } from "./async_queue.ts";
import { deferred, delay } from "./async_utils.ts";
import { assertArrayIncludes, assertEquals, assertRejects } from "./deps/std_testing.ts";
import { DefaultLogger } from "./logger.ts";
import { runQueueWorker } from "./queue_worker/main.ts";
import { isSelfWorker, QueueWorkerTask } from "./queue_worker/shared.ts";
import { runAsQueueWorker } from "./queue_worker/worker.ts";
import { WindowCorrelationError } from "./windowing.ts";

type TestTask = {
  input: number;
  delayMs: number;
};

if (isSelfWorker()) {
  await runAsQueueWorker<TestTask, number>(async ({ input, delayMs }, signal) => {
    await delay(delayMs, { signal });
    return input * 2;
  }, {
    logger: DefaultLogger,
  });
} else {
  Deno.test("should process tasks concurrently", async () => {
    const taskQueue = new AsyncQueue<QueueWorkerTask<TestTask, number>>(1);

    async function runTask(request: TestTask) {
      const promise = deferred<number>();
      const task: QueueWorkerTask<TestTask, number> = {
        input: request,
        promise,
      };
      await taskQueue.enqueue(task);
      return await promise;
    }

    const workerPromise = runQueueWorker<TestTask, number>(taskQueue, {
      url: new URL(import.meta.url),
      concurrency: 10,
    });

    const results = await Promise.all(
      Array.from({ length: 10 }).map(async (_, i) => {
        const rand = Math.floor(Math.random() * 90) + 10;

        return {
          input: i,
          output: await runTask({
            input: i,
            delayMs: rand,
          }),
        };
      }),
    );

    assertArrayIncludes(results, [
      { input: 0, output: 0 },
      { input: 1, output: 2 },
      { input: 2, output: 4 },
      { input: 3, output: 6 },
      { input: 4, output: 8 },
      { input: 5, output: 10 },
      { input: 6, output: 12 },
      { input: 7, output: 14 },
      { input: 8, output: 16 },
      { input: 9, output: 18 },
    ]);

    taskQueue.complete();

    await workerPromise;
  });

  Deno.test("should respect abort signal while processing tasks", async () => {
    const taskQueue = new AsyncQueue<QueueWorkerTask<TestTask, number>>(1);
    const abortController = new AbortController();

    async function runTask(input: TestTask) {
      const promise = deferred<number>();
      const task: QueueWorkerTask<TestTask, number> = {
        input,
        promise,
      };
      await taskQueue.enqueue(task);
      return await promise;
    }

    const workerPromise = runQueueWorker<TestTask, number>(taskQueue, {
      url: new URL(import.meta.url),
      concurrency: 10,
      signal: abortController.signal,
    });

    const task1Promise = runTask({
      input: 1,
      delayMs: 10,
    });

    const task2Promise = runTask({
      input: 2,
      delayMs: 200,
    });

    await task1Promise;

    abortController.abort();

    assertEquals(await task2Promise, 4);

    await workerPromise;
  });

  Deno.test("should respect an aborted signal before processing any task", async () => {
    const taskQueue = new AsyncQueue<QueueWorkerTask<TestTask, number>>(1);
    const abortController = new AbortController();

    async function runTask(input: TestTask) {
      const promise = deferred<number>();
      const task: QueueWorkerTask<TestTask, number> = {
        input,
        promise,
      };
      await taskQueue.enqueue(task);
      return await promise;
    }

    abortController.abort();

    const workerPromise = runQueueWorker<TestTask, number>(taskQueue, {
      url: new URL(import.meta.url),
      concurrency: 10,
      signal: abortController.signal,
    });

    const taskPromise = runTask({
      input: 1,
      delayMs: 10,
    });

    await assertRejects(() => taskPromise, WindowCorrelationError);
    await workerPromise;
  });

  Deno.test("should respect per-task abort signal", async () => {
    const taskQueue = new AsyncQueue<QueueWorkerTask<TestTask, number>>(1);
    const abortController = new AbortController();

    async function runTask(input: TestTask) {
      const promise = deferred<number>();
      const task: QueueWorkerTask<TestTask, number> = {
        input,
        promise,
        signal: abortController.signal,
      };
      await taskQueue.enqueue(task);
      return await promise;
    }

    const workerPromise = runQueueWorker<TestTask, number>(taskQueue, {
      url: new URL(import.meta.url),
      concurrency: 10,
    });

    const promise1 = runTask({
      input: 1,
      delayMs: 200,
    });
    const promise2 = runTask({
      input: 2,
      delayMs: 20,
    });
    const promise3 = runTask({
      input: 3,
      delayMs: 10,
    });

    await Promise.all([
      promise2,
      promise3,
    ]);
    abortController.abort();

    await assertRejects(() => promise1, Error, "The signal has been aborted");

    taskQueue.complete();

    await workerPromise;
  });
}

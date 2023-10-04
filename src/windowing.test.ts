import { AsyncQueue, AsyncReadonlyQueue } from "./async_queue.ts";
import { deferred, delay } from "./async_utils.ts";
import { assertEquals, assertRejects } from "./deps/std_testing.ts";
import { correlateWindow, WindowCorrelationError } from "./windowing.ts";

type TestElement = { id: number };
const extractRequestId = (r: TestElement) => r.id;
const extractResponseId = (r: TestElement) => r.id;

Deno.test("Basic functionality", async () => {
  const lock = deferred();

  const requests = AsyncReadonlyQueue.fromAsyncGenerator((async function* () {
    yield { id: 1 };
    yield { id: 2 };
    lock.resolve();
  })());

  const responses = AsyncReadonlyQueue.fromAsyncGenerator((async function* () {
    await lock;
    yield { id: 1 };
    yield { id: 2 };
  })());

  const sendRequest = async () => {};

  const toMatch = [{ id: 1 }, { id: 2 }];
  const signal = new AbortController().signal;

  await correlateWindow<TestElement>({
    windowSize: 2,
    responseTimeoutMs: 1000,
    requests,
    responses,
    sendRequest,
    extractRequestId,
    extractResponseId,
    completionTimeoutMs: 0,
    onMatch({ response }) {
      assertEquals(toMatch.shift(), response);
      return Promise.resolve();
    },
    signal,
  });

  // No assertion needed; we just want it to complete without error
});

Deno.test("Response timeout", async () => {
  const requests = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    yield { id: 1 };
  }());
  const responses = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    yield await new Promise<TestElement>(() => {});
  }());
  const sendRequest = async () => {};

  const signal = new AbortController().signal;

  const error = await assertRejects(
    () =>
      correlateWindow({
        windowSize: 1,
        responseTimeoutMs: 100,
        requests,
        responses,
        sendRequest,
        extractRequestId,
        extractResponseId,
        completionTimeoutMs: 200,
        onMatch() {
          throw new Error("Should not be called");
        },
        signal,
      }),
    WindowCorrelationError,
    'Timed out after 100ms waiting for a response for a prior request:\n{"id":1}',
  );

  assertEquals(error.abortionSource, "requests_completed");
  assertEquals(error.uncorrelated, [{ id: 1 }]);
});

Deno.test("Maximum window size enforcement", async () => {
  let inflightCount = 0;
  const requests = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    while (true) {
      yield { id: Math.random() };
    }
  }());
  const responses = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    yield await new Promise<TestElement>(() => {});
  }());
  const sendRequest = () => {
    inflightCount++;
    assertEquals(inflightCount <= 2, true);
    return Promise.resolve();
  };
  const abortController = new AbortController();
  const signal = abortController.signal;

  const testPromise = correlateWindow({
    windowSize: 2,
    responseTimeoutMs: 500,
    requests,
    responses,
    sendRequest,
    extractRequestId,
    extractResponseId,
    completionTimeoutMs: 0,
    onMatch() {
      throw new Error("Should not be called");
    },
    signal,
  });

  await delay(200);
  abortController.abort();

  const error = await assertRejects(
    () => testPromise,
    WindowCorrelationError,
    "Timed out after 500ms waiting for a response for a prior request",
  );

  assertEquals(error.abortionSource, "external_signal");
});

Deno.test("Response ID mismatch", async () => {
  const lock = deferred();
  const requests = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    for (let i = 1; i < 10; i++) {
      yield { id: i };
      if (i === 1) {
        lock.resolve();
      }
    }
  }());
  const responses = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    await lock;
    yield { id: 20 };
  }());
  const sendRequest = async () => {};
  const signal = new AbortController().signal;

  const error = await assertRejects(
    () =>
      correlateWindow({
        windowSize: 1,
        responseTimeoutMs: 1000,
        requests,
        responses,
        sendRequest,
        extractRequestId,
        extractResponseId,
        completionTimeoutMs: 0,
        onMatch() {
          throw new Error("Should not be called");
        },
        signal,
      }),
    WindowCorrelationError,
    `Received a response with an unrecognized id=20: {"id":20}`,
  );

  assertEquals(error.abortionSource, "responses_failed");
});

Deno.test("Abort operation", async () => {
  const requests = AsyncReadonlyQueue.fromAsyncGenerator(async function* () {
    for (let i = 1; i < 10; i++) {
      yield { id: i };
    }
  }());

  const responses = new AsyncQueue<TestElement>();

  const sendRequest = async () => {};

  const abortController = new AbortController();
  const signal = abortController.signal;

  let matchCallCount = 0;
  const testPromise = correlateWindow({
    windowSize: 1,
    responseTimeoutMs: 10000,
    requests,
    responses,
    sendRequest,
    extractRequestId,
    extractResponseId,
    completionTimeoutMs: 0,
    onMatch() {
      matchCallCount++;
    },
    signal,
  });

  await delay(100);
  await responses.enqueue({ id: 1 });
  await delay(100);

  abortController.abort(new Error("Forced"));
  const error = await assertRejects(() => testPromise, WindowCorrelationError, "Forced");
  assertEquals(error.abortionSource, "external_signal");
  assertEquals(error.uncorrelated, [{
    id: 2,
  }]);
  assertEquals(matchCallCount, 1);
});

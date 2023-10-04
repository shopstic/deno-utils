import { combineAbortSignals, deferred, delay, memoizePromise, promiseAllSettledTogether } from "./async_utils.ts";
import { assertEquals, assertRejects } from "./deps/std_testing.ts";

Deno.test("promiseAllSettledTogether() no promises", async () => {
  const result = await promiseAllSettledTogether({}, 1000);
  assertEquals(result, {});
});

Deno.test("promiseAllSettledTogether() all promises fulfill within time", async () => {
  const p1 = Promise.resolve("p1");
  const p2 = delay(200).then(() => "p2");

  const result = await promiseAllSettledTogether({ p1, p2 }, 500);

  assertEquals(result, {
    p1: { status: "fulfilled", value: "p1" },
    p2: { status: "fulfilled", value: "p2" },
  });
});

Deno.test("promiseAllSettledTogether() all promises reject within time", async () => {
  const p1 = Promise.reject("error1");
  const p2 = delay(200).then(() => Promise.reject("error2"));

  const result = await promiseAllSettledTogether({ p1, p2 }, 500);

  assertEquals(result, {
    p1: { status: "rejected", reason: "error1" },
    p2: { status: "rejected", reason: "error2" },
  });
});

Deno.test("promiseAllSettledTogether() mix of fulfilled and rejected promises within time", async () => {
  const p1 = Promise.resolve("p1");
  const p2 = Promise.reject("error2");

  const result = await promiseAllSettledTogether({ p1, p2 }, 500);

  assertEquals(result, {
    p1: { status: "fulfilled", value: "p1" },
    p2: { status: "rejected", reason: "error2" },
  });
});

Deno.test("promiseAllSettledTogether() timeout occurs", async () => {
  const p1 = delay(0).then(() => "p1");
  const p2 = delay(100).then(() => Promise.reject("error2"));
  const p3 = delay(300).then(() => Promise.reject("error3"));
  const p4 = delay(400).then(() => "p4");

  await assertRejects(
    () => promiseAllSettledTogether({ p1, p2, p3, p4 }, 200),
    Error,
    "The following promises did not complete within 200ms from the first settled promise: p3, p4",
  );

  await Promise.allSettled([p3, p4]);
});

Deno.test("combineAbortSignals()", async () => {
  const ac1 = new AbortController();
  const ac2 = new AbortController();

  const { signal } = combineAbortSignals(ac1.signal, ac2.signal);
  const abortedPromise = deferred<void>();

  signal.addEventListener("abort", () => {
    abortedPromise.resolve();
  });

  ac2.abort();
  await abortedPromise;
});

Deno.test("memoizePromise()", async () => {
  let callCount = 0;
  const factory = () => {
    callCount++;
    return Promise.resolve(123);
  };

  const memoized = memoizePromise(factory);

  assertEquals(await memoized(), 123);
  assertEquals(await memoized(), 123);
  assertEquals(callCount, 1);
});

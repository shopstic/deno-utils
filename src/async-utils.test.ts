import { deferred } from "https://deno.land/std@0.92.0/async/deferred.ts";
import {
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { memoizePromise, timeoutPromise } from "./async-utils.ts";

Deno.test("timeoutPromise should time out", async () => {
  const promise = deferred<number>();

  await assertThrowsAsync(() => {
    return timeoutPromise(
      promise,
      1,
      () => new Error("Test timeoutPromise`"),
    );
  });

  promise.resolve(1);
  await promise;
});

Deno.test("timeoutPromise should not time out", async () => {
  const promise = deferred<number>();

  const promiseWithTimeout = timeoutPromise(
    promise,
    1000,
    () => new Error("Test timeoutPromise`"),
  );

  promise.resolve(123);

  assertEquals(await promiseWithTimeout, 123);
});

Deno.test("memoizePromise", async () => {
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

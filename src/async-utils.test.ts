import { deferred } from "https://deno.land/std@0.92.0/async/deferred.ts";
import {
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";
import * as Async from "./async-utils.ts";

Deno.test("Async.timeout should time out", async () => {
  const promise = deferred<number>();

  await assertThrowsAsync(() => {
    return Async.timeout(
      promise,
      1,
      () => new Error("Test timeout`"),
    );
  });

  promise.resolve(1);
  await promise;
});

Deno.test("Async.timeout should not time out", async () => {
  const promise = deferred<number>();

  const promiseWithTimeout = Async.timeout(
    promise,
    1000,
    () => new Error("Test timeout`"),
  );

  promise.resolve(123);

  assertEquals(await promiseWithTimeout, 123);
});

Deno.test("Async.memoize", async () => {
  let callCount = 0;
  const factory = () => {
    callCount++;
    return Promise.resolve(123);
  };

  const memoized = Async.memoize(factory);

  assertEquals(await memoized(), 123);
  assertEquals(await memoized(), 123);
  assertEquals(callCount, 1);
});

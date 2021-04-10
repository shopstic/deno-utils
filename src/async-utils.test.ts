import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";
import * as Async from "./async-utils.ts";

Deno.test("Async.delay", async () => {
  const start = Date.now();
  await Async.delay(100);
  assert(Date.now() - start >= 100);
});

Deno.test("Async.timeout should time out", async () => {
  const controller = Async.control<number>();

  await assertThrowsAsync(() => {
    return Async.timeout(
      controller.promise,
      1,
      () => new Error("Test timeout`"),
    );
  });

  controller.resolve(1);
  await controller.promise;
});

Deno.test("Async.timeout should not time out", async () => {
  const controller = Async.control<number>();

  const promise = Async.timeout(
    controller.promise,
    1000,
    () => new Error("Test timeout`"),
  );

  controller.resolve(123);

  assertEquals(await promise, 123);
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

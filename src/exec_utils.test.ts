import { assertEquals, assertRejects } from "./deps/std_testing.ts";
import { captureExec, inheritExec } from "./exec_utils.ts";

Deno.test("captureExec", async () => {
  const result = await captureExec({
    run: {
      cmd: ["bash"],
    },
    stdin: "printf '123'",
  });
  assertEquals(result, "123");
});

Deno.test("inheritExec ok", async () => {
  await inheritExec({
    run: {
      cmd: ["bash"],
    },
    stdin: "exit 0",
  });
});

Deno.test("inheritExec error", async () => {
  await assertRejects(() =>
    inheritExec({
      run: {
        cmd: ["bash"],
      },
      stdin: "exit 123",
    })
  );
});

Deno.test("inheritExec abort after a timeout", async () => {
  const abortController = new AbortController();
  const promise = inheritExec({
    run: {
      cmd: [
        "bash",
        "-c",
        "trap exit TERM; while true; do echo 'still running...'; sleep .5; done",
      ],
    },
    abortSignal: abortController.signal,
  });

  setTimeout(() => {
    abortController.abort();
  }, 2000);

  await promise;
});

Deno.test("inheritExec abort before running", async () => {
  const abortController = new AbortController();
  abortController.abort();

  await assertRejects(() =>
    inheritExec({
      run: {
        cmd: [
          "bash",
          "-c",
          "trap exit TERM; while true; do echo 'still running...'; sleep .5; done",
        ],
      },
      abortSignal: abortController.signal,
    })
  );
});

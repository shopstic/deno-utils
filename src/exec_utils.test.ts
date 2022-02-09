import { assertEquals, assertRejects } from "./deps/std_testing.ts";
import { captureExec, inheritExec } from "./exec_utils.ts";

Deno.test("captureExec", async () => {
  const result = await captureExec({
    cmd: ["bash"],
    stdin: {
      pipe: "echo >&2 'some stderr output'; printf '123'",
    },
    stderr: {
      inherit: true,
    },
  });
  assertEquals(result, "123");
});

Deno.test("inheritExec ok", async () => {
  await inheritExec({
    cmd: ["bash"],
    stdin: {
      pipe: "echo >&2 'some stderr output that should be ignore'; exit 0",
    },
    stderr: {
      ignore: true,
    },
  });
});

Deno.test("inheritExec error", async () => {
  await assertRejects(() =>
    inheritExec({
      cmd: ["bash"],
      stdin: {
        pipe: "exit 123",
      },
    })
  );
});

Deno.test("captureExec abort after a timeout", async () => {
  const abortController = new AbortController();
  const promise = captureExec({
    cmd: [
      "bash",
      "-c",
      "trap exit TERM; while true; do echo 'still running...'; >&2 echo 'stderr still running...'; sleep 1; done",
    ],
    stderr: {
      inherit: true,
    },
    abortSignal: abortController.signal,
  });

  setTimeout(() => {
    abortController.abort();
  }, 2000);

  await assertRejects(() => promise);
});

Deno.test("inheritExec abort after a timeout", async () => {
  const abortController = new AbortController();
  const promise = inheritExec({
    cmd: [
      "bash",
      "-c",
      "trap exit TERM; while true; do echo 'still running...'; >&2 echo 'stderr still running...'; sleep 1; done",
    ],
    stdout: {
      bufferLinesWithTag: "[stdout tag]",
    },
    stderr: {
      inherit: true,
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
      cmd: [
        "bash",
        "-c",
        "trap exit TERM; while true; do echo 'still running...'; sleep .5; done",
      ],
      abortSignal: abortController.signal,
    })
  );
});

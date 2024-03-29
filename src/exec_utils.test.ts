import { assertEquals, assertRejects } from "./deps/std_testing.ts";
import { captureExec, inheritExec, printOutLines } from "./exec_utils.ts";

Deno.test("captureExec", async () => {
  const result = await captureExec({
    cmd: ["bash"],
    stdin: {
      pipe: "echo >&2 'some stderr output'; printf '123'",
    },
  });

  assertEquals(result, {
    out: "123",
    err: "some stderr output\n",
  });
});

Deno.test("captureExec with inherit stderr", async () => {
  const result = await captureExec({
    cmd: ["bash"],
    stdin: {
      pipe: "echo >&2 'some stderr output'; printf '123'",
    },
    stderr: {
      inherit: true,
    },
  });

  assertEquals(result, {
    out: "123",
    err: "",
  });
});

Deno.test("captureExec with stderr reader", async () => {
  const result = await captureExec({
    cmd: ["bash"],
    stdin: {
      pipe: "echo >&2 'some stderr output'; printf '123'",
    },
    stderr: {
      async read(readable) {
        const decoder = new TextDecoder();
        for await (const chunk of readable) {
          console.error(decoder.decode(chunk));
        }
        await readable.cancel();
      },
    },
  });

  assertEquals(result, {
    out: "123",
    err: "",
  });
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
    signal: abortController.signal,
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
      read: printOutLines((line) => `[stdout tag] ${line}`),
    },
    stderr: {
      inherit: true,
    },
    signal: abortController.signal,
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
      signal: abortController.signal,
    })
  );
});

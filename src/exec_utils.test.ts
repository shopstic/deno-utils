import { assertEquals, assertThrowsAsync } from "./deps/std_testing.ts";
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
  await assertThrowsAsync(() =>
    inheritExec({
      run: {
        cmd: ["bash"],
      },
      stdin: "exit 123",
    })
  );
});

import { assertEquals } from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { Type } from "https://raw.githubusercontent.com/shopstic/typebox/0.16.3/src/typebox.ts";
import { CliProgram, createCliAction, ExitCode } from "./cli-utils.ts";

Deno.test({
  name: "test CliProgram",
  fn: async () => {
    const run = createCliAction(
      Type.Object({
        hostname: Type.Optional(Type.String({ minLength: 1 })),
        port: Type.Optional(Type.Number({ minimum: 0, maximum: 65535 })),
        proxyTarget: Type.String({ format: "uri" }),
      }),
      (
        {
          hostname,
          port,
          proxyTarget,
        },
      ) => {
        assertEquals(hostname, "foo");
        assertEquals(port, 12345);
        assertEquals(proxyTarget, "http://foo.bar");

        return Promise.resolve(ExitCode.Zero);
      },
    );

    await new CliProgram((exitCode) => {
      assertEquals(exitCode.code, 0);
    })
      .addAction("run", run)
      .run([
        "run",
        "--hostname",
        "foo",
        "--port",
        "12345",
        "--proxyTarget",
        "http://foo.bar",
      ]);
  },
});

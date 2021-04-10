import { CliProgram, createCliAction, ExitCode } from "./cli-utils.ts";
import { assertEquals } from "./deps/std-testing.ts";
import { Type } from "./deps/typebox.ts";

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

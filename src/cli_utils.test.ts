import { CliProgram, createCliAction, ExitCode } from "./cli_utils.ts";
import { assertEquals } from "./deps/std_testing.ts";
import { Type } from "./deps/typebox.ts";

Deno.test({
  name: "test CliProgram",
  fn: async () => {
    const run = createCliAction(
      Type.Object({
        appId: Type.String({ minLength: 1 }),
        hostname: Type.Optional(Type.String({ minLength: 1, examples: ["my.hostname.com"] })),
        port: Type.Optional(Type.Number({ minimum: 0, maximum: 65535, examples: [8080] })),
        proxyTarget: Type.String({ format: "uri" }),
        maybeArray1: Type.Union([Type.Array(Type.String()), Type.String()]),
        maybeArray2: Type.Union([Type.Array(Type.String()), Type.String()]),
      }),
      (
        {
          appId,
          hostname,
          port,
          proxyTarget,
          maybeArray1,
          maybeArray2,
        },
        unparsedArgs,
      ) => {
        assertEquals(appId, "12345");
        assertEquals(hostname, "foo");
        assertEquals(port, 12345);
        assertEquals(proxyTarget, "http://foo.bar");
        assertEquals(unparsedArgs, ["some", "remaining", "args"]);
        assertEquals(maybeArray1, "1234");
        assertEquals(maybeArray2, ["one", "two", "three"]);

        return Promise.resolve(ExitCode.Zero);
      },
    );

    await new CliProgram((exitCode) => {
      assertEquals(exitCode.code, 0);
    })
      .addAction("run", run)
      .run([
        "run",
        "--someOther",
        "12345",
        "--appId",
        "12345",
        "--hostname",
        "foo",
        "--port",
        "12345",
        "--proxyTarget",
        "http://foo.bar",
        "--maybeArray1",
        "1234",
        "--maybeArray2",
        "one",
        "--maybeArray2",
        "two",
        "--maybeArray2",
        "three",
        "--",
        "some",
        "remaining",
        "args",
      ]);
  },
});

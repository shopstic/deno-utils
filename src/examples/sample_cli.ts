import { CliProgram, createCliAction, ExitCode } from "../cli_utils.ts";
import { Type } from "../deps/typebox.ts";
import { delay } from "../async_utils.ts";

enum FooBarEnum {
  FOO = "FOO",
  BAR = "BAR",
}

const foo = createCliAction(
  Type.Object({
    uri: Type.String({
      format: "uri",
      description: "Must be a valid URI",
      examples: ["http://foo.bar/baz"],
    }),
    source: Type.Union([Type.Array(Type.String()), Type.String()], {
      description: "Can be repeated multiple times",
      examples: ["/path/to/source"],
    }),
    destination: Type.Optional(Type.String({
      description: "This one has a default value",
      default: "/foo/bar",
    })),
    enum1: Type.Union([
      Type.Literal("one"),
      Type.Literal(false),
      Type.Literal(3),
    ], {
      description: "Union of literals",
      examples: ["one"],
    }),
    enum2: Type.Enum(FooBarEnum, {
      description: "Enum",
      examples: [FooBarEnum.BAR],
    }),
  }),
  async (args) => {
    console.log("Got args", args);
    console.log("Will exit in 1 second");
    await delay(1000);
    return ExitCode.Zero;
  },
);

await new CliProgram()
  .addAction("foo", foo)
  .run(Deno.args);

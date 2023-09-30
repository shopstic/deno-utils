import { CliProgram, createCliAction, ExitCode } from "../cli_utils.ts";
import { Type } from "../deps/typebox.ts";
import { deferred, delay } from "../async_utils.ts";
import { resolve } from "https://esm.sh/v132/uri-js@4.4.1/dist/es5/uri.all.js";

enum FooBarEnum {
  FOO = "FOO",
  BAR = "BAR",
}

const foo = createCliAction(
  Type.Object({
    url: Type.String({
      format: "uri",
      description: "Must be a valid URI",
      examples: ["http://foo.bar/baz"],
    }),
    port: Type.Integer({
      minimum: 1,
      maximum: 65535,
      examples: [9876],
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

const bar = createCliAction(
  Type.Object({
    name: Type.String({
      description: "The name of the JDK to add to the table",
      examples: ["my-app-jdk"],
    }),
    jdkPath: Type.String({
      description: "Absolute path to a JDK home to add to the table",
      examples: ["/path/to/jdk"],
    }),
    jdkTableXmlPath: Type.String({
      description: "Absolute path to Intellij's jdk.table.xml file",
      examples: [
        "/Users/foo/Library/Application Support/JetBrains/IntelliJIdea2021.2/options/jdk.table.xml",
      ],
    }),
    inPlace: Type.Optional(Type.Boolean({
      description: "Whether to patch the XML file in-place",
      examples: [false],
      default: false,
    })),
  }),
  async (args, _, signal) => {
    console.log("Got args", args);
    console.log("Will exit upon abort signal");

    const promise = new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => {
        console.log("Got abort signal");
        resolve();
      }, { once: true });
    });

    const timer = setInterval(() => {
      console.log("Still waiting...");
    }, 1000);

    await promise;
    clearInterval(timer);

    console.log("OK! Going to exit in 1 second");
    await delay(2000);
    return ExitCode.One;
  },
);

await new CliProgram()
  .addAction("foo", foo)
  .addAction("bar", bar)
  .run(Deno.args);

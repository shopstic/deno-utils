import { parseCliArgs } from "./deps/std-flags.ts";
import { Static, TObject, TProperties, TSchema } from "./deps/typebox.ts";
import { validate } from "./validation-utils.ts";

interface CliAction<T extends TProperties> {
  args: TObject<T>;
  action: (args: Static<TObject<T>>) => Promise<ExitCode>;
}

export function createCliAction<T extends TProperties>(
  args: TObject<T>,
  action: (a: Static<TObject<T>>) => Promise<ExitCode>,
): CliAction<T> {
  return {
    args,
    action,
  };
}

export class ExitCode {
  code: number;
  static of(code: number) {
    return new ExitCode(code);
  }
  static Zero = new ExitCode(0);
  static One = new ExitCode(1);
  constructor(code: number) {
    this.code = code;
  }
}

async function waitForExitSignal(): Promise<ExitCode> {
  await Promise.race([
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    Deno.signal(Deno.Signal.SIGINT),
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    Deno.signal(Deno.Signal.SIGTERM),
  ]);

  return new ExitCode(123);
}

function jsonSchemaToTypeName(schema: TSchema): string {
  if (schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  if (schema.anyOf !== undefined) {
    // deno-lint-ignore no-explicit-any
    return schema.anyOf.map((t: any) => jsonSchemaToTypeName(t)).join(" | ");
  }

  if (schema.enum !== undefined) {
    // deno-lint-ignore no-explicit-any
    return schema.enum.map((v: any) => JSON.stringify(v)).join(" | ");
  }

  if (schema.type !== undefined) {
    if (schema.type === "array") {
      if (Array.isArray(schema.items)) { // tuple
        return `[${schema.items.map(jsonSchemaToTypeName).join(", ")}]`;
      }

      return `${jsonSchemaToTypeName(schema.items)}...`;
    }

    return schema.type;
  }

  return "unknown";
}

export class CliProgram {
  // deno-lint-ignore no-explicit-any
  private actions = new Map<string, CliAction<any>>();

  onExit(exitCode: ExitCode) {
    Deno.exit(exitCode.code);
  }

  constructor(onExit?: (code: ExitCode) => void) {
    if (onExit) {
      this.onExit = onExit;
    }
  }

  addAction<T extends TProperties>(
    command: string,
    action: CliAction<T>,
  ): this {
    this.actions.set(command, action);
    return this;
  }

  printProgramError(error: string): void {
    const supportedCommands = Array.from(this.actions.keys());

    console.error(
      `[Error] ${error}

SUPPORTED COMMANDS:
${supportedCommands.map((cmd) => `  - ${cmd}`).join("\n")}`,
    );
  }

  printActionError<P extends TProperties>(
    error: string,
    command: string,
    action: CliAction<P>,
  ): void {
    const args = action.args;
    const requiredArgSet = new Set(args.required);
    const props = Object.entries(args.properties);

    const renderProps = props.map(([name, prop]) => {
      const required = requiredArgSet.has(name);
      const defaultValue = JSON.stringify(prop.default);
      const argument = (prop.default !== undefined)
        ? `--${name}=${defaultValue}`
        : (
          required ? `--${name}` : `[--${name}]`
        );

      return {
        name,
        argument,
        required,
        typeName: `(${jsonSchemaToTypeName(prop)})`,
        description: prop.description ?? prop.title ?? "",
        examples: (prop.examples && prop.examples[0]) ?? defaultValue ?? "...",
      };
    });

    const usageArgs = renderProps.map(({ name, required, examples }) =>
      `${required ? "" : "["}--${name}=${examples}${required ? "" : "]"}`
    );

    const maxArgumentLength = renderProps.reduce(
      (max, { argument }) => Math.max(max, argument.length),
      0,
    );

    const maxTypeNameLength = renderProps.reduce(
      (max, { typeName }) => Math.max(max, typeName.length),
      0,
    );

    const actionHelp = renderProps
      .map(({ argument, typeName, description }) => {
        return `    ${argument.padEnd(maxArgumentLength)} ${
          typeName.padEnd(maxTypeNameLength)
        } ${description}`;
      })
      .join("\n");

    console.error(
      `[Error] ${error}

USAGE EXAMPLE:

    ${command} ${usageArgs.join(" ")}

ARGUMENTS:

${actionHelp}`,
    );
  }

  async run(rawArgs: string[]) {
    const { _, ...args } = parseCliArgs(rawArgs);

    if (_.length !== 1) {
      if (_.length === 0) {
        this.printProgramError("No command provided");
      } else {
        this.printProgramError(`Invalid commands: ${_.join(" ")}`);
      }
      return Deno.exit(1);
    }

    const command = String(_[0]);
    const action = this.actions.get(command);

    if (!action) {
      this.printProgramError(`Unknown command: ${command}`);
      return Deno.exit(1);
    }

    const validationResult = validate(action.args, args, {
      coerceTypes: true,
      strict: "log",
      allErrors: true,
    });

    if (validationResult.isSuccess) {
      const exitCode = await Promise.race([
        action.action(validationResult.value),
        waitForExitSignal(),
      ]);

      this.onExit(exitCode);
    } else {
      this.printActionError(
        `Invalid arguments for command: ${command}\n${
          validationResult
            .errorsToString({
              separator: "\n",
              dataVar: "    -",
            })
            .replaceAll("property", "argument")
            .replaceAll("    -/", "    - /")
        }`,
        command,
        action,
      );
      this.onExit(ExitCode.One);
    }
  }
}

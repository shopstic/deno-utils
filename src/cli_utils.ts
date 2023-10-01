import { groupBy } from "./deps/std_collections.ts";
import { parseCliArgs } from "./deps/std_flags.ts";
import { Static, TObject, TProperties, TSchema, TypeCheck, TypeCompiler, TypeGuard, Value } from "./deps/typebox.ts";

interface CliAction<T extends TProperties> {
  argsSchema: TObject<T>;
  argsCheck: TypeCheck<TObject<T>>;
  action: (
    args: Static<TObject<T>>,
    unparsedArgs: string[],
    abortSignal: AbortSignal,
  ) => Promise<ExitCode>;
  renderUsage?: (command: string, args: string[]) => string;
}

export function createCliAction<
  T extends TProperties,
>(
  argsSchema: TObject<T>,
  action: (
    args: Static<TObject<T>>,
    unparsed: string[],
    abortSignal: AbortSignal,
  ) => Promise<ExitCode>,
  renderUsage?: (command: string, args: string[]) => string,
): CliAction<T> {
  return {
    argsSchema,
    argsCheck: TypeCompiler.Compile(argsSchema),
    action,
    renderUsage,
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

function jsonSchemaToTypeName(schema: TSchema): string {
  if (schema.const) {
    return JSON.stringify(schema.const);
  }

  if (TypeGuard.TUnion(schema)) {
    return schema.anyOf.map((t) => jsonSchemaToTypeName(t)).join(" | ");
  }

  if (TypeGuard.TTuple(schema)) {
    if (Array.isArray(schema.items)) {
      return `[${schema.items.map(jsonSchemaToTypeName).join(", ")}]`;
    }

    if (schema.items) {
      return jsonSchemaToTypeName(schema.items);
    }
  }

  if (TypeGuard.TArray(schema)) {
    return `${jsonSchemaToTypeName(schema.items)}...`;
  }

  if (schema.type) {
    return schema.type;
  }

  return "unknown";
}

export class CliProgram {
  private actions = new Map<string, CliAction<TProperties>>();

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
    // deno-lint-ignore no-explicit-any
    this.actions.set(command, action as any);
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
    const args = action.argsSchema;
    const requiredArgSet = new Set(args.required);
    const props = Object.entries(args.properties);

    const renderProps = props.map(([name, prop]) => {
      const required = requiredArgSet.has(name);
      const defaultValue = JSON.stringify(prop.default);
      const argument = (prop.default !== undefined) ? `--${name}=${defaultValue}` : (
        required ? `--${name}` : `[--${name}]`
      );

      return {
        name,
        argument,
        required,
        typeName: `(${jsonSchemaToTypeName(prop)})`,
        description: prop.description ?? prop.title ?? "",
        examples: (prop.examples && JSON.stringify(prop.examples[0])) ??
          defaultValue ?? "...",
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
        return `    ${argument.padEnd(maxArgumentLength)} ${typeName.padEnd(maxTypeNameLength)} ${description}`;
      })
      .join("\n");

    const renderUsage = action.renderUsage ?? ((c, a) => `${c} ${a.join(" ")}`);

    console.error(
      `[Error] ${error}

USAGE EXAMPLE:

    ${renderUsage(command, usageArgs)}

ARGUMENTS:

${actionHelp}`,
    );
  }

  async run(rawArgs: string[]) {
    const parsed = parseCliArgs(rawArgs, {
      "--": true,
    });

    const { _, ...args } = parsed;
    const unparsedArgs: string[] = (Array.isArray(parsed["--"])) ? parsed["--"] : [];

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

    const transformedArgs = Object.fromEntries(
      Object.entries(args).map(([key, value]) => {
        const schema = action.argsSchema.properties[key];

        if (schema) {
          return [key, Value.Convert(schema, value)];
        }

        return [key, value];
      }),
    );

    if (action.argsCheck.Check(transformedArgs)) {
      const decodedArgs = action.argsCheck.Decode(transformedArgs);
      const abortController = new AbortController();
      const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];

      const onSignal = () => {
        abortController.abort();
      };

      signals.forEach((signal) => {
        Deno.addSignalListener(signal, onSignal);
      });

      try {
        const exitCode = await action.action(
          decodedArgs,
          unparsedArgs,
          abortController.signal,
        );
        this.onExit(exitCode);
      } catch (e) {
        console.error("Unhandled error", JSON.stringify(e, null, 2));
        throw e;
      } finally {
        signals.forEach((signal) => {
          Deno.removeSignalListener(signal, onSignal);
        });
      }
    } else {
      const groupedErrors = groupBy(action.argsCheck.Errors(args), (e) => e.path);

      this.printActionError(
        `Invalid arguments for command: ${command}\n${
          Object.values(groupedErrors).map((errors) =>
            ` > ${errors![0].path.replace(/^\//, "")}:\n${errors!.map((e) => `    - ${e.message}`).join("\n")}`
          ).join("\n")
        }`,
        command,
        action,
      );
      this.onExit(ExitCode.One);
    }
  }
}

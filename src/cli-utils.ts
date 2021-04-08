import {
  Static,
  TObject,
  TProperties,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.16.3/src/typebox.ts";
import { parse as parseCliArgs } from "https://deno.land/std@0.92.0/flags/mod.ts";
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

  async run(rawArgs: string[]) {
    const supportedCommands = Array.from(this.actions.keys());
    const { _, ...args } = parseCliArgs(rawArgs);

    if (_.length !== 1) {
      if (_.length === 0) {
        console.error("No command provided");
      } else {
        console.error(`Invalid commands:`, _);
      }
      console.error(`Supported commands are: ${supportedCommands.join(", ")}`);
      return Deno.exit(1);
    }

    const command = _[0];
    const action = this.actions.get(String(command));

    if (!action) {
      console.error(
        `Unknown command: "${command}"`,
      );
      console.error(`Supported commands are: ${supportedCommands.join(", ")}`);
      return Deno.exit(1);
    }

    const validationResult = validate(action.args, args, {
      coerceTypes: true,
      strict: "log",
    });

    if (validationResult.isSuccess) {
      const exitCode = await Promise.race([
        action.action(validationResult.value),
        waitForExitSignal(),
      ]);

      this.onExit(exitCode);
    } else {
      console.error("Invalid command arguments");
      console.error(validationResult.errors);
      this.onExit(ExitCode.One);
    }
  }
}

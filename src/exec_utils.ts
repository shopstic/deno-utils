import { copy, readLines, writeAll } from "./deps/std_io.ts";

const ansiPattern = [
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
  "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
].join("|");

const ansiRegex = new RegExp(ansiPattern, "g");

export function stripAnsi(s: string): string {
  return s.replace(ansiRegex, "").split("").filter((x) => {
    const n = x.charCodeAt(0);
    return 31 < n && 127 > n;
  }).join("");
}

export function printOutLines(
  mapper: (line: string) => string = (line) => line,
) {
  return async function (reader: Deno.Reader & Deno.Closer) {
    for await (const line of readLines(reader)) {
      console.log(mapper(line));
    }
  };
}

export function printErrLines(
  mapper: (line: string) => string = (line) => line,
) {
  return async function (reader: Deno.Reader & Deno.Closer) {
    for await (const line of readLines(reader)) {
      console.error(mapper(line));
    }
  };
}

export class DenoRunError extends Error {
  public name: string;
  public code?: string;

  constructor(
    error: Error,
    public command: Deno.RunOptions["cmd"],
  ) {
    super(error.message);
    this.name = error.name;
    this.stack = error.stack;
    // deno-lint-ignore no-explicit-any
    this.code = ("code" in error) ? (error as any).code : undefined;
  }
}

export class NonZeroExitError extends Error {
  constructor(
    message: string,
    public command: Deno.RunOptions["cmd"],
    public exitCode: number,
    public output?: {
      out: string;
      err: string;
    },
  ) {
    super(message);
    this.name = "NonZeroExitError";
  }
}

export class ExecAbortedError extends Error {
  constructor(
    message: string,
    public command: Deno.RunOptions["cmd"],
    public output?: {
      out: string;
      err: string;
    },
  ) {
    super(message);
    this.name = "AbortedError";
  }
}

export type StdOutputBehavior = {
  read: (reader: Deno.Reader & Deno.Closer) => Promise<void>;
} | {
  inherit: true;
} | {
  ignore: true;
};

export type StdInputBehavior = {
  pipe: string | Deno.Reader;
} | {
  inherit: true;
} | {
  ignore: true;
};

function exhaustiveMatchingGuard(_: never): never {
  throw new Error("Non exhaustive matching");
}

function createStdoutOpt(
  config: StdOutputBehavior,
): "inherit" | "null" | "piped" {
  if ("ignore" in config) {
    return "null";
  }

  if ("inherit" in config) {
    return "inherit";
  }

  if ("read" in config) {
    return "piped";
  }

  return exhaustiveMatchingGuard(config);
}

function createStdinOpt(
  config: StdInputBehavior,
): "inherit" | "null" | "piped" {
  if ("ignore" in config) {
    return "null";
  }

  if ("inherit" in config) {
    return "inherit";
  }

  if ("pipe" in config) {
    return "piped";
  }

  return exhaustiveMatchingGuard(config);
}

async function _inheritExec(
  {
    abortSignal,
    stdin = {
      ignore: true,
    },
    stdout = { inherit: true },
    stderr = { inherit: true },
    ...run
  }: Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin"> & {
    abortSignal?: AbortSignal;
    stdin?: StdInputBehavior;
    stdout?: StdOutputBehavior;
    stderr?: StdOutputBehavior;
  },
): Promise<number> {
  if (abortSignal?.aborted) {
    return 143;
  }

  const child = (() => {
    try {
      return Deno.run({
        ...run,
        stdin: createStdinOpt(stdin),
        stdout: createStdoutOpt(stdout),
        stderr: createStdoutOpt(stderr),
      });
    } catch (e) {
      throw new DenoRunError(e, run.cmd);
    }
  })();

  const onAbort = () => {
    child.kill("SIGTERM");
  };

  try {
    if (abortSignal) {
      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener("abort", onAbort);
      }
    }

    const stdinPromise = (() => {
      if ("ignore" in stdin || "inherit" in stdin) {
        return Promise.resolve();
      } else {
        if (typeof stdin.pipe === "string") {
          return writeAll(child.stdin!, new TextEncoder().encode(stdin.pipe))
            .finally(() => child.stdin!.close());
        } else {
          return copy(stdin.pipe, child.stdin!)
            .then(() => {})
            .finally(() => child.stdin!.close());
        }
      }
    })();

    const stdoutPromise = ("ignore" in stdout || "inherit" in stdout) ? Promise.resolve() : stdout.read(child.stdout!);

    const stderrPromise = ("ignore" in stderr || "inherit" in stderr) ? Promise.resolve() : stderr.read(child.stderr!);

    await Promise.all([
      stdinPromise,
      stdoutPromise,
      stderrPromise,
    ]);

    const { code } = await child.status();

    return code;
  } finally {
    abortSignal?.removeEventListener("abort", onAbort);

    child.stdout?.close();
    child.stderr?.close();
    child.close();
  }
}

export function captureExitCodeExec(
  args: Parameters<typeof _inheritExec>[0],
): Promise<number> {
  return _inheritExec(args);
}

export async function inheritExec(
  args: Parameters<typeof _inheritExec>[0],
): Promise<void> {
  const code = await _inheritExec(args);

  if (code !== 0) {
    throw new NonZeroExitError(
      `Command return non-zero status of: ${code}`,
      args.cmd,
      code,
    );
  }
}

export async function captureExec(
  {
    stdin = { ignore: true },
    stderr = { capture: true },
    abortSignal,
    ...run
  }:
    & Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin">
    & {
      abortSignal?: AbortSignal;
      stdin?: StdInputBehavior;
      stderr?: StdOutputBehavior | {
        capture: true;
      };
    },
): Promise<{ out: string; err: string }> {
  const child = (() => {
    try {
      return Deno.run({
        ...run,
        stdin: createStdinOpt(stdin),
        stdout: "piped",
        stderr: ("capture" in stderr) ? "piped" : createStdoutOpt(stderr),
      });
    } catch (e) {
      throw new DenoRunError(e, run.cmd);
    }
  })();

  const onAbort = () => {
    child.kill("SIGTERM");
  };

  try {
    if (abortSignal) {
      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener("abort", onAbort);
      }
    }

    const stdinPromise = (() => {
      if ("ignore" in stdin || "inherit" in stdin) {
        return Promise.resolve();
      } else {
        if (typeof stdin.pipe === "string") {
          return writeAll(child.stdin!, new TextEncoder().encode(stdin.pipe))
            .finally(() => child.stdin!.close());
        } else {
          return copy(stdin.pipe, child.stdin!)
            .then(() => {})
            .finally(() => child.stdin!.close());
        }
      }
    })();

    const stderrPromise = (async () => {
      if ("ignore" in stderr || "inherit" in stderr) {
        return;
      } else if ("capture" in stderr) {
        return child.stderrOutput();
      } else {
        await stderr.read(child.stderr!);
        return;
      }
    })();

    const stdoutPromise = child.output();
    await Promise.all([stdinPromise, stderrPromise]);

    const { code } = await child.status();
    const capturedStdout = new TextDecoder().decode(await stdoutPromise);
    const capturedStderr = ("capture" in stderr) ? new TextDecoder().decode(await stderrPromise) : "";
    const captured = {
      out: capturedStdout,
      err: capturedStderr,
    };

    if (code !== 0) {
      throw new NonZeroExitError(
        `Command return non-zero status of: ${code}`,
        run.cmd,
        code,
        captured,
      );
    } else if (abortSignal?.aborted) {
      throw new ExecAbortedError(
        `Command execution was aborted`,
        run.cmd,
        captured,
      );
    }

    return captured;
  } finally {
    abortSignal?.removeEventListener("abort", onAbort);
    if ("bufferLines" in stderr) {
      child.stderr?.close();
    }
    child.close();
  }
}

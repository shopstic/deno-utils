import { copy, readAll, readLines, writeAll } from "./deps/std_io.ts";
import { readerFromStreamReader, writerFromStreamWriter } from "./deps/std_streams.ts";
import { assert } from "./deps/std_testing.ts";

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
  return async function (readable: ReadableStream<Uint8Array>) {
    for await (const line of readLines(readerFromStreamReader(readable.getReader()))) {
      console.log(mapper(line));
    }
  };
}

export function printErrLines(
  mapper: (line: string) => string = (line) => line,
) {
  return async function (readable: ReadableStream<Uint8Array>) {
    for await (const line of readLines(readerFromStreamReader(readable.getReader()))) {
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
  read: (reader: ReadableStream<Uint8Array>) => Promise<void>;
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
    cmd,
    signal,
    stdin = {
      ignore: true,
    },
    stdout = { inherit: true },
    stderr = { inherit: true },
    ...run
  }: Omit<Deno.CommandOptions, "stdout" | "stderr" | "stdin" | "args"> & {
    cmd: string[];
    /** @deprecated Use signal instead. */
    abortSignal?: AbortSignal;
    stdin?: StdInputBehavior;
    stdout?: StdOutputBehavior;
    stderr?: StdOutputBehavior;
  },
): Promise<number> {
  assert(cmd.length > 0, "cmd must not be empty");

  const abortSignal = signal ?? run.abortSignal;

  if (abortSignal?.aborted) {
    return 143;
  }

  const child = (() => {
    try {
      return new Deno.Command(cmd[0], {
        ...run,
        signal: abortSignal,
        args: cmd.slice(1),
        stdin: createStdinOpt(stdin),
        stdout: createStdoutOpt(stdout),
        stderr: createStdoutOpt(stderr),
      }).spawn();
    } catch (e) {
      throw new DenoRunError(e, cmd);
    }
  })();

  try {
    const stdinPromise = (() => {
      if ("ignore" in stdin || "inherit" in stdin) {
        return Promise.resolve();
      } else {
        return (async () => {
          const stdinWriter = child.stdin.getWriter();

          try {
            if (typeof stdin.pipe === "string") {
              await writeAll(writerFromStreamWriter(stdinWriter), new TextEncoder().encode(stdin.pipe));
            } else {
              await copy(stdin.pipe, writerFromStreamWriter(stdinWriter));
            }
          } finally {
            stdinWriter.releaseLock();
            await child.stdin.close();
          }
        })();
      }
    })();

    const stdoutPromise = ("ignore" in stdout || "inherit" in stdout) ? Promise.resolve() : stdout.read(child.stdout);

    const stderrPromise = ("ignore" in stderr || "inherit" in stderr) ? Promise.resolve() : stderr.read(child.stderr);

    await Promise.all([
      stdinPromise,
      stdoutPromise,
      stderrPromise,
    ]);

    const { code } = await child.status;

    return code;
  } finally {
    try {
      child.kill();
    } catch (_) {
      // Ignore
    }
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
    signal,
    cmd,
    ...run
  }: Omit<Deno.CommandOptions, "stdout" | "stderr" | "stdin" | "args"> & {
    cmd: string[];
    /** @deprecated Use signal instead. */
    abortSignal?: AbortSignal;
    stdin?: StdInputBehavior;
    stderr?: StdOutputBehavior | {
      capture: true;
    };
  },
): Promise<{ out: string; err: string }> {
  assert(cmd.length > 0, "cmd must not be empty");

  const abortSignal = signal ?? run.abortSignal;

  if (abortSignal?.aborted) {
    return Promise.reject(
      new ExecAbortedError(
        `Command execution was aborted`,
        cmd,
      ),
    );
  }

  const child = (() => {
    try {
      return new Deno.Command(cmd[0], {
        ...run,
        signal: abortSignal,
        args: cmd.slice(1),
        stdin: createStdinOpt(stdin),
        stdout: "piped",
        stderr: ("capture" in stderr) ? "piped" : createStdoutOpt(stderr),
      }).spawn();
    } catch (e) {
      throw new DenoRunError(e, cmd);
    }
  })();

  try {
    const stdinPromise = (() => {
      if ("ignore" in stdin || "inherit" in stdin) {
        return Promise.resolve();
      } else {
        return (async () => {
          const stdinWriter = child.stdin.getWriter();

          try {
            if (typeof stdin.pipe === "string") {
              await writeAll(writerFromStreamWriter(stdinWriter), new TextEncoder().encode(stdin.pipe));
            } else {
              await copy(stdin.pipe, writerFromStreamWriter(stdinWriter));
            }
          } finally {
            stdinWriter.releaseLock();
            await child.stdin.close();
          }
        })();
      }
    })();

    const stderrPromise = (async () => {
      if ("ignore" in stderr || "inherit" in stderr) {
        return;
      } else if ("capture" in stderr) {
        return readAll(readerFromStreamReader(child.stderr.getReader()));
      } else {
        await stderr.read(child.stderr);
        return;
      }
    })();

    const stdoutPromise = readAll(readerFromStreamReader(child.stdout.getReader()));
    await Promise.all([stdinPromise, stderrPromise]);

    const { code } = await child.status;
    const capturedStdout = new TextDecoder().decode(await stdoutPromise);
    const capturedStderr = ("capture" in stderr) ? new TextDecoder().decode(await stderrPromise) : "";
    const captured = {
      out: capturedStdout,
      err: capturedStderr,
    };

    if (code !== 0) {
      throw new NonZeroExitError(
        `Command return non-zero status of: ${code}`,
        cmd,
        code,
        captured,
      );
    } else if (abortSignal?.aborted) {
      throw new ExecAbortedError(
        `Command execution was aborted`,
        cmd,
        captured,
      );
    }

    return captured;
  } finally {
    try {
      child.kill();
    } catch (_) {
      // Ignore
    }
  }
}

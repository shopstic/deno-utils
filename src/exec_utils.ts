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

export class NonZeroExitError extends Error {
  constructor(
    message: string,
    public exitCode: number,
    public output?: string,
  ) {
    super(message);
    this.name = "NonZeroExitError";
  }
}

export class AbortedError extends Error {
  constructor(
    message: string,
    public output?: string,
  ) {
    super(message);
    this.name = "AbortedError";
  }
}

export type StdOutputBehavior = {
  bufferLines: ((line: string) => string) | undefined;
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

  if ("bufferLines" in config) {
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

  const child = Deno.run({
    ...run,
    stdin: createStdinOpt(stdin),
    stdout: createStdoutOpt(stdout),
    stderr: createStdoutOpt(stderr),
  });

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

    const stdoutPromise = (async () => {
      if ("ignore" in stdout || "inherit" in stdout) {
        return;
      } else {
        const tranformLine = stdout.bufferLines ?? stripAnsi;

        for await (const line of readLines(child.stdout!)) {
          const printableLine = tranformLine(line);
          if (printableLine.length > 0) {
            console.log(printableLine);
          }
        }
      }
    })();

    const stderrPromise = (async () => {
      if ("ignore" in stderr || "inherit" in stderr) {
        return;
      } else {
        const tranformLine = stderr.bufferLines ?? stripAnsi;

        for await (const line of readLines(child.stderr!)) {
          const printableLine = tranformLine(line);
          if (printableLine.length > 0) {
            console.log(printableLine);
          }
        }
      }
    })();

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
      code,
    );
  }
}

export async function captureExec(
  {
    stdin = { ignore: true },
    stderr = { inherit: true },
    abortSignal,
    ...run
  }:
    & Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin">
    & {
      abortSignal?: AbortSignal;
      stdin?: StdInputBehavior;
      stderr?: StdOutputBehavior;
    },
): Promise<string> {
  const child = Deno.run({
    ...run,
    stdin: createStdinOpt(stdin),
    stdout: "piped",
    stderr: createStdoutOpt(stderr),
  });

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
      } else {
        const tranformLine = stderr.bufferLines ?? stripAnsi;

        for await (const line of readLines(child.stderr!)) {
          const printableLine = tranformLine(line);
          if (printableLine.length > 0) {
            console.log(printableLine);
          }
        }
      }
    })();

    const stdoutPromise = child.output();
    await Promise.all([stdinPromise, stderrPromise]);

    const { code } = await child.status();
    const captured = new TextDecoder().decode(await stdoutPromise);

    if (code !== 0) {
      throw new NonZeroExitError(
        `Command return non-zero status of: ${code}. Captured stdout: ${captured}`,
        code,
        captured,
      );
    } else if (abortSignal?.aborted) {
      throw new AbortedError(
        `Command execution was aborted. Captured stdout up to this point: ${captured}`,
        captured,
      );
    }

    return captured;
  } finally {
    abortSignal?.removeEventListener("abort", onAbort);
    child.stderr?.close();
    child.close();
  }
}

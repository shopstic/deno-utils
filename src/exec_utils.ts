import { copy, readLines, writeAll } from "./deps/std_io.ts";

const ansiPattern = [
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
  "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
].join("|");

const ansiRegex = new RegExp(ansiPattern, "g");

function stripAnsi(s: string): string {
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
  bufferLinesWithTag: string;
} | {
  bufferLines: true;
} | {
  inherit: true;
};

export type StdInputBehavior = {
  pipe: string | Deno.Reader;
} | {
  inherit: true;
};

async function _inheritExec(
  {
    abortSignal,
    stdin,
    stdout = { bufferLines: true },
    stderr = { bufferLines: true },
    ...run
  }: Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin"> & {
    abortSignal?: AbortSignal;
    stdin?: StdInputBehavior;
    stdout?: StdOutputBehavior;
    stderr?: StdOutputBehavior;
  },
): Promise<number> {
  const stdinOpt = (stdin)
    ? (("inherit" in stdin) ? "inherit" : "piped")
    : "null";
  const stdoutOpt = (stdout)
    ? (("inherit" in stdout) ? "inherit" : "piped")
    : "null";
  const stderrOpt = (stderr)
    ? (("inherit" in stderr) ? "inherit" : "piped")
    : "null";

  if (abortSignal?.aborted) {
    return 143;
  }

  const child = Deno.run({
    ...run,
    stdin: stdinOpt,
    stdout: stdoutOpt,
    stderr: stderrOpt,
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
      if (!stdin || "inherit" in stdin) {
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
      if (!stdout || "inherit" in stdout) {
        return;
      } else {
        const prefix = ("bufferLinesWithTag" in stdout)
          ? stdout.bufferLinesWithTag + " "
          : "";

        for await (const line of readLines(child.stdout!)) {
          const printableLine = stripAnsi(line);
          if (printableLine.length > 0) {
            console.log(`${prefix}${printableLine}`);
          }
        }
      }
    })();

    const stderrPromise = (async () => {
      if (!stderr || "inherit" in stderr) {
        return;
      } else {
        const prefix = ("bufferLinesWithTag" in stderr)
          ? stderr.bufferLinesWithTag + " "
          : "";

        for await (const line of readLines(child.stderr!)) {
          const printableLine = stripAnsi(line);
          if (printableLine.length > 0) {
            console.log(`${prefix}${printableLine}`);
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
  { stdin, stderr = { bufferLines: true }, abortSignal, ...run }:
    & Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin">
    & {
      abortSignal?: AbortSignal;
      stdin?: StdInputBehavior;
      stderr?: StdOutputBehavior;
    },
): Promise<string> {
  const stdinOpt = (stdin)
    ? (("inherit" in stdin) ? "inherit" : "piped")
    : "null";
  const stderrOpt = (stderr)
    ? (("inherit" in stderr) ? "inherit" : "piped")
    : "null";

  const child = Deno.run({
    ...run,
    stdin: stdinOpt,
    stdout: "piped",
    stderr: stderrOpt,
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
      if (!stdin || "inherit" in stdin) {
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
      if (!stderr || "inherit" in stderr) {
        return;
      } else {
        const prefix = ("bufferLinesWithTag" in stderr)
          ? stderr.bufferLinesWithTag + " "
          : "";

        for await (const line of readLines(child.stderr!)) {
          const printableLine = stripAnsi(line);
          if (printableLine.length > 0) {
            console.log(`${prefix}${printableLine}`);
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

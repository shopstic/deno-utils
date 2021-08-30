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

async function _inheritExec(
  {
    run,
    stdin,
    stdoutTag,
    stderrTag,
    ignoreStdout = false,
    ignoreStderr = false,
  }: {
    run: Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin">;
    ignoreStdout?: boolean;
    ignoreStderr?: boolean;
    stdin?: string | Deno.Reader;
    stdoutTag?: string;
    stderrTag?: string;
  },
): Promise<number> {
  const stdinOpt = (stdin !== undefined) ? "piped" : "null";

  const child = Deno.run({
    ...run,
    stdin: stdinOpt,
    stdout: ignoreStdout ? "null" : "piped",
    stderr: ignoreStderr ? "null" : "piped",
  });

  try {
    const stdinPromise = (() => {
      if (typeof stdin === "string") {
        return writeAll(child.stdin!, new TextEncoder().encode(stdin))
          .finally(() => child.stdin!.close());
      } else if (typeof stdin === "object") {
        return copy(stdin as Deno.Reader, child.stdin!)
          .then(() => {})
          .finally(() => child.stdin!.close());
      } else {
        return Promise.resolve();
      }
    })();

    const stdoutPrefix = stdoutTag !== undefined ? stdoutTag + " " : "";
    const stderrPrefix = stderrTag !== undefined ? stderrTag + " " : "";

    const stdoutPromise = ignoreStdout ? Promise.resolve() : (async () => {
      for await (const line of readLines(child.stdout!)) {
        const printableLine = stripAnsi(line);
        if (printableLine.length > 0) {
          console.log(`${stdoutPrefix}${printableLine}`);
        }
      }
    })();

    const stderrPromise = ignoreStderr ? Promise.resolve() : (async () => {
      for await (const line of readLines(child.stderr!)) {
        const printableLine = stripAnsi(line);
        if (printableLine.length > 0) {
          console.error(`${stderrPrefix}${printableLine}`);
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
    if (!ignoreStdout) {
      child.stdout!.close();
    }

    if (!ignoreStderr) {
      child.stderr!.close();
    }

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
  { run, stdin, stderrTag }: {
    run: Omit<Deno.RunOptions, "stdout" | "stderr" | "stdin">;
    stdin?: string | Deno.Reader;
    stderrTag?: string;
  },
): Promise<string> {
  const stdinOpt = (stdin !== undefined) ? "piped" : "null";

  const child = Deno.run({
    ...run,
    stdin: stdinOpt,
    stdout: "piped",
    stderr: "piped",
  });

  try {
    const stdinPromise = (() => {
      if (typeof stdin === "string") {
        return writeAll(child.stdin!, new TextEncoder().encode(stdin))
          .finally(() => child.stdin!.close());
      } else if (typeof stdin === "object") {
        return copy(stdin as Deno.Reader, child.stdin!)
          .then(() => {})
          .finally(() => child.stdin!.close());
      } else {
        return Promise.resolve();
      }
    })();

    const stderrPrefix = stderrTag !== undefined ? stderrTag + " " : "";

    const stderrPromise = (async () => {
      for await (const line of readLines(child.stderr!)) {
        const printableLine = stripAnsi(line);
        if (printableLine.length > 0) {
          console.error(`${stderrPrefix}${printableLine}`);
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
    }

    return captured;
  } finally {
    child.stderr!.close();
    child.close();
  }
}

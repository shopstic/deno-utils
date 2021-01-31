import { readLines } from "https://deno.land/std@0.85.0/io/bufio.ts";

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

  if (typeof stdin === "string") {
    await Deno.writeAll(child.stdin!, new TextEncoder().encode(stdin));
    child.stdin!.close();
  } else if (typeof stdin === "object") {
    await Deno.copy(stdin as Deno.Reader, child.stdin!);
    child.stdin!.close();
  }

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
    stdoutPromise,
    stderrPromise,
  ]);

  const { code } = await child.status();

  child.stdout!.close();
  child.stderr!.close();
  child.close();

  return code;
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
    throw new Error(`Command return non-zero status of: ${code}`);
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

  if (typeof stdin === "string") {
    await Deno.writeAll(child.stdin!, new TextEncoder().encode(stdin));
    child.stdin!.close();
  } else if (typeof stdin === "object") {
    await Deno.copy(stdin as Deno.Reader, child.stdin!);
    child.stdin!.close();
  }

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
  await stderrPromise;

  const { code } = await child.status();
  const captured = await stdoutPromise;

  if (code !== 0) {
    throw new Error(
      `Command return non-zero status of: ${code}. Captured stdout: ${captured}`,
    );
  }

  child.stderr!.close();
  child.close();

  return new TextDecoder().decode(captured);
}
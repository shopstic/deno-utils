import { AssertionError } from "./deps/std_testing.ts";

export function assertUnreachable(value: never): never {
  throw new AssertionError("Expected matching to be exhaustive, but got: " + value);
}

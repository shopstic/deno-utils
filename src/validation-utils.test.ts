import {
  Static,
  Type,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.10.1/src/typebox.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.85.0/testing/asserts.ts";
import { validate } from "./validation-utils.ts";

const schema = Type.Object({
  foo: Type.String(),
  bar: Type.Boolean(),
  baz: Type.Union([Type.Literal("one"), Type.Literal("two")]),
});

Deno.test("validate success", () => {
  const value = {
    foo: "foo",
    bar: true,
    baz: "two",
  };
  const result = validate(schema, value);

  assertEquals(result, {
    isSuccess: true,
    value,
  });
});

Deno.test("validate error", () => {
  const value = {
    foo: "foo",
    bar: true,
    baz: "three",
  };
  const result = validate(schema, value);

  assert(!result.isSuccess);
  assert("errors" in result && result.errors.length > 0);
});

import {
  Static,
  Type,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.10.1/src/typebox.ts";
import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.90.0/testing/asserts.ts";
import { validate, validateDefinition } from "./validation-utils.ts";

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

const testSchema = {
  definitions: {
    foo: {
      type: "object",
      required: [
        "foo",
      ],
      properties: {
        foo: {
          type: "string",
        },
        bar: {
          type: "boolean",
        },
      },
    },
  },
  $schema: "http://json-schema.org/draft-07/schema",
};

Deno.test("validateDefinition should fail on invalid value", () => {
  const result = validateDefinition({
    schema: testSchema,
    definition: "foo",
    value: {
      bar: 123,
    },
    options: { allErrors: true },
  });

  assert(!result.isSuccess);
  assert("errors" in result && result.errors.length > 0);
});

Deno.test("validateDefinition should throw on unknown definition reference", () => {
  assertThrows(() => {
    validateDefinition({
      schema: testSchema,
      definition: "bar",
      value: {
        bar: 123,
      },
      options: { allErrors: true },
    });
  });
});

Deno.test("validateDefinition should succeed", () => {
  const value = {
    foo: "good",
    bar: true,
  };
  const result = validateDefinition({
    schema: testSchema,
    definition: "foo",
    value,
    options: { allErrors: true },
  });

  assert(result.isSuccess);
  assert(result.value == value);
});

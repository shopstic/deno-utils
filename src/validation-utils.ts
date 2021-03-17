import {
  Static,
  TStatic,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.10.1/src/typebox.ts";
import Ajv, {
  ErrorObject,
  Options,
} from "https://cdn.skypack.dev/ajv@7.2.1?dts";

export interface ValidationFailure {
  isSuccess: false;
  errors: ErrorObject[];
}

export interface ValidationSuccess<V> {
  isSuccess: true;
  value: V;
}

export interface JsonSchemaDefinitions {
  definitions: unknown;
  $schema: string;
}

export type ValidationResult<V> = ValidationFailure | ValidationSuccess<V>;

export function validate<T extends TStatic>(
  schema: T,
  value: unknown,
  options?: Options,
): ValidationResult<Static<T>> {
  const ajv = new Ajv(options || { allErrors: true });
  // deno-lint-ignore no-explicit-any
  const validation = ajv.compile(schema as any);

  if (!validation(value)) {
    return {
      isSuccess: false,
      errors: validation.errors!,
    };
  }

  return {
    isSuccess: true,
    value: value as Static<T>,
  };
}

export function validateDefinition<T>(
  { schema, definition, value, options = { allErrors: true } }: {
    schema: JsonSchemaDefinitions;
    definition: string;
    value: unknown;
    options?: Options;
  },
): ValidationResult<T> {
  const ajv = new Ajv(options);
  ajv.addSchema(schema);
  const validate = ajv.getSchema(definition);

  if (!validate) {
    throw new Error(`Definition ${definition} does not exist in schema`);
  }

  if (!validate(value)) {
    return {
      isSuccess: false,
      errors: validate.errors!,
    };
  }

  return {
    isSuccess: true,
    value: value as T,
  };
}

import { Static, TSchema } from "./deps/typebox.ts";
import type { ErrorObject, ErrorsTextOptions, Options } from "./deps/ajv.ts";
import { addFormats, Ajv } from "./deps/ajv.ts";

export interface ValidationFailure {
  isSuccess: false;
  errors: ErrorObject[];
  errorsToString: (options?: ErrorsTextOptions) => string;
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

export function validate<T extends TSchema>(
  schema: T,
  value: unknown,
  options: Options = { allErrors: true },
): ValidationResult<Static<T>> {
  return createValidator(schema, options)(value);
}

export function createValidator<T extends TSchema>(
  schema: T,
  options: Options = { allErrors: true },
): (value: unknown) => ValidationResult<Static<T>> {
  const ajv = new Ajv(options);
  ajv.addKeyword("kind");
  ajv.addKeyword("modifier");
  // deno-lint-ignore no-explicit-any
  addFormats(ajv as unknown as any);

  const validate = ajv.compile(schema);

  return (value: unknown) => {
    if (!validate(value)) {
      return {
        isSuccess: false,
        errors: validate.errors!,
        errorsToString: (options?: ErrorsTextOptions) => ajv.errorsText(validate.errors!, options),
      };
    }

    return {
      isSuccess: true,
      value: value as Static<T>,
    };
  };
}

export function createDefinitionValidator<T>(
  { schema, definition, options = { allErrors: true } }: {
    schema: JsonSchemaDefinitions;
    definition: string;
    options?: Options;
  },
): (value: unknown) => ValidationResult<T> {
  const ajv = new Ajv(options);
  ajv.addKeyword("kind");
  ajv.addKeyword("modifier");
  // deno-lint-ignore no-explicit-any
  addFormats(ajv as unknown as any);

  ajv.addSchema(schema);

  const validate = ajv.getSchema(`#/definitions/${definition}`);

  if (!validate) {
    throw new Error(`Definition ${definition} does not exist in schema`);
  }

  return (value: unknown) => {
    if (!validate(value)) {
      return {
        isSuccess: false,
        errors: validate.errors!,
        errorsToString: (options?: ErrorsTextOptions) => ajv.errorsText(validate.errors!, options),
      };
    }

    return {
      isSuccess: true,
      value: value as T,
    };
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
  return createDefinitionValidator<T>({ schema, definition, options })(value);
}

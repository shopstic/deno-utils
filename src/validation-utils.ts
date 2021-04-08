import {
  Static,
  TSchema,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.16.2/src/typebox.ts";
import Ajv, {
  ErrorObject,
  Options,
} from "https://cdn.skypack.dev/ajv@8.0.5?dts";
import addFormats from "https://cdn.skypack.dev/ajv-formats@2.0.2?dts";

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
  addFormats(ajv);

  const validate = ajv.compile(schema);

  return (value: unknown) => {
    if (!validate(value)) {
      return {
        isSuccess: false,
        errors: validate.errors!,
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
  addFormats(ajv);

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

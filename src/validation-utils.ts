import {
  Static,
  TStatic,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.10.1/src/typebox.ts";
import Ajv from "https://cdn.skypack.dev/ajv@6.12.6";
import type { ErrorObject } from "https://raw.githubusercontent.com/ajv-validator/ajv/v6.12.6/lib/ajv.d.ts";

export interface ValidationFailure {
  isSuccess: false;
  errors: ErrorObject[];
}

export interface ValidationSuccess<V> {
  isSuccess: true;
  value: V;
}

export type ValidationResult<V> = ValidationFailure | ValidationSuccess<V>;

export function validate<T extends TStatic>(
  schema: T,
  // deno-lint-ignore no-explicit-any
  value: any,
  coerceTypes: boolean | "array" = false,
): ValidationResult<Static<T>> {
  // @ts-ignore No type checking, deliberately any
  const ajv = new Ajv({ allErrors: true, coerceTypes });
  // @ts-ignore No type checking, deliberately any
  const validation = ajv.compile(schema);

  if (!validation(value)) {
    return {
      isSuccess: false,
      // @ts-ignore No type checking, deliberately any
      errors: validation.errors,
    };
  }

  return {
    isSuccess: true,
    value: value as Static<T>,
  };
}

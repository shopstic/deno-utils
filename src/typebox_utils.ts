import { TSchema, Type } from "./deps/typebox.ts";

export const NonEmptyString = (props?: Parameters<typeof Type.String>[0]) => Type.String({ minLength: 1, ...props });

export const PosInt = (props?: Parameters<typeof Type.Integer>[0]) =>
  Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER, ...props });

export const NonNegInt = (props?: Parameters<typeof Type.Integer>[0]) =>
  Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER, ...props });

export const Maybe = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Undefined()]);

export const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()]);

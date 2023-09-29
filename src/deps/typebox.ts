export * from "https://deno.land/x/typebox_deno@0.31.17-2/src/typebox.ts";
export * from "https://deno.land/x/typebox_deno@0.31.17-2/src/compiler/index.ts";
export { Value } from "https://deno.land/x/typebox_deno@0.31.17-2/src/value/index.ts";
export { TransformDecodeCheckError } from "https://deno.land/x/typebox_deno@0.31.17-2/src/value/transform.ts";
import {
  FormatRegistry,
  ObjectOptions,
  TProperties,
  Type,
} from "https://deno.land/x/typebox_deno@0.31.17-2/src/typebox.ts";
import {
  IsDate,
  IsDateTime,
  IsEmail,
  IsIPv4,
  IsIPv6,
  IsTime,
  IsUrl,
  IsUuid,
} from "https://deno.land/x/typebox_deno@0.31.17-2/examples/formats/index.ts";

const UriRegex = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i;

function IsUri(value: string) {
  return UriRegex.test(value);
}

FormatRegistry.Set("uuid", IsUuid);
FormatRegistry.Set("date", IsDate);
FormatRegistry.Set("time", IsTime);
FormatRegistry.Set("date-time", IsDateTime);
FormatRegistry.Set("email", IsEmail);
FormatRegistry.Set("ipv4", IsIPv4);
FormatRegistry.Set("ipv6", IsIPv6);
FormatRegistry.Set("url", IsUrl);
FormatRegistry.Set("uri", IsUri);

export const FlexObject = <T extends TProperties>(properties: T, options: ObjectOptions = {}) =>
  Type.Intersect([
    Type.Object(properties, {
      ...options,
      additionalProperties: true,
    }),
    Type.Record(Type.String(), Type.Unknown()),
  ]);

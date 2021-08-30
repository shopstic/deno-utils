// @deno-types="https://cdn.skypack.dev/pin/ajv@v8.6.2-hTXOSR89efxJTuZb2Htb/dist=es2020,mode=types/index.d.ts"
import Ajv, {
  ErrorObject,
  ErrorsTextOptions,
  Options,
} from "https://cdn.skypack.dev/pin/ajv@v8.6.2-hTXOSR89efxJTuZb2Htb/dist=es2020,mode=imports/optimized/ajv.js";
// @deno-types="https://cdn.skypack.dev/pin/ajv-formats@v2.1.1-vcFtNZ2SctUV93FmiL2Q/dist=es2020,mode=types/dist/index.d.ts"
import addFormats from "https://cdn.skypack.dev/pin/ajv-formats@v2.1.1-vcFtNZ2SctUV93FmiL2Q/dist=es2020,mode=imports/optimized/ajv-formats.js";

export { addFormats, Ajv };
export type { ErrorObject, ErrorsTextOptions, Options };

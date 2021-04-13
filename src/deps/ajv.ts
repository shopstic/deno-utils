// @deno-types="https://cdn.skypack.dev/-/ajv@v8.1.0-Y3WQawW2x1gqg5ZKZEkw/dist=es2020,mode=types/index.d.ts"
import Ajv, {
  ErrorObject,
  ErrorsTextOptions,
  Options,
} from "https://cdn.skypack.dev/-/ajv@v8.1.0-Y3WQawW2x1gqg5ZKZEkw/dist=es2020,mode=imports/optimized/ajv.js";
// @deno-types="https://cdn.skypack.dev/-/ajv-formats@v2.0.2-k6K5bq1G74nDYrfjcaGJ/dist=es2020,mode=types/dist/index.d.ts"
import addFormats from "https://cdn.skypack.dev/-/ajv-formats@v2.0.2-k6K5bq1G74nDYrfjcaGJ/dist=es2020,mode=imports/optimized/ajv-formats.js";

export { addFormats, Ajv };
export type { ErrorObject, ErrorsTextOptions, Options };

import { assertEquals } from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { createNamespace } from "./k8s-utils.ts";

Deno.test("createNamespace", () => {
  const ns = createNamespace({
    metadata: {
      name: "foo",
    },
  });

  assertEquals(ns, {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: {
      name: "foo",
    },
  });
});

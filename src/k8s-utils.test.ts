import { assertEquals } from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { createK8sNamespace } from "./k8s-utils.ts";

Deno.test("K8s createK8sNamespace", () => {
  const ns = createK8sNamespace({
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

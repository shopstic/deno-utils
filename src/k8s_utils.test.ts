import { assertEquals } from "./deps/std_testing.ts";
import { createK8sNamespace } from "./k8s_utils.ts";

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

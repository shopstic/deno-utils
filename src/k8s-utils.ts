import type { IoK8sApiCoreV1Secret } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1Secret.ts";
import type { IoK8sApiCoreV1ConfigMap } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1ConfigMap.ts";
import type { IoK8sApiAppsV1Deployment } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiAppsV1Deployment.ts";
import type { IoK8sApiAppsV1DaemonSet } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiAppsV1DaemonSet.ts";
import type { IoK8sApiAppsV1StatefulSet } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiAppsV1StatefulSet.ts";
import type { IoK8sApiBatchV1Job } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiBatchV1Job.ts";
import type { IoK8sApiExtensionsV1beta1Ingress } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiExtensionsV1beta1Ingress.ts";
import type { IoK8sApiCoreV1PersistentVolume } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1PersistentVolume.ts";
import type { IoK8sApiCoreV1PersistentVolumeClaim } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1PersistentVolumeClaim.ts";
import type { IoK8sApiStorageV1StorageClass } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiStorageV1StorageClass.ts";
import type { IoK8sApiRbacV1Role } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiRbacV1Role.ts";
import type { IoK8sApiRbacV1RoleBinding } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiRbacV1RoleBinding.ts";
import type { IoK8sApiRbacV1ClusterRole } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiRbacV1ClusterRole.ts";
import type { IoK8sApiRbacV1ClusterRoleBinding } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiRbacV1ClusterRoleBinding.ts";
import type { IoK8sApiCoreV1ServiceAccount } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1ServiceAccount.ts";
import type { IoK8sApiCoreV1Service } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1Service.ts";
import type { IoK8sApiCoreV1Namespace } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1Namespace.ts";
import type { IoK8sApiCoreV1Container } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1Container.ts";
import { IoK8sApiCoreV1Volume } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1Volume.ts";
import { IoK8sApiCoreV1VolumeMount } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1VolumeMount.ts";
import { IoK8sApiCoreV1ContainerPort } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1ContainerPort.ts";
import { IoK8sApiCoreV1Probe } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1Probe.ts";
import { IoK8sApiCoreV1EnvVar } from "https://raw.githubusercontent.com/shopstic/k8s-deno-client/1.19.2/models/IoK8sApiCoreV1EnvVar.ts";
import {
  TObject,
  TProperties,
  Type,
} from "https://raw.githubusercontent.com/shopstic/typebox/0.16.3/src/typebox.ts";
import type { Static } from "https://raw.githubusercontent.com/shopstic/typebox/0.16.3/src/typebox.ts";

function RelaxedObject<T extends TProperties>(
  properties: T,
): TObject<T> {
  return Type.Object<T>(properties, { additionalProperties: true });
}

export type K8sPersistentVolumeAccessMode =
  | "ReadWriteOnce"
  | "ReadOnlyMany"
  | "ReadWriteMany";

export const K8sResourceSchema = RelaxedObject({
  apiVersion: Type.String(),
  kind: Type.String(),
  metadata: RelaxedObject({
    name: Type.String(),
    namespace: Type.Optional(Type.String()),
    labels: Type.Optional(Type.Dict(Type.String())),
    annotations: Type.Optional(Type.Union(
      [Type.Dict(Type.String()), Type.Null()],
    )),
  }),
});

export const CrdKind = "CustomResourceDefinition";
export const CrdApiVersionV1beta1 = "apiextensions.k8s.io/v1beta1";
export const CrdApiVersionV1 = "apiextensions.k8s.io/v1";

export const K8sCrdV1beta1Schema = RelaxedObject({
  apiVersion: Type.Literal(CrdApiVersionV1beta1),
  kind: Type.Literal(CrdKind),
  metadata: RelaxedObject({
    name: Type.String(),
  }),
  spec: RelaxedObject({
    group: Type.String(),
    names: RelaxedObject({
      kind: Type.String(),
    }),
    version: Type.Optional(Type.String()),
    versions: Type.Optional(Type.Array(RelaxedObject({
      name: Type.String(),
      schema: Type.Optional(RelaxedObject({
        openAPIV3Schema: Type.Any(),
      })),
    }))),
    validation: Type.Optional(Type.Any()),
  }),
});

export const K8sCrdV1Schema = RelaxedObject({
  apiVersion: Type.Literal(CrdApiVersionV1),
  kind: Type.Literal(CrdKind),
  metadata: RelaxedObject({
    name: Type.String(),
  }),
  spec: RelaxedObject({
    group: Type.String(),
    names: RelaxedObject({
      kind: Type.String(),
    }),
    versions: Type.Array(RelaxedObject({
      name: Type.String(),
      schema: RelaxedObject({
        openAPIV3Schema: Type.Any(),
      }),
    })),
  }),
});

export const K8sCrdSchema = Type.Union([K8sCrdV1beta1Schema, K8sCrdV1Schema]);

export type K8sResource = Static<typeof K8sResourceSchema>;
export type K8sResourceMetadata = Pick<K8sResource, "metadata">;

export function createNamespace(
  ns: IoK8sApiCoreV1Namespace & K8sResourceMetadata,
): IoK8sApiCoreV1Namespace & K8sResource {
  return {
    apiVersion: "v1",
    kind: "Namespace",
    ...ns,
  };
}

export function createSecret(
  secret: IoK8sApiCoreV1Secret & K8sResourceMetadata,
): IoK8sApiCoreV1Secret & K8sResource {
  return {
    apiVersion: "v1",
    kind: "Secret",
    ...secret,
  };
}

export function createConfigMap(
  configMap: IoK8sApiCoreV1ConfigMap & K8sResourceMetadata,
): IoK8sApiCoreV1ConfigMap & K8sResource {
  return {
    apiVersion: "v1",
    kind: "ConfigMap",
    ...configMap,
  };
}

export function createVolume(
  volume: IoK8sApiCoreV1Volume,
): typeof volume {
  return volume;
}

export function createVolumeMount(
  mount: IoK8sApiCoreV1VolumeMount,
): IoK8sApiCoreV1VolumeMount {
  return mount;
}

export function createContainerPort(
  port: IoK8sApiCoreV1ContainerPort,
): IoK8sApiCoreV1ContainerPort {
  return port;
}

export function createDaemonSet(
  daemonSet: IoK8sApiAppsV1DaemonSet & K8sResourceMetadata,
): IoK8sApiAppsV1DaemonSet & K8sResource {
  return {
    apiVersion: "apps/v1",
    kind: "DaemonSet",
    ...daemonSet,
  };
}

export function createDeployment(
  deployment: IoK8sApiAppsV1Deployment & K8sResourceMetadata,
): IoK8sApiAppsV1Deployment & K8sResource {
  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    ...deployment,
  };
}

export function createStatefulSet(
  statefulSet: IoK8sApiAppsV1StatefulSet & K8sResourceMetadata,
): IoK8sApiAppsV1StatefulSet & K8sResource {
  return {
    apiVersion: "apps/v1",
    kind: "StatefulSet",
    ...statefulSet,
  };
}

export function createJob(
  job: IoK8sApiBatchV1Job & K8sResourceMetadata,
): IoK8sApiBatchV1Job & K8sResource {
  return {
    apiVersion: "batch/v1",
    kind: "Job",
    ...job,
  };
}

export function createService(
  service:
    & IoK8sApiCoreV1Service
    & K8sResourceMetadata,
): IoK8sApiCoreV1Service & K8sResource {
  return {
    apiVersion: "v1",
    kind: "Service",
    ...service,
  };
}

export function createStorageClass(
  storageClass:
    & IoK8sApiStorageV1StorageClass
    & K8sResourceMetadata
    & Pick<IoK8sApiStorageV1StorageClass, "provisioner">,
): IoK8sApiStorageV1StorageClass & K8sResource {
  return {
    apiVersion: "storage.k8s.io/v1",
    kind: "StorageClass",
    ...storageClass,
  };
}

export function createIngress(
  ingress: IoK8sApiExtensionsV1beta1Ingress & K8sResourceMetadata,
): IoK8sApiExtensionsV1beta1Ingress & K8sResource {
  return {
    apiVersion: "extensions/v1beta1",
    kind: "Ingress",
    ...ingress,
  };
}

export function createSimpleIngress(
  {
    name,
    hostname,
    servicePath,
    serviceName,
    servicePort,
    protocol = "HTTP",
    sslRedirect = true,
  }: {
    name: string;
    hostname: string;
    servicePath: string;
    serviceName: string;
    servicePort: number | string;
    protocol?: "HTTP" | "GRPC";
    sslRedirect?: boolean;
  },
): IoK8sApiExtensionsV1beta1Ingress & K8sResource {
  return createIngress({
    metadata: {
      name: name,
      annotations: {
        "kubernetes.io/class": "nginx",
        "kubernetes.io/tls-acme": "true",
        "kubernetes.io/use-port-in-redirects": "true",
        "nginx.ingress.kubernetes.io/ssl-redirect": String(sslRedirect),
        "nginx.ingress.kubernetes.io/backend-protocol": protocol,
        "external-dns.alpha.kubernetes.io/ttl": "60",
      },
    },
    spec: {
      rules: [
        {
          host: hostname,
          http: {
            paths: [
              {
                path: servicePath,
                backend: {
                  serviceName,
                  servicePort,
                },
              },
            ],
          },
        },
      ],
      tls: [
        {
          hosts: [hostname],
        },
      ],
    },
  });
}

export function createPv(
  pv: IoK8sApiCoreV1PersistentVolume & K8sResourceMetadata,
): IoK8sApiCoreV1PersistentVolume & K8sResource {
  return {
    apiVersion: "v1",
    kind: "PersistentVolume",
    ...pv,
  };
}

export function createPvc(
  pvc: IoK8sApiCoreV1PersistentVolumeClaim & K8sResourceMetadata,
): IoK8sApiCoreV1PersistentVolumeClaim & K8sResource {
  return {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    ...pvc,
  };
}

export interface CephPvContext {
  clusterId: string;
  csiRbdStorageClass: string;
}

export function createCephStaticPv(
  {
    name,
    size,
    ceph: {
      clusterId,
      csiRbdStorageClass,
    },
    volumeHandle = name,
    accessModes = ["ReadWriteOnce"],
    fsType = "ext4",
    pool = "rbd",
    volumeMode = "Filesystem",
  }: {
    name: string;
    size: string;
    ceph: CephPvContext;
    volumeHandle?: string;
    accessModes?: K8sPersistentVolumeAccessMode[];
    fsType?: "ext4" | "xfs";
    pool?: string;
    volumeMode?: "Filesystem" | "Block";
  },
): IoK8sApiCoreV1PersistentVolume & K8sResource {
  return {
    apiVersion: "v1",
    kind: "PersistentVolume",
    metadata: {
      name: name,
    },
    spec: {
      accessModes: accessModes,
      capacity: {
        storage: size,
      },
      storageClassName: csiRbdStorageClass,
      csi: {
        driver: "rbd.csi.ceph.com",
        fsType: fsType,
        nodeStageSecretRef: {
          name: "csi-rbd-secret",
          namespace: "ceph-csi-rbd",
        },
        volumeAttributes: {
          clusterID: clusterId,
          pool: pool,
          staticVolume: "true",
        },
        volumeHandle: volumeHandle || name,
      },
      persistentVolumeReclaimPolicy: "Retain",
      volumeMode: volumeMode,
    },
  };
}

export function createCephStaticPvc(
  {
    name,
    storageRequestSize,
    ceph: {
      csiRbdStorageClass,
    },
    accessModes = ["ReadWriteOnce"],
    volumeName = name,
  }: {
    name: string;
    storageRequestSize: string;
    ceph: Pick<CephPvContext, "csiRbdStorageClass">;
    accessModes?: K8sPersistentVolumeAccessMode[];
    volumeName?: string;
  },
): IoK8sApiCoreV1PersistentVolumeClaim & K8sResource {
  return {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    metadata: {
      name: name,
    },
    spec: {
      accessModes: accessModes,
      resources: {
        requests: {
          storage: storageRequestSize,
        },
      },
      storageClassName: csiRbdStorageClass,
      volumeName: volumeName,
    },
  };
}

export function createRole(
  role: IoK8sApiRbacV1Role & K8sResourceMetadata,
): IoK8sApiRbacV1Role & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "Role",
    ...role,
  };
}

export function createRoleBinding(
  roleBinding: IoK8sApiRbacV1RoleBinding & K8sResourceMetadata,
): IoK8sApiRbacV1RoleBinding & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "RoleBinding",
    ...roleBinding,
  };
}

export function createClusterRole(
  clusterRole: IoK8sApiRbacV1ClusterRole & K8sResourceMetadata,
): IoK8sApiRbacV1ClusterRole & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "ClusterRole",
    ...clusterRole,
  };
}

export function createClusterRoleBinding(
  clusterRoleBinding: IoK8sApiRbacV1ClusterRoleBinding & K8sResourceMetadata,
): IoK8sApiRbacV1ClusterRoleBinding & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "ClusterRoleBinding",
    ...clusterRoleBinding,
  };
}

export function createServiceAccount(
  account: IoK8sApiCoreV1ServiceAccount & K8sResourceMetadata,
): IoK8sApiCoreV1ServiceAccount & K8sResource {
  return {
    apiVersion: "v1",
    kind: "ServiceAccount",
    ...account,
  };
}

export function createContainer(
  container: IoK8sApiCoreV1Container,
): IoK8sApiCoreV1Container {
  return container;
}

export function createEnvVar(env: IoK8sApiCoreV1EnvVar): IoK8sApiCoreV1EnvVar {
  return env;
}

export function createProbe(probe: IoK8sApiCoreV1Probe): IoK8sApiCoreV1Probe {
  return probe;
}

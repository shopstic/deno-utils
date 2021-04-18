import type {
  IoK8sApiAppsV1DaemonSet,
  IoK8sApiAppsV1Deployment,
  IoK8sApiAppsV1StatefulSet,
  IoK8sApiBatchV1Job,
  IoK8sApiCoreV1ConfigMap,
  IoK8sApiCoreV1Container,
  IoK8sApiCoreV1Namespace,
  IoK8sApiCoreV1PersistentVolume,
  IoK8sApiCoreV1PersistentVolumeClaim,
  IoK8sApiCoreV1Secret,
  IoK8sApiCoreV1Service,
  IoK8sApiCoreV1ServiceAccount,
  IoK8sApiExtensionsV1beta1Ingress,
  IoK8sApiRbacV1ClusterRole,
  IoK8sApiRbacV1ClusterRoleBinding,
  IoK8sApiRbacV1Role,
  IoK8sApiRbacV1RoleBinding,
  IoK8sApiStorageV1StorageClass,
} from "./deps/k8s_api.ts";
import {
  IoK8sApiCoreV1ContainerPort,
  IoK8sApiCoreV1EnvVar,
  IoK8sApiCoreV1Probe,
  IoK8sApiCoreV1Volume,
  IoK8sApiCoreV1VolumeMount,
} from "./deps/k8s_api.ts";

import type { Static, TObject, TProperties } from "./deps/typebox.ts";
import { Type } from "./deps/typebox.ts";

export type {
  IoK8sApiAppsV1DaemonSet,
  IoK8sApiAppsV1Deployment,
  IoK8sApiAppsV1StatefulSet,
  IoK8sApiBatchV1Job,
  IoK8sApiCoreV1ConfigMap,
  IoK8sApiCoreV1Container,
  IoK8sApiCoreV1Namespace,
  IoK8sApiCoreV1PersistentVolume,
  IoK8sApiCoreV1PersistentVolumeClaim,
  IoK8sApiCoreV1Secret,
  IoK8sApiCoreV1Service,
  IoK8sApiCoreV1ServiceAccount,
  IoK8sApiExtensionsV1beta1Ingress,
  IoK8sApiRbacV1ClusterRole,
  IoK8sApiRbacV1ClusterRoleBinding,
  IoK8sApiRbacV1Role,
  IoK8sApiRbacV1RoleBinding,
  IoK8sApiStorageV1StorageClass,
};

export {
  IoK8sApiCoreV1ContainerPort,
  IoK8sApiCoreV1EnvVar,
  IoK8sApiCoreV1Probe,
  IoK8sApiCoreV1Volume,
  IoK8sApiCoreV1VolumeMount,
};

export function RelaxedObject<T extends TProperties>(
  properties: T,
): TObject<T> {
  return Type.Object<T>(properties, { additionalProperties: true });
}

export type K8sPersistentVolumeAccessMode =
  | "ReadWriteOnce"
  | "ReadOnlyMany"
  | "ReadWriteMany";

export type K8sImagePullPolicy = "Always" | "Never" | "IfNotPresent";

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

export enum K8sKind {
  CustomResourceDefinition = "CustomResourceDefinition",
  Service = "Service",
  Namespace = "Namespace",
  Secret = "Secret",
  ConfigMap = "ConfigMap",
  DaemonSet = "DaemonSet",
  Deployment = "Deployment",
  StatefulSet = "StatefulSet",
  Job = "Job",
  StorageClass = "StorageClass",
  Ingress = "Ingress",
  PersistentVolume = "PersistentVolume",
  PersistentVolumeClaim = "PersistentVolumeClaim",
  Role = "Role",
  RoleBinding = "RoleBinding",
  ClusterRole = "ClusterRole",
  ClusterRoleBinding = "ClusterRoleBinding",
  ServiceAccount = "ServiceAccount",
}

export const K8sCrdKind = K8sKind.CustomResourceDefinition;
export const K8sCrdApiVersionV1beta1 = "apiextensions.k8s.io/v1beta1";
export const K8sCrdApiVersionV1 = "apiextensions.k8s.io/v1";

export const K8sCrdV1beta1Schema = RelaxedObject({
  apiVersion: Type.Literal(K8sCrdApiVersionV1beta1),
  kind: Type.Literal(K8sCrdKind),
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
  apiVersion: Type.Literal(K8sCrdApiVersionV1),
  kind: Type.Literal(K8sCrdKind),
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

export function createK8sNamespace(
  ns: IoK8sApiCoreV1Namespace & K8sResourceMetadata,
): IoK8sApiCoreV1Namespace & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.Namespace,
    ...ns,
  };
}

export function createK8sSecret(
  secret: IoK8sApiCoreV1Secret & K8sResourceMetadata,
): IoK8sApiCoreV1Secret & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.Secret,
    ...secret,
  };
}

export function createK8sConfigMap(
  configMap: IoK8sApiCoreV1ConfigMap & K8sResourceMetadata,
): IoK8sApiCoreV1ConfigMap & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.ConfigMap,
    ...configMap,
  };
}

export function createK8sVolume(
  volume: IoK8sApiCoreV1Volume,
): typeof volume {
  return volume;
}

export function createK8sVolumeMount(
  mount: IoK8sApiCoreV1VolumeMount,
): IoK8sApiCoreV1VolumeMount {
  return mount;
}

export function createK8sContainerPort(
  port: IoK8sApiCoreV1ContainerPort,
): IoK8sApiCoreV1ContainerPort {
  return port;
}

export function createK8sDaemonSet(
  daemonSet: IoK8sApiAppsV1DaemonSet & K8sResourceMetadata,
): IoK8sApiAppsV1DaemonSet & K8sResource {
  return {
    apiVersion: "apps/v1",
    kind: K8sKind.DaemonSet,
    ...daemonSet,
  };
}

export function createK8sDeployment(
  deployment: IoK8sApiAppsV1Deployment & K8sResourceMetadata,
): IoK8sApiAppsV1Deployment & K8sResource {
  return {
    apiVersion: "apps/v1",
    kind: K8sKind.Deployment,
    ...deployment,
  };
}

export function createK8sStatefulSet(
  statefulSet: IoK8sApiAppsV1StatefulSet & K8sResourceMetadata,
): IoK8sApiAppsV1StatefulSet & K8sResource {
  return {
    apiVersion: "apps/v1",
    kind: K8sKind.StatefulSet,
    ...statefulSet,
  };
}

export function createK8sJob(
  job: IoK8sApiBatchV1Job & K8sResourceMetadata,
): IoK8sApiBatchV1Job & K8sResource {
  return {
    apiVersion: "batch/v1",
    kind: K8sKind.Job,
    ...job,
  };
}

export function createK8sService(
  service:
    & IoK8sApiCoreV1Service
    & K8sResourceMetadata,
): IoK8sApiCoreV1Service & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.Service,
    ...service,
  };
}

export function createK8sStorageClass(
  storageClass:
    & IoK8sApiStorageV1StorageClass
    & K8sResourceMetadata
    & Pick<IoK8sApiStorageV1StorageClass, "provisioner">,
): IoK8sApiStorageV1StorageClass & K8sResource {
  return {
    apiVersion: "storage.k8s.io/v1",
    kind: K8sKind.StorageClass,
    ...storageClass,
  };
}

export function createK8sIngress(
  ingress: IoK8sApiExtensionsV1beta1Ingress & K8sResourceMetadata,
): IoK8sApiExtensionsV1beta1Ingress & K8sResource {
  return {
    apiVersion: "extensions/v1beta1",
    kind: K8sKind.Ingress,
    ...ingress,
  };
}

export function createK8sSimpleIngress(
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
  return createK8sIngress({
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

export function createK8sPv(
  pv: IoK8sApiCoreV1PersistentVolume & K8sResourceMetadata,
): IoK8sApiCoreV1PersistentVolume & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.PersistentVolume,
    ...pv,
  };
}

export function createK8sPvc(
  pvc: IoK8sApiCoreV1PersistentVolumeClaim & K8sResourceMetadata,
): IoK8sApiCoreV1PersistentVolumeClaim & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.PersistentVolumeClaim,
    ...pvc,
  };
}

export interface CephPvContext {
  clusterId: string;
  csiRbdStorageClass: string;
}

export function createK8sCephStaticPv(
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

export function createK8sCephStaticPvc(
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
    kind: K8sKind.PersistentVolumeClaim,
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

export function createK8sRole(
  role: IoK8sApiRbacV1Role & K8sResourceMetadata,
): IoK8sApiRbacV1Role & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.Role,
    ...role,
  };
}

export function createK8sRoleBinding(
  roleBinding: IoK8sApiRbacV1RoleBinding & K8sResourceMetadata,
): IoK8sApiRbacV1RoleBinding & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.RoleBinding,
    ...roleBinding,
  };
}

export function createK8sClusterRole(
  clusterRole: IoK8sApiRbacV1ClusterRole & K8sResourceMetadata,
): IoK8sApiRbacV1ClusterRole & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.ClusterRole,
    ...clusterRole,
  };
}

export function createK8sClusterRoleBinding(
  clusterRoleBinding: IoK8sApiRbacV1ClusterRoleBinding & K8sResourceMetadata,
): IoK8sApiRbacV1ClusterRoleBinding & K8sResource {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.ClusterRoleBinding,
    ...clusterRoleBinding,
  };
}

export function createK8sServiceAccount(
  account: IoK8sApiCoreV1ServiceAccount & K8sResourceMetadata,
): IoK8sApiCoreV1ServiceAccount & K8sResource {
  return {
    apiVersion: "v1",
    kind: K8sKind.ServiceAccount,
    ...account,
  };
}

export function createK8sContainer(
  container: IoK8sApiCoreV1Container,
): IoK8sApiCoreV1Container {
  return container;
}

export function createK8sEnvVar(
  env: IoK8sApiCoreV1EnvVar,
): IoK8sApiCoreV1EnvVar {
  return env;
}

export function createK8sProbe(
  probe: IoK8sApiCoreV1Probe,
): IoK8sApiCoreV1Probe {
  return probe;
}

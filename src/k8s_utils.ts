import type { K8s } from "./deps/k8s_api.ts";
export type { K8s };

import type { Static } from "./deps/typebox.ts";
import { FlexObject, Type } from "./deps/typebox.ts";

export type K8sPersistentVolumeAccessMode =
  | "ReadWriteOnce"
  | "ReadOnlyMany"
  | "ReadWriteMany";

export type K8sImagePullPolicy = "Always" | "Never" | "IfNotPresent";

export const K8sResourceSchema = FlexObject({
  apiVersion: Type.String(),
  kind: Type.String(),
  metadata: FlexObject({
    name: Type.String(),
    namespace: Type.Optional(Type.String()),
    labels: Type.Optional(Type.Record(Type.String(), Type.String())),
    annotations: Type.Optional(Type.Union(
      [Type.Record(Type.String(), Type.String()), Type.Null()],
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
  PodDisruptionBudget = "PodDisruptionBudget",
  StatefulSet = "StatefulSet",
  Job = "Job",
  CronJob = "CronJob",
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

export const K8sCrdV1beta1Schema = FlexObject({
  apiVersion: Type.Literal(K8sCrdApiVersionV1beta1),
  kind: Type.Literal(K8sCrdKind),
  metadata: FlexObject({
    name: Type.String(),
  }),
  spec: FlexObject({
    group: Type.String(),
    names: FlexObject({
      kind: Type.String(),
    }),
    version: Type.Optional(Type.String()),
    versions: Type.Optional(Type.Array(FlexObject({
      name: Type.String(),
      schema: Type.Optional(FlexObject({
        openAPIV3Schema: Type.Any(),
      })),
    }))),
    validation: Type.Optional(Type.Any()),
  }),
});

export const K8sCrdV1Schema = FlexObject({
  apiVersion: Type.Literal(K8sCrdApiVersionV1),
  kind: Type.Literal(K8sCrdKind),
  metadata: FlexObject({
    name: Type.String(),
  }),
  spec: FlexObject({
    group: Type.String(),
    names: FlexObject({
      kind: Type.String(),
    }),
    versions: Type.Array(FlexObject({
      name: Type.String(),
      schema: FlexObject({
        openAPIV3Schema: Type.Any(),
      }),
    })),
  }),
});

export const K8sCrdSchema = Type.Union([K8sCrdV1beta1Schema, K8sCrdV1Schema]);

export type K8sResource = Static<typeof K8sResourceSchema>;
export type K8sResourceMetadata = Pick<K8sResource, "metadata">;
export type K8sNamespace = K8s["core.v1.Namespace"] & K8sResource;
export type K8sSecret = K8s["core.v1.Secret"] & K8sResource;
export type K8sConfigMap = K8s["core.v1.ConfigMap"] & K8sResource;
export type K8sVolumeMount = K8s["core.v1.VolumeMount"];
export type K8sContainerPort = K8s["core.v1.ContainerPort"];
export type K8sDaemonSet = K8s["apps.v1.DaemonSet"] & K8sResource;
export type K8sPodDisruptionBudget = K8s["policy.v1.PodDisruptionBudget"] & K8sResource;
export type K8sDeployment = K8s["apps.v1.Deployment"] & K8sResource;
export type K8sStatefulSet = K8s["apps.v1.StatefulSet"] & K8sResource;
export type K8sJob = K8s["batch.v1.Job"] & K8sResource;
export type K8sCronJob = K8s["batch.v1.CronJob"] & K8sResource;
export type K8sService = K8s["core.v1.Service"] & K8sResource;
export type K8sStorageClass = K8s["storage.v1.StorageClass"] & K8sResource;
export type K8sIngress = K8s["networking.v1.Ingress"] & K8sResource;
export type K8sPersistentVolume = K8s["core.v1.PersistentVolume"] & K8sResource;
export type K8sPv = K8sPersistentVolume;
export type K8sPersistentVolumeClaim =
  & K8s["core.v1.PersistentVolumeClaim"]
  & K8sResource;
export type K8sPvc = K8sPersistentVolumeClaim;
export type K8sRole = K8s["rbac.v1.Role"] & K8sResource;
export type K8sRoleBinding = K8s["rbac.v1.RoleBinding"] & K8sResource;
export type K8sClusterRole = K8s["rbac.v1.ClusterRole"] & K8sResource;
export type K8sClusterRoleBinding =
  & K8s["rbac.v1.ClusterRoleBinding"]
  & K8sResource;
export type K8sServiceAccount = K8s["core.v1.ServiceAccount"] & K8sResource;
export type K8sContainer = K8s["core.v1.Container"];
export type K8sEnvVar = K8s["core.v1.EnvVar"];
export type K8sProbe = K8s["core.v1.Probe"];

export function createK8sNamespace(
  ns: K8s["core.v1.Namespace"] & K8sResourceMetadata,
): K8sNamespace {
  return {
    apiVersion: "v1",
    kind: K8sKind.Namespace,
    ...ns,
  };
}

export function createK8sSecret(
  secret: K8s["core.v1.Secret"] & K8sResourceMetadata,
): K8sSecret {
  return {
    apiVersion: "v1",
    kind: K8sKind.Secret,
    ...secret,
  };
}

export function createK8sConfigMap(
  configMap: K8s["core.v1.ConfigMap"] & K8sResourceMetadata,
): K8sConfigMap {
  return {
    apiVersion: "v1",
    kind: K8sKind.ConfigMap,
    ...configMap,
  };
}

export function createK8sVolume(
  volume: K8s["core.v1.Volume"],
): typeof volume {
  return volume;
}

export function createK8sVolumeMount(
  mount: K8s["core.v1.VolumeMount"],
): K8sVolumeMount {
  return mount;
}

export function createK8sContainerPort(
  port: K8s["core.v1.ContainerPort"],
): K8sContainerPort {
  return port;
}

export function createK8sDaemonSet(
  daemonSet: K8s["apps.v1.DaemonSet"] & K8sResourceMetadata,
): K8sDaemonSet {
  return {
    apiVersion: "apps/v1",
    kind: K8sKind.DaemonSet,
    ...daemonSet,
  };
}

export function createK8sPodDisruptionBudget(
  budget: K8s["policy.v1.PodDisruptionBudget"] & K8sResourceMetadata,
): K8sPodDisruptionBudget {
  return {
    apiVersion: "policy/v1",
    kind: K8sKind.PodDisruptionBudget,
    ...budget,
  };
}
export function createK8sDeployment(
  deployment: K8s["apps.v1.Deployment"] & K8sResourceMetadata,
): K8sDeployment {
  return {
    apiVersion: "apps/v1",
    kind: K8sKind.Deployment,
    ...deployment,
  };
}

export function createK8sStatefulSet(
  statefulSet: K8s["apps.v1.StatefulSet"] & K8sResourceMetadata,
): K8sStatefulSet {
  return {
    apiVersion: "apps/v1",
    kind: K8sKind.StatefulSet,
    ...statefulSet,
  };
}

export function createK8sJob(
  job: K8s["batch.v1.Job"] & K8sResourceMetadata,
): K8sJob {
  return {
    apiVersion: "batch/v1",
    kind: K8sKind.Job,
    ...job,
  };
}

export function createK8sCronJob(
  job: K8s["batch.v1.CronJob"] & K8sResourceMetadata,
): K8sCronJob {
  return {
    apiVersion: "batch/v1",
    kind: K8sKind.CronJob,
    ...job,
  };
}

export function createK8sService(
  service:
    & K8s["core.v1.Service"]
    & K8sResourceMetadata,
): K8sService {
  return {
    apiVersion: "v1",
    kind: K8sKind.Service,
    ...service,
  };
}

export function createK8sStorageClass(
  storageClass:
    & K8s["storage.v1.StorageClass"]
    & K8sResourceMetadata
    & Pick<K8s["storage.v1.StorageClass"], "provisioner">,
): K8sStorageClass {
  return {
    apiVersion: "storage.k8s.io/v1",
    kind: K8sKind.StorageClass,
    ...storageClass,
  };
}

export function createK8sIngress(
  ingress: K8s["networking.v1.Ingress"] & K8sResourceMetadata,
): K8sIngress {
  return {
    apiVersion: "networking.k8s.io/v1",
    kind: K8sKind.Ingress,
    ...ingress,
  };
}

export function createK8sNginxIngress(
  {
    name,
    hostname,
    servicePath,
    servicePathType,
    serviceBackend,
    protocol = "HTTP",
    sslRedirect = true,
    tlsSecretName,
  }: {
    name: string;
    hostname: string;
    servicePath: string;
    servicePathType: "Prefix" | "Exact";
    serviceBackend: K8s["networking.v1.IngressServiceBackend"];
    protocol?: "HTTP" | "GRPC";
    sslRedirect?: boolean;
    tlsSecretName?: string;
  },
): K8sIngress {
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
                pathType: servicePathType,
                backend: {
                  service: serviceBackend,
                },
              },
            ],
          },
        },
      ],
      tls: [
        {
          hosts: [hostname],
          ...(tlsSecretName
            ? {
              secretName: tlsSecretName,
            }
            : {}),
        },
      ],
    },
  });
}

export function createK8sPv(
  pv: K8s["core.v1.PersistentVolume"] & K8sResourceMetadata,
): K8sPv {
  return {
    apiVersion: "v1",
    kind: K8sKind.PersistentVolume,
    ...pv,
  };
}

export function createK8sPvc(
  pvc: K8s["core.v1.PersistentVolumeClaim"] & K8sResourceMetadata,
): K8sPvc {
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
): K8sPv {
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
): K8sPvc {
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
  role: K8s["rbac.v1.Role"] & K8sResourceMetadata,
): K8sRole {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.Role,
    ...role,
  };
}

export function createK8sRoleBinding(
  roleBinding: K8s["rbac.v1.RoleBinding"] & K8sResourceMetadata,
): K8sRoleBinding {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.RoleBinding,
    ...roleBinding,
  };
}

export function createK8sClusterRole(
  clusterRole: K8s["rbac.v1.ClusterRole"] & K8sResourceMetadata,
): K8sClusterRole {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.ClusterRole,
    ...clusterRole,
  };
}

export function createK8sClusterRoleBinding(
  clusterRoleBinding: K8s["rbac.v1.ClusterRoleBinding"] & K8sResourceMetadata,
): K8sClusterRoleBinding {
  return {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: K8sKind.ClusterRoleBinding,
    ...clusterRoleBinding,
  };
}

export function createK8sServiceAccount(
  account: K8s["core.v1.ServiceAccount"] & K8sResourceMetadata,
): K8sServiceAccount {
  return {
    apiVersion: "v1",
    kind: K8sKind.ServiceAccount,
    ...account,
  };
}

export function createK8sContainer(
  container: K8s["core.v1.Container"],
): K8sContainer {
  return container;
}

export function createK8sEnvVar(
  env: K8s["core.v1.EnvVar"],
): K8sEnvVar {
  return env;
}

export function createK8sProbe(
  probe: K8s["core.v1.Probe"],
): K8sProbe {
  return probe;
}

import { Deferred } from "../deps/std_async.ts";

export type QueueWorkerTask<Req, Res> = {
  input: Req;
  promise: Deferred<Res>;
  signal?: AbortSignal;
};

export const QueueWorkerCommands = {
  Call: "call",
  Abort: "abort",
  Ready: "ready",
  Terminate: "terminate",
  Terminated: "terminated",
} as const;

export type QueueWorkerRequest<T> = QueueWorkerCall<T> | QueueWorkerAbort;

export type QueueWorkerCall<T> = {
  command: typeof QueueWorkerCommands.Call;
  id: number;
  payload: T;
  abortable: boolean;
};

export type QueueWorkerAbort = {
  command: typeof QueueWorkerCommands.Abort;
  id: number;
};

export type QueueWorkerSuccessResponse<T> = {
  id: number;
  error: undefined;
  payload: T;
};

export type QueueWorkerErrorResponse = {
  id: number;
  error: Error;
  payload: undefined;
};

export type QueueWorkerResponse<T> = QueueWorkerSuccessResponse<T> | QueueWorkerErrorResponse;

export function isSelfWorker(s: unknown = self): s is typeof s & {
  postMessage: (message: unknown) => void;
} {
  // deno-lint-ignore no-explicit-any
  return (typeof (s as any).WorkerGlobalScope !== "undefined" && s instanceof (s as any).WorkerGlobalScope);
}

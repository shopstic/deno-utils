import { AsyncQueue, AsyncReadonlyQueue } from "../async_queue.ts";
import { promiseTimeout } from "../async_utils.ts";
import { Deferred } from "../deps/std_async.ts";
import { assert } from "../deps/std_testing.ts";
import { correlateWindow, WindowCorrelationError } from "../windowing.ts";
import {
  QueueWorkerAbort,
  QueueWorkerCall,
  QueueWorkerCommands,
  QueueWorkerResponse,
  QueueWorkerTask,
} from "./shared.ts";

export class QueueWorkerError extends Error {
  constructor(public event: ErrorEvent) {
    super(event.message);
    this.name = "WorkerError";
  }
}

export async function runQueueWorker<Req, Res>(
  taskQueue: AsyncReadonlyQueue<QueueWorkerTask<Req, Res>>,
  { url, concurrency, signal: externalSignal, correlationCompletionTimeoutMs = 5000, initTimeoutMs = 5000 }: {
    url: URL;
    concurrency: number;
    signal?: AbortSignal;
    initTimeoutMs?: number;
    correlationCompletionTimeoutMs?: number;
  },
) {
  type RequestQueueItem = {
    request: QueueWorkerCall<Req>;
    promise: Deferred<Res>;
    signal?: AbortSignal;
  };

  let correlationPromise: Promise<void> | undefined;
  const responseQueue = new AsyncQueue<QueueWorkerResponse<Res>>(1);
  const requestQueue: AsyncReadonlyQueue<RequestQueueItem> = taskQueue
    .statefulMap(0, (id, task) => {
      const newId = id + 1;

      return [newId, {
        request: {
          command: "call" as const,
          id: newId,
          payload: task.input,
          abortable: task.signal !== undefined,
        } satisfies QueueWorkerCall<Req>,
        promise: task.promise,
        signal: task.signal,
      }];
    })
    .detach();

  const channel = new MessageChannel();
  channel.port1.onmessage = (e) => {
    responseQueue.enqueue(e.data);
  };

  const worker = new Worker(url.href, { type: "module" });
  worker.onerror = (e) => {
    abort(new QueueWorkerError(e));
  };

  function init() {
    return new Promise<void>((resolve, reject) => {
      worker.addEventListener("message", (e) => {
        try {
          assert(e.data === QueueWorkerCommands.Ready);
          resolve();
        } catch (e) {
          reject(e);
        }
      }, { once: true });
      worker.postMessage(channel.port2, [channel.port2]);
    });
  }

  async function correlate() {
    const abortListenerDisposeMap = new Map<number, () => void>();

    try {
      const onTaskAbort = (id: number) => {
        channel.port1.postMessage(
          {
            command: QueueWorkerCommands.Abort,
            id,
          } satisfies QueueWorkerAbort,
        );
      };

      await correlateWindow<
        RequestQueueItem,
        QueueWorkerResponse<Res>,
        number
      >({
        requests: requestQueue,
        responses: responseQueue,
        extractRequestId: (request) => request.request.id,
        extractResponseId: (response) => response.id,
        responseTimeoutMs: 0,
        sendRequest: (request) => {
          const signal = request.signal;
          if (signal) {
            const callback = onTaskAbort.bind(null, request.request.id);
            abortListenerDisposeMap.set(request.request.id, signal.removeEventListener.bind(signal, "abort", callback));
            signal.addEventListener("abort", callback);
          }
          channel.port1.postMessage(request.request);
        },
        windowSize: concurrency,
        onMatch({ request: { request: { id, abortable }, promise }, response }) {
          if (abortable) {
            const dispose = abortListenerDisposeMap.get(id);
            if (dispose) {
              abortListenerDisposeMap.delete(id);
              dispose();
            }
          }

          if (response.error === undefined) {
            return promise.resolve(response.payload);
          }

          return promise.reject(response.error);
        },
        completionTimeoutMs: correlationCompletionTimeoutMs,
      });

      abort();
    } finally {
      abortListenerDisposeMap.forEach((dispose) => dispose());
      abortListenerDisposeMap.clear();
    }
  }

  function terminate() {
    return new Promise<void>((resolve, reject) => {
      worker.addEventListener("message", (e) => {
        try {
          assert(e.data === QueueWorkerCommands.Terminated);
          resolve();
        } catch (e) {
          reject(e);
        } finally {
          responseQueue.complete();
        }
      }, { once: true });
      worker.postMessage(QueueWorkerCommands.Terminate);
    });
  }

  function onExternalAbort() {
    abort();
  }

  let isAborted = false;
  let terminatePromise: Promise<void> | undefined;

  function abort(error?: Error) {
    if (!isAborted) {
      isAborted = true;
      requestQueue.complete();

      if (error) {
        responseQueue.complete();
      }

      terminatePromise = terminate();
    }
  }

  try {
    await promiseTimeout(
      initTimeoutMs,
      () => init(),
      () => new Error(`Worker init timed out after ${initTimeoutMs}ms`),
    );
    correlationPromise = correlate();

    if (externalSignal?.aborted) {
      onExternalAbort();
    } else {
      externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
    }

    try {
      await correlationPromise;
    } catch (correlationError) {
      if (correlationError instanceof WindowCorrelationError) {
        const uncorrelated: RequestQueueItem[] = correlationError.uncorrelated;
        for (const { promise } of uncorrelated) {
          promise.reject(correlationError);
        }
      } else {
        throw correlationError;
      }
    }
  } finally {
    externalSignal?.removeEventListener("abort", onExternalAbort);

    try {
      if (!terminatePromise) {
        terminatePromise = terminate();
      }
      await terminatePromise;
    } finally {
      channel.port1.close();
      worker.terminate();
    }
  }
}

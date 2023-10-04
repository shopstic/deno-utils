import { AsyncReadonlyQueue } from "./async_queue.ts";
import { promiseAllSettledTogether } from "./async_utils.ts";
import { Semaphore } from "./semaphore.ts";

type InflightRequest<T> = {
  request: T;
  timer: number;
};

export interface WindowCorrelationMatch<Req, Res, Id> {
  id: Id;
  request: Req;
  response: Res;
}

type WindowCorrelationAbortionSource =
  | "external_signal"
  | "responses_completed"
  | "responses_failed"
  | "correlation_timeout"
  | "requests_completed"
  | "requests_failed";
type WindowCorrelationAbortion = {
  source: WindowCorrelationAbortionSource;
  error?: Error;
};

export class WindowCorrelationError<Req> extends Error {
  readonly uncorrelated: Req[];

  constructor(
    message: string,
    uncorrelated: Req[],
    error: Error,
    readonly abortionSource?: WindowCorrelationAbortionSource,
  ) {
    super(message, {
      cause: error,
    });
    this.uncorrelated = uncorrelated;
    this.name = "WindowCorrelationError";
  }
}

export async function correlateWindow<Req, Res = Req, Id = number>(
  {
    windowSize,
    responseTimeoutMs,
    requests,
    responses,
    sendRequest,
    extractRequestId,
    extractResponseId,
    onMatch,
    signal,
    completionTimeoutMs,
  }: {
    windowSize: number;
    responseTimeoutMs: number;
    requests: AsyncReadonlyQueue<Req>;
    responses: AsyncReadonlyQueue<Res>;
    sendRequest: (request: Req) => Promise<void> | void;
    extractRequestId: (element: Req) => Id;
    extractResponseId: (element: Res) => Id;
    onMatch: (match: WindowCorrelationMatch<Req, Res, Id>) => Promise<void> | void;
    completionTimeoutMs: number;
    signal?: AbortSignal;
  },
): Promise<void> {
  const requestQueue = requests.fork().detach();
  const responseQueue = responses.fork().detach();

  const enableTimeouts = responseTimeoutMs > 0;
  const inflightRequests = new Map<Id, InflightRequest<Req>>();
  const semaphore = new Semaphore(windowSize);

  let collectedError: Error | null = null;
  let abortionSource: WindowCorrelationAbortionSource | undefined;
  let requestsCompleted = false;

  function isAborted() {
    return abortionSource !== undefined;
  }

  function abort(source: WindowCorrelationAbortionSource, error?: Error) {
    if (error && !collectedError) {
      collectedError = error;
    }

    if (abortionSource === undefined) {
      abortionSource = source;
      if (source === "requests_completed") {
        requestsCompleted = true;
        if (inflightRequests.size === 0) {
          responseQueue.complete();
        }
      } else {
        requestQueue.complete();
        if (error) {
          responseQueue.complete();
        }
      }
    }
  }

  const onExternalAbort = (event: Event) => {
    const target = event.target;
    const error =
      (target && "reason" in target && target.reason instanceof Error && !(target.reason instanceof DOMException))
        ? target.reason as Error
        : undefined;

    abort("external_signal", error);
  };

  function cleanup() {
    responseQueue.complete();
    signal?.removeEventListener("abort", onExternalAbort);
    if (enableTimeouts) {
      for (const { timer } of inflightRequests.values()) {
        clearTimeout(timer);
      }
    }
    inflightRequests.clear();
  }

  async function processResponses() {
    try {
      for await (const response of responseQueue.items()) {
        const id = extractResponseId(response);

        if (inflightRequests.has(id)) {
          const inflight = inflightRequests.get(id);

          if (enableTimeouts) {
            clearTimeout(inflight!.timer);
          }

          inflightRequests.delete(id);
          semaphore.release();
          await onMatch({
            id,
            request: inflight!.request,
            response,
          });
        } else {
          throw new Error(`Received a response with an unrecognized id=${id}: ${JSON.stringify(response)}`);
        }

        if (requestsCompleted && inflightRequests.size === 0) return;
      }

      if (inflightRequests.size > 0) {
        abort(
          "responses_completed",
          new Error(`Responses completed but there are still ${inflightRequests.size} requests in flight`),
        );
      } else {
        abort("responses_completed");
      }
    } catch (error) {
      abort("responses_failed", error);
    }
  }

  async function processRequests() {
    try {
      for await (const request of requestQueue.items()) {
        if (isAborted()) break;

        await semaphore.acquire();

        if (isAborted()) {
          semaphore.release();
          break;
        }

        const id = extractRequestId(request);

        const timer = enableTimeouts
          ? setTimeout(() => {
            abort(
              "correlation_timeout",
              new Error(
                `Timed out after ${responseTimeoutMs}ms waiting for a response for a prior request:\n${
                  JSON.stringify(request)
                }`,
              ),
            );
            semaphore.release();
          }, responseTimeoutMs)
          : 0;

        inflightRequests.set(id, {
          request,
          timer,
        });

        await sendRequest(request);

        if (isAborted()) break;
      }

      abort("requests_completed");
    } catch (error) {
      abort("requests_failed", error);
    }
  }

  try {
    if (signal?.aborted) {
      return;
    }
    signal?.addEventListener("abort", onExternalAbort);

    try {
      await promiseAllSettledTogether({
        requests: processRequests(),
        responses: processResponses(),
      }, completionTimeoutMs);
    } catch (error) {
      if (!collectedError) {
        collectedError = error;
      }
    }

    if (collectedError) {
      const uncorrelated = Array.from(inflightRequests.values()).map((inflight) => inflight.request);
      throw new WindowCorrelationError<Req>(
        collectedError.message,
        uncorrelated,
        collectedError,
        abortionSource,
      );
    }
  } finally {
    cleanup();
  }
}

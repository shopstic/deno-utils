import { assertUnreachable } from "../assertion.ts";
import { assert } from "../deps/std_testing.ts";
import { Logger } from "../logger.ts";
import { isSelfWorker, QueueWorkerCommands, QueueWorkerRequest, QueueWorkerResponse } from "./shared.ts";

function cloneError(error: Error) {
  if (error instanceof DOMException) {
    const cloned = new Error(error.message);
    cloned.name = error.name;
    cloned.cause = error.cause;
    cloned.stack = error.stack;
    return cloned;
  }
  return error;
}
export async function runAsQueueWorker<Req, Res>(
  fn: (request: Req, signal?: AbortSignal) => Promise<Res> | Res,
  { logger }: { logger: Logger },
) {
  if (!isSelfWorker(self)) {
    throw new Error("Expected to be run as a worker.");
  }

  const postMessageToMain = self.postMessage.bind(self);

  logger.info?.("waiting for initialization");
  const port = await new Promise<MessagePort>((resolve, reject) => {
    self.addEventListener("message", (event) => {
      try {
        assert(event instanceof MessageEvent);
        assert(event.data instanceof MessagePort);
        resolve(event.data);
      } catch (error) {
        reject(error);
      }
    }, { once: true });
  });
  logger.info?.("ready");

  const pendingTasks = new Set<Promise<void>>();
  const pendingAbortControllerMap = new Map<number, AbortController>();

  function onWorkMessage(port: MessagePort, event: MessageEvent) {
    const message: QueueWorkerRequest<Req> = event.data;
    const promise = (async () => {
      if (message.command === QueueWorkerCommands.Abort) {
        const controller = pendingAbortControllerMap.get(message.id);
        if (controller) {
          pendingAbortControllerMap.delete(message.id);
          controller.abort();
        }
        return;
      }

      if (message.command === QueueWorkerCommands.Call) {
        const id = message.id;
        let response: QueueWorkerResponse<Res>;
        let signal: AbortSignal | undefined;

        if (message.abortable) {
          const controller = new AbortController();
          pendingAbortControllerMap.set(id, controller);
          signal = controller.signal;
        }

        try {
          const payload = await fn(message.payload, signal);
          response = {
            id,
            error: undefined,
            payload,
          };
        } catch (error) {
          response = {
            id,
            error: cloneError(error),
            payload: undefined,
          };
        }

        if (message.abortable) {
          pendingAbortControllerMap.delete(id);
        }

        port.postMessage(response);
        return;
      }

      assertUnreachable(message);
    })().finally(() => {
      pendingTasks.delete(promise);
    });

    pendingTasks.add(promise);
  }

  function waitForTermination(port: MessagePort) {
    return new Promise<void>((resolve, reject) => {
      self.addEventListener("message", async (event) => {
        try {
          assert(event instanceof MessageEvent);
          const data = event.data;

          if (data !== QueueWorkerCommands.Terminate) {
            throw new Error(`Unexpected message ${data}`);
          }

          port.onmessage = null;

          if (pendingTasks.size > 0) {
            logger.info?.(
              "received termination command but still waiting for",
              pendingTasks.size,
              "pending tasks to complete",
            );
          }
          await Promise.allSettled(pendingTasks);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          postMessageToMain(QueueWorkerCommands.Terminated);
        }
      }, { once: true });
    });
  }

  try {
    port.onmessage = onWorkMessage.bind(self, port);
    const terminationPromise = waitForTermination(port);
    postMessageToMain(QueueWorkerCommands.Ready);
    await terminationPromise;
  } finally {
    port.close();
  }
}

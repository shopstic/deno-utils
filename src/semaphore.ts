const resolvedPromise = Promise.resolve();

export class Semaphore {
  #tasks: (() => void)[] = [];
  count: number;

  constructor(count: number) {
    this.count = count;
  }

  acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return resolvedPromise;
    }

    return new Promise<void>((resolve) => {
      this.#tasks.push(resolve);
    });
  }

  release(): void {
    if (this.#tasks.length > 0) {
      const next = this.#tasks.shift();
      next!();
    } else {
      this.count++;
    }
  }
}

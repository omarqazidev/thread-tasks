import { Worker } from 'worker_threads';
import { tmpdir } from 'os';
import { join } from 'path';
import { transpile, ScriptTarget } from 'typescript';

const workersDirectory = join(tmpdir(), 'parallel-workers');

export type Task<TaskArguments> = {
  fn: (data: TaskArguments) => any | ((data: TaskArguments) => Promise<any>);
  args?: TaskArguments;
  onSuccess?: (msg: any) => any;
  onError?: (err: Error) => any;
};

function transpileWorkerFile(wokerCode: string) {
  return transpile(wokerCode, {
    allowJs: true,
    target: ScriptTarget.ES2015
  });
}

async function createWorkerFile<TaskArguments>(
  task: Task<TaskArguments>,
  n: number
) {
  const fs = await import('fs');
  const taskStr = task.fn.toString();

  if (!fs.existsSync(workersDirectory)) {
    fs.mkdirSync(workersDirectory, { recursive: true });
  }

  const workerStr = `
  const { workerData, parentPort } = require('worker_threads');

  const runTask = (data) => {
    return new Promise(async function (resolve, reject) {
      try {
        const fn = ${taskStr};
        const result = await fn({ ...data });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  };

  runTask(workerData.data)
    .then(result => parentPort && parentPort.postMessage(result))
    .catch(err => {
      throw err;
    });
  `;

  const workerCode = transpileWorkerFile(workerStr);

  fs.writeFileSync(`${workersDirectory}/worker${n}.js`, workerCode);
}

async function deleteWorkerFile(n: number) {
  const filePath = `${workersDirectory}/worker${n}.js`;
  const fs = await import('fs');
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Runs the given tasks in parallel threads, allowing for CPU-intensive operations
 * to be offloaded from the main thread. Each task is given its own worker, and
 * the tasks are run in the order they are given in the array. The function
 * returns an array of Worker objects, which can be used to terminate the
 * workers if needed.
 *
 * @param tasks An array of tasks to run in parallel. Each task is an object with
 *   three properties: `fn` (a function that takes no arguments), `args` (an
 *   optional object that is passed to the worker as `workerData`), and
 *   `onSuccess` and `onError` (optional functions that are called with the
 *   result of the task if it succeeds or fails, respectively).
 *
 * @returns An array of Worker objects, which can be used to terminate the
 *   workers if needed.
 */
export function threadTasks<TaskArguments>(tasks: Task<TaskArguments>[]) {
  return tasks.map(async task => {
    const randomIdWithTimestamp = Date.now() + Math.floor(Math.random() * 1000);
    await createWorkerFile(task, randomIdWithTimestamp);

    const worker = new Worker(
      join(workersDirectory, `worker${randomIdWithTimestamp}.js`),
      {
        workerData: {
          data: task.args ? { ...task.args } : {}
        }
      }
    );

    worker.on('message', async msg => {
      task.onSuccess && (await task.onSuccess(msg));
      worker.terminate();
      deleteWorkerFile(randomIdWithTimestamp);
    });

    worker.on('error', async err => {
      task.onError && (await task.onError(err));
      worker.terminate();
      deleteWorkerFile(randomIdWithTimestamp);
    });

    return worker;
  });
}

/**
 * Executes a set of tasks in parallel threads, with controlled concurrency (max thread count).
 *
 * @param tasks - An array of tasks to run in parallel. Each task is an object
 *   with the following properties: `fn` (a function to be executed), `args`
 *   (optional arguments for the function), and optional `onSuccess` and
 *   `onError` callbacks.
 * @param getMaxThreads - An optional function that returns the maximum
 *   number of simultaneously running tasks allowed. If not provided, it defaults to
 *   the number of CPU cores available.
 * @param afterAll - An optional callback function that is executed after all
 *   tasks have been completed.
 *
 * @returns A promise that resolves once all tasks have been processed.
 */
export function threadTasksAdvanced<TaskArguments>({
  tasks,
  getMaxThreads,
  afterAll
}: {
  tasks: Task<TaskArguments>[];
  getMaxThreads?: () => number;
  afterAll?: () => any | (() => Promise<any>);
}) {
  return new Promise((resolve, reject) => {
    let counter = 0;
    let activeWorkers = 0;

    let maxCpus: number | null = null;
    let getThreadCount: () => number =
      getMaxThreads ??
      (() => {
        if (maxCpus === null) {
          const os = require('os');
          const cpuCount = os.cpus().length;
          maxCpus = cpuCount;
          return cpuCount;
        }
        return maxCpus;
      });

    let threadCount = getThreadCount();

    const interval = setInterval(async () => {
      const maxThreadCount = getThreadCount();

      if (threadCount !== maxThreadCount) {
        // console.log(`**** changing max threads to ${maxThreadCount} ****`);
      }

      threadCount = maxThreadCount;

      if (activeWorkers < maxThreadCount && counter < tasks.length) {
        const task = tasks[counter]!;

        const randomIdWithTimestamp =
          Date.now() + Math.floor(Math.random() * 1000);

        await createWorkerFile(task, randomIdWithTimestamp);

        const worker = new Worker(
          join(workersDirectory, `worker${randomIdWithTimestamp}.js`),
          {
            workerData: {
              data: task.args ? { ...task.args } : {}
            }
          }
        );

        counter++;
        activeWorkers++;

        worker.on('message', async msg => {
          task.onSuccess && (await task.onSuccess(msg));
          worker.terminate();
          activeWorkers--;
          deleteWorkerFile(randomIdWithTimestamp);
        });

        worker.on('error', async err => {
          task.onError && (await task.onError(err));
          worker.terminate();
          activeWorkers--;
          deleteWorkerFile(randomIdWithTimestamp);
        });
      }

      if (counter === tasks.length && activeWorkers === 0) {
        afterAll && (await afterAll());
        clearInterval(interval);
        resolve(true);
      }
    }, 1);
  });
}

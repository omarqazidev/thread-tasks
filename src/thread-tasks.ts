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
  const fs = await import('fs');
  fs.unlinkSync(`${workersDirectory}/worker${n}.js`);
}

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

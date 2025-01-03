import { Worker } from 'worker_threads';
import { tmpdir } from 'os';
import { join } from 'path';

const workersDirectory = join(tmpdir(), 'parallel-workers');

type Task<TaskArguments> = {
  fn: (data: TaskArguments) => any | ((data: TaskArguments) => Promise<any>);
  args?: TaskArguments;
  onSuccess?: (msg: any) => any;
  onError?: (err: Error) => any;
};

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

  fs.writeFileSync(`${workersDirectory}/worker${n}.js`, workerStr);
}

async function deleteWorkerFile(n: number) {
  const fs = await import('fs');
  fs.unlinkSync(`${workersDirectory}/worker${n}.js`);
}

export function parallelize<TaskArguments>(tasks: Task<TaskArguments>[]) {
  return tasks.map(async (task, i) => {
    await createWorkerFile(task, i);
    const worker = new Worker(join(workersDirectory, `worker${i}.js`), {
      workerData: {
        data: task.args ? { ...task.args } : {}
      }
    });

    worker.on('message', async msg => {
      task.onSuccess && (await task.onSuccess(msg));
      worker.terminate();
      deleteWorkerFile(i);
    });

    worker.on('error', async err => {
      task.onError && (await task.onError(err));
      worker.terminate();
      deleteWorkerFile(i);
    });

    return worker;
  });
}

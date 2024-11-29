import { Worker } from 'worker_threads';

type WorkerData = {
  task: number;
  worker: number;
  counter: number;
  numberOfTasks: number;
  maxConcurrency: number;
  [key: string]: any;
};

type ParallelizeOptions = {
  tasks: unknown[];
  workerFilePath: string;
  getMaxConcurrency: () => number;
  getWorkerData: (data: WorkerData) => Record<string, any>;
};

export const parallelize = async ({
  tasks,
  workerFilePath,
  getMaxConcurrency,
  getWorkerData
}: ParallelizeOptions): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    let counter = 0;
    let activeWorkers = 0;
    let concurrency = getMaxConcurrency();

    const interval = setInterval(() => {
      const maxConcurrency = getMaxConcurrency();

      if (concurrency !== maxConcurrency) {
        console.log(`**** changing concurrency to ${maxConcurrency} ****`);
      }

      concurrency = maxConcurrency;

      if (activeWorkers < maxConcurrency && counter < tasks.length) {
        const data: WorkerData = {
          task: tasks[counter] as number,
          worker: activeWorkers,
          counter: counter + 1,
          numberOfTasks: tasks.length,
          maxConcurrency
        };

        const workerData = { ...getWorkerData(data), ...data };
        const worker = new Worker(workerFilePath, { workerData });

        counter++;
        activeWorkers++;

        worker.on('exit', () => {
          activeWorkers--;
        });

        worker.on('error', errorMessage => {
          console.log('Error: ', errorMessage);
          activeWorkers--;
        });
      }

      if (counter === tasks.length && activeWorkers === 0) {
        console.log('\nAll tasks successfully executed');
        clearInterval(interval);
        resolve(true);
      }
    }, 1);
  });
};

export const manageConcurrency = async (
  taskList: string[],
  counter: number,
  concurrencyMax: number,
  concurrencyCurrent: number
) => {
  const interval = setInterval(() => {
    if (concurrencyCurrent < concurrencyMax) {
      const worker = new Worker('./src/worker.js', {
        workerData: {
          task: taskList[counter],
          worker: concurrencyCurrent,
          counter: counter + 1,
          numberOfTasks: taskList.length,
          maxConcurrency: concurrencyMax
        }
      });
      counter++;
      concurrencyCurrent++;

      worker.on('exit', () => {
        concurrencyCurrent--;
      });

      worker.on('error', errorMessage => {
        console.log('Error: ', errorMessage);
        concurrencyCurrent--;
      });
    }
    if (counter === taskList.length) {
      console.log('All tasks successfully executed');
      clearInterval(interval);
    }
  }, 1);
};

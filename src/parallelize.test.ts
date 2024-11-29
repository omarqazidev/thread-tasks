import { cpus } from 'os';
import { unitTest } from '../tests/config/unit-test';
import { taskListGenerator } from '../tests/config/mocks';
import { manageConcurrency, parallelize } from './parallelize';
import { getFeatureFlags, isTimeBetween } from './utils';

async function testManageConcurrency() {
  return new Promise(async (resolve, reject) => {
    const numberOfTasks = 20;
    const concurrencyMax = 4;
    const taskList = taskListGenerator(numberOfTasks);
    const counter = 0;
    const concurrencyCurrent = 0;
    console.log('[init] Concurrency Algo Testing...');
    console.log('[init] Tasks to process: ', taskList.length);
    console.log('[init] Task list: ' + taskList);
    console.log('[init] Maximum Concurrency: ', concurrencyMax, '\n');
    await manageConcurrency(
      taskList,
      counter,
      concurrencyMax,
      concurrencyCurrent
    );
    resolve(true);
  });
}

async function testParallelize() {
  return new Promise(async (resolve, reject) => {
    const taskList = taskListGenerator(100);
    await parallelize({
      tasks: taskList,
      workerFilePath: './src/worker.js',
      getMaxConcurrency: () => {
        if (isTimeBetween('9:00', '10:00')) {
          return 4;
        }

        const featureFlags = getFeatureFlags();

        if (!featureFlags) {
          return 2;
        }

        if (featureFlags.USE_ALL_CORES === true) {
          const cpuCount = cpus().length;
          return Number(cpuCount);
        }

        if (featureFlags.MAX_CONCURRENCY) {
          return Number(featureFlags.MAX_CONCURRENCY);
        }

        return 2;
      },
      getWorkerData: data => ({ ...data })
    });
    resolve(true);
  });
}

export async function test() {
  await unitTest('manageConcurrency()', testManageConcurrency);
  await unitTest('parallelize()', testParallelize);
}

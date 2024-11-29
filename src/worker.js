const { exit } = require('process');
const { workerData } = require('worker_threads');

const doTask = taskName => {
  const begin = Date.now();
  const randomTime = Math.random() * 1000;
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      const end = Date.now();
      const timeSpent = end - begin + 'ms';
      console.log(
        ` \x1b[36m[TASK] FINISHED: ${taskName} in ${timeSpent}\x1b[0m`
      );
      resolve(true);
    }, randomTime);
  });
};

console.log(`[EXE] Concurrency: ${workerData.worker + 1} of ${
  workerData.maxConcurrency
}
[EXE] Task Count: ${workerData.counter} of ${workerData.numberOfTasks}
\x1b[31m [TASK] STARTING: ${workerData.task}\x1b[0m`);

doTask(workerData.task).then(_ => exit(0));

<div align="center">
	<br>
  <p><a href="https://github.com/omarqazidev/parallelizer"><img src="logo.png" width="120" alt="Parallelizer" /></a></p>
  <p><b>Parallelizer</b></p>
  Run your CPU-intensive tasks in parallel.
	<br>
	<br>
</div>

## Introduction
Parallelizer is a Node.js program that allows you to run your CPU-intensive tasks in parallel.

Remember, Concurrency is not Parallelism. 

> "Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once." — Rob Pike

## Problem
Process N number of tasks concurrently, until the task list
is exhausted. N defines the number of concurrent promises that should be resolved, and
should be changeable on the fly. No external libraries or packages can be used.

**Breakdown**
- Process N number of tasks simultaneously (at the same time / in parallel).
- Do this until all the tasks have been processed.
- You should be able to change N (number of tasks simultaneously) on the fly.
- When one task finishes processing, start another task in its place.
- You should only use internal Node.js functions. No excternal package allowed.

## Initial Thoughts Solution
As soon as you hear promises (with an s), you think `Promise.all()` and `Promise.allSettled()`. Just loop over the task list, add N number of task promises to an array of size N, pass that array as an argument to `Promise.all()`, and repeat this until all tasks have been processed. Right? Unfortunately wrong. 

Why not? Would that not allow us to process all the tasks N number at a time?

See the issue with this approach is the following:

- One batch/chunk of tasks would have to finish processing, for the next batch to start.
- We are not able to change the number of tasks processing (N) on the fly (using some external event).

## Limitation of Node.js
Node.js is a single-threaded runtime, and cannot therefore, actually run asynchronous tasks in parallel... until worker threads.

In Node.js v10.5, threads were introduced. Threads allow async tasks to run in parallel in Node.js.

Node.js allows offers clusters to scale your node.js applications. However, clusters are used when you want multiple isolated instances (processe) of a node.js application.

In our case, we want to processes CPU-intensive tasks. For this, worker threads are the way to go.

## Solution
- `Worker` threads for the heavy-lifting.
- `setInterval()` to run and manage muliple worker instances.
- `workerData` to communicate with the workers (threads).
- Allow external events to change `N` (number of tasks to process simultaneously).

## How to run
1. Clone the project.
2. `npm i` to install dependencies (typescript and ts-node).
3. `npm run test` to run tests.

## External events changing N
- If the time is between 9:00 AM to 5:00 PM, then `N = 2`
- If the time is not inbetween 9:00 AM to 5:00 PM, then in `env.json`
  - if `USE_ALL_CORES` is true, 
    - then `N = total no. of CPU cores`
    - else `N = MAX_CONCURRENCY`

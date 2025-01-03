# Thread-Tasks
Thread your tasks: Boost performace by running your CPU-intensive tasks in parallel threads.

## Installation

```bash
npm install thread-tasks
```

## Usage
`threadTasks` takes an array of objects, each representing a function (task) to be executed in a seprate thread (in parallel). Each object should have the following properties:
- `fn`: the function (task) to be executed. Can be a normal function or an async function.
- `args`: an optional object containing arguments to be passed to the function.
- `onSuccess`: an optional callback function to be executed when the function completes successfully.
- `onError`: an optional callback function to be executed when the function throws an error.

## Simple Usage

```javascript
threadTasks([
  {
    fn: () => {
      console.log(`I'm running parallelly`);
    }
  }
]);
```
## Advanced Usage

### Using with function arguments and callbacks.

```javascript
threadTasks([
  {
    fn: data => {
      return data.a + data.b;
    },
    args: { a: 1, b: 2 },
    onSuccess: msg => {
      console.log(`Sum = ${msg}`);
    },
    onError: err => {
      console.log(err.message);
    }
  },
  // ... other tasks to be executed in parallel ...
]);
```
### Using for API fetch requests
```javascript
threadTasks([
  {
    fn: async data => {
      const  res  = await fetch(data.url);
      const  json  = await res.json();
      return  json;
    },
    args: { url: 'https://jsonplaceholder.typicode.com/posts/1' },
    onSuccess: json => {
      console.log(JSON.stringify(json));
    }
  },
  {
    fn: async data => {
      const  res  = await fetch(data.url);
      const  json  = await res.json();
      return  json;
    },
    args: { url: 'https://jsonplaceholder.typicode.com/posts/2' },
    onSuccess: json => {
      console.log(JSON.stringify(json));
    }
  }
]);
```

### Using external packages
```javascript
threadTasks([
  {
    fn: async data => {
      const axios = require('axios');
      const res = await axios.get(data.url);
      return res.data;
    },
    args: { url: 'https://jsonplaceholder.typicode.com/posts/1' },
    onSuccess: data => {
      console.log(JSON.stringify(data));
    }
  }
]);
```

## Example Use Cases

- Running multiple API requests in parallel
- Executing multiple asynchronous tasks concurrently
- Improving performance by parallelizing computationally expensive tasks

## License
MIT License

## Contributing
Pull requests and issues welcome!

import { runTime } from './runtime';

export class TaskHandler {
  constructor() {
    const initWorker = (self) => {
      console.log('hallow worker');

      function isGenerator(val) {
        const str = (val)[Symbol.toStringTag];
        if (str === 'Generator') {
          return true;
        }
        if (str === 'GeneratorFunction') {
          return true;
        }
        return false;
      }

      // https://hackernoon.com/async-await-generators-promises-51f1a6ceede2
      function iterToPromise(itr) {
        if (itr instanceof Promise) {
          return itr;
        }
        if (!isGenerator(itr)) {
          throw new Error('itr not supported');
        }
        function run(arg) {
          const result = itr.next(arg);
          let { value } = result;
          if (result.done) {
            return value;
          }
          if (isGenerator(value)) {
            value = iterToPromise(value);
          }
          return Promise.resolve(value).then(run);
        }

        return run();
      }

      const namespace = {};

      self.addFile = ({ src }) => {
        console.log('addFile', src);

        const build = Function(src);
        const script = build();

        const ns = Object.entries(script)
          .map((arg) => {
            const fnName = arg[0];
            const fn = arg[1];
            namespace[fnName] = fn;
            return fnName;
          });

        return ns;
      };

      self.run = ({ fnName, fnArgs }) => iterToPromise(namespace[fnName].apply(self, fnArgs));

      self.receivemessage = ({ fnName, fnArgs }) => {
        console.log('Message received from main script', fnName);
        return Promise.resolve(self[fnName].apply(self, fnArgs));
      };
    };

    this.handler = runTime(initWorker);
  }

  postMessage(msg) {
    return this.handler.postMessage(msg);
  }

  addFile(src) {
    return this.postMessage({
      fnName: 'addFile',
      fnArgs: [{ src }]
    });
  }

  run({ fnName, fnArgs }) {
    return this.postMessage({
      fnName: 'run',
      fnArgs: [{ fnName, fnArgs }]
    });
  }
}

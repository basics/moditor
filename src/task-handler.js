import { runTime } from './runtime';

export class TaskHandler {
  constructor() {
    const initWorker = {
      isGenerator(val) {
        const str = (val)[Symbol.toStringTag];
        if (str === 'Generator') {
          return true;
        }
        if (str === 'GeneratorFunction') {
          return true;
        }
        return false;
      },

      // https://hackernoon.com/async-await-generators-promises-51f1a6ceede2
      iterToPromise(itr) {
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
      },

      addFile({ path, src }) {
        if (!this.namespace) {
          this.namespace = {};
        }
        console.log('addFile', src);

        // eslint-disable-next-line no-new-func
        const build = Function('exports', src);

        const exports = {};
        const script = build(exports);

        console.log('script loaded', exports);

        this.namespace[path] = exports;

        return Object.keys(exports);
      },

      run({ path, fnName, fnArgs }) {
        const el = this.namespace[path];
        return iterToPromise(el[fnName].apply(el, fnArgs));
      },

      receivemessage({ fnName, fnArgs }) {
        console.log('Message received from main script', fnName, fnArgs);
        return Promise.resolve(self[fnName].apply(self, fnArgs));
      }
    };

    this.handler = runTime(initWorker);
  }

  postMessage(msg) {
    return this.handler.postMessage(msg);
  }

  addFile(path, input) {
    // console.log('input? \n', input, '\n');
    const src = Babel.transform(input, { plugins: ['transform-modules-commonjs'] }).code;

    // console.log('src? \n', src, '\n');

    return this.postMessage({
      fnName: 'addFile',
      fnArgs: [{ path, src }]
    });
  }

  run(path, fnName, fnArgs) {
    return this.postMessage({
      fnName: 'run',
      fnArgs: [{ path, fnName, fnArgs }]
    });
  }
}

function getFnContent(fn) {
  let str = fn.toString();
  const f = str.indexOf('{');
  const t = str.lastIndexOf('}');
  str = str.substring(f + 1, t - 1);

  console.log('getFnContent');
  console.log(str);
  console.log('\n');

  return str;
}

// https://stackoverflow.com/questions/11909934/how-to-pass-functions-to-javascript-web-worker
// function fn_string(fun) {
//   const { name } = fun;
//   const fn = fun.toString();
//   const headerEnd = fn.indexOf(/\)\s*\{/);
//   const body = fn.substring(headerEnd, fn.length);

//   return {
//     name,
//     args: fn.substring(fn.indexOf('(') + 1, headerEnd),
//     body: body.substring(body.indexOf('{') + 1, body.lastIndexOf('}'))
//   };
// }

// function classToFunctions(MyClass) {
//   const proto = MyClass.prototype;

// }

class RunTime {
  constructor(url) {
    this.url = url;
    this.resolves = new Map();
    this.globalMsgId = 0;

    this.worker = new Worker(url);
    this.worker.onmessage = this.onmessage.bind(this);
  }

  postMessage(msg) {
    const id = this.globalMsgId;
    this.globalMsgId += 1;

    return new Promise((resolve) => {
      this.resolves.set(id, resolve);
      this.worker.postMessage({ msg, id });
    });
  }

  clone() {
    return new this.constructor(this.url);
  }

  onmessage(msg) {
    const { id, payload } = msg.data;
    const resolve = this.resolves.get(id);
    resolve(payload);
    this.resolves.delete(id);
  }
}

export function runTime(initFn) {
  const str = getFnContent(initFn);

  function onmessage({ data: { msg, id } }) {
    // console.log('onmessage', msg, id);
    self
      .receivemessage(msg)
      .then((payload) => {
        // console.log('receivemessage', msg, '->', payload);
        self.postMessage({ payload, id });
      });
  }

  const test = Babel.transform(onmessage.toString(), { presets: ['es2015'] }).code;
  console.warn('test', test);

  const str2 = getFnContent((self) => {
    self.onmessage = ({ data: { msg, id } }) => {
      // console.log('onmessage', msg, id);
      self
        .receivemessage(msg)
        .then((payload) => {
          // console.log('receivemessage', msg, '->', payload);
          self.postMessage({ payload, id });
        });
    };
  });
  const text = `${str} \n ${str2}`;

  // console.log(`initWorker "${text}"`)
  const blob = new Blob([text], { type: 'application/javascript' });
  return new RunTime(URL.createObjectURL(blob));
}

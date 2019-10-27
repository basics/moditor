
function buildFactory(obj, target) {
  return Object.entries(obj).reduce((t, o) => {
    const key = o[0];
    const fn = o[1];
    const content = `return (${fn.toString()});`;
    console.log('content??', key, content);
    // eslint-disable-next-line no-new-func
    t[key] = (new Function(content))();

    console.log('target??', key, t[key]);

    return t;
  }, target);
}

function buildWorker(obj) {
  const all = Object.entries(obj).reduce((g, [key, fn]) => {
    g[key] = `function ${fn.toString()}`;
    return g;
  }, {});

  const str = JSON.stringify(all, null, '\t');

  return `
    const obj = ${str};
    (${buildFactory})(obj, self);
  `;
}

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

    return new Promise((resolve, reject) => {
      this.resolves.set(id, { resolve, reject });
      this.worker.postMessage({ msg, id });
    });
  }

  clone() {
    return new this.constructor(this.url);
  }

  onmessage(msg) {
    const { id, payload, error } = msg.data;
    const resolve = this.resolves.get(id);
    this.resolves.delete(id);
    if (error) {
      resolve.reject(error);
    } else {
      resolve.resolve(payload);
    }
  }
}

export function runTime(group) {
  if (group.onmessage) {
    throw new Error('assigned group must not have onmessage, use async receivemessage function');
  }
  if (!group.receivemessage) {
    throw new Error('assigned group must have async receivemessage function');
  }
  const code = {
    onmessage({ data: { msg, id } }) {
      console.log('onmessage', msg, id);
      try {
        const promise = self
          .receivemessage(msg)
          .then((payload) => {
            // console.log('receivemessage', msg, '->', payload);
            self.postMessage({ payload, id });
          }).catch(e => {
            self.postMessage({ error: e.message, id });
          });
      } catch (e) {
        self.postMessage({ error: e.message, id });
      }
    }
  };

  const all = { ...group, ...code };

  const w = buildWorker(all);

  console.log(`initWorker \n ${w.split('\\n').join('\n')}`);
  const blob = new Blob([w], { type: 'application/javascript' });
  return new RunTime(URL.createObjectURL(blob));
}

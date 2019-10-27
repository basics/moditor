import { TaskHandler } from './task-handler';

// const input = 'export const getMessage = () => "Hello World";';
// const output = Babel.transform(input, { presets: ['es2015'] }).code;
// console.log('output', output);

window.addEventListener('load', () => {
  console.log('hallo welt');
  const editor = ace.edit(document.getElementById('editor'), {
    mode: 'ace/mode/javascript',
    selectionStyle: 'text',
    autoScrollEditorIntoView: true,
    copyWithEmptySelection: false,
    mergeUndoDeltas: 'always',
    tabSize: 2,
    useSoftTabs: false,
    useTextareaForIME: false,
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
  });

  const example = `
const promiseTimeout = (t, res) => new Promise(r => setTimeout(() => r(res), t));
console.log('hallo inhalt');

function* schachtel(arg) {
  console.warn('schachtel start', arg);
  const jeah = yield promiseTimeout(10, 'schachtel');
  return jeah + ' verpackt, arg: ' + arg;
}

export function* makeAction() {
  console.log('start');
  const ms = promiseTimeout(10, 'jeah geil');
  console.log('ms', ms);
  const jeah = yield ms;
  console.log('jeah????', jeah);
  const s = yield schachtel('cool');
  return jeah + ' alles cool, ' + s;
}
      `;

  editor.session.setValue(example);

  const handler = new TaskHandler();

  handler.addFile('index.js', example)
    .then(
      ns => handler
        .run('index.js', 'makeAction', [])
        .then(runRes => console.log('runRes', runRes))
        .catch(e => console.error(e))
    )
    .catch(e => console.error(e));
});

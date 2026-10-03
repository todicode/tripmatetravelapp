const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function screen() {
  const refs = [], states = [], frames = new Map(), cleanups = [];
  let cursor = 0, frameId = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef: value => { const i = cursor++; return refs[i] ||= { current: value }; },
    useState: value => { const i = cursor++; if (!(i in states)) states[i] = value;
      return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useMemo: fn => fn(), useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
  };
  const native = new Proxy({ AppState: { addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'android' } },
    { get: (target, key) => target[key] || key });
  const source = fs.readFileSync(path.resolve(__dirname, '../src/chat/DirectConversationScreen.tsx'), 'utf8');
  const context = { exports: {}, requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id), require: name => {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === './directMessagingModel') return { compareSeq: (a, b) => Number(a) - Number(b) };
      return { Avatar: 'Avatar', IconButton: 'IconButton', useChatUi: () => ({ c: {}, s: {}, u: {} }) };
    } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  } }).outputText, context);
  const props = { conversation: { canSend: true, user: { displayName: 'An' } },
    thread: { initialized: true, messages: [] }, onSend: async () => {}, onRead() {} };
  const render = () => { cursor = 0; return context.exports.default(props); };
  const find = (node, type) => node?.type === type ? node : node?.children?.flat(Infinity).map(child => find(child, type)).find(Boolean);
  return { render, find, flush: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); } };
}

test('sending scrolls after content layout even if preserving the old position reports an offset', () => {
  const h = screen(); let tree = h.render();
  h.find(tree, 'TextInput').props.onChangeText('hello'); tree = h.render();
  const list = h.find(tree, 'FlatList'), offsets = [];
  list.props.ref.current = { scrollToOffset: value => offsets.push(value.offset) };
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 500 } } });
  const buttons = tree.children.at(-1).children;
  buttons.at(-1).props.onPress();
  assert.equal(offsets.length, 0);
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 500 } } });
  list.props.onContentSizeChange(); h.flush();
  assert.deepEqual(offsets, [0]);
});

test('incoming content preserves older reading position and follows the bottom after viewport resize', () => {
  const h = screen(), list = h.find(h.render(), 'FlatList'), offsets = [];
  list.props.ref.current = { scrollToOffset: value => offsets.push(value.offset) };
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 500 } } });
  list.props.onContentSizeChange(); h.flush(); assert.deepEqual(offsets, []);
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } });
  list.props.onLayout(); h.flush(); assert.deepEqual(offsets, [0]);
});

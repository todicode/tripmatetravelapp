const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function hookHarness(modulePath, dependencies = {}, environment = {}) {
  const slots = [],
    effects = [],
    cleanup = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (next) => {
          slots[index] = typeof next === 'function' ? next(slots[index]) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useMemo(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((v, i) => v !== slots[index].deps[i]))
        slots[index] = { deps, value: fn() };
      return slots[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || !deps || deps.some((v, i) => v !== slots[index][i])) {
        slots[index] = deps;
        effects.push(() => {
          cleanup[index]?.();
          cleanup[index] = fn();
        });
      }
    },
    createContext() {
      return { Provider: 'provider' };
    },
    createElement(_type, props) {
      return props.value;
    },
  };
  react.useCallback = (fn, deps) => react.useMemo(() => fn, deps);
  react.default = react;
  const cache = new Map();
  const native = { BackHandler: { addEventListener: () => ({ remove() {} }) } };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const requireModule = (name) => {
      if (name === 'react') return react;
      if (name in dependencies) return dependencies[name];
      if (name === 'react-native') return native;
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
      throw new Error(`Unexpected dependency: ${name}`);
    };
    vm.runInNewContext(
      ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.React,
        },
      }).outputText,
      {
        exports,
        require: requireModule,
        Error,
        Promise,
        JSON,
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        ...environment,
      },
    );
    return exports;
  }
  const exports = load(modulePath);
  return {
    render(fn) {
      cursor = 0;
      const value = fn(exports);
      effects.splice(0).forEach((effect) => effect());
      return value;
    },
    unmount() {
      cleanup.forEach((fn) => fn?.());
    },
  };
}
module.exports = { hookHarness };

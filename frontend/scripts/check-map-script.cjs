const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.createSourceFile(
  'TripMap.tsx',
  fs.readFileSync(path.resolve(__dirname, '../src/trips/TripMap.tsx'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let html;
function visit(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === 'html' &&
    ts.isNoSubstitutionTemplateLiteral(node.initializer)
  )
    html = node.initializer.text;
  ts.forEachChild(node, visit);
}
visit(source);
if (!html) throw new Error('Map HTML not found');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Inline map script not found');
new vm.Script(script);
console.log('Leaflet inline script syntax OK');

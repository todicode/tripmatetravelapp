const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../src/ExploreHome.tsx'), 'utf8');
const start = source.indexOf('const mapHtml = `');
const end = source.indexOf('`;\n\nfunction Icon', start);
if (start < 0 || end < 0) throw new Error('Map HTML not found');

const html = source.slice(start + 'const mapHtml = `'.length, end).replace('${mapData}', '{}');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Inline map script not found');
new vm.Script(script);
console.log('Leaflet inline script syntax OK');

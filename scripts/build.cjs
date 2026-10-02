const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.resolve(__dirname, '..');
const source = path.join(project, 'dist');
const offline = path.join(project, 'offline');
const site = path.join(project, 'site');
const scriptNames = [];
let html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, name) =>
  '<style>\n' + fs.readFileSync(path.join(source, name), 'utf8') + '\n</style>');
html = html.replace(/\s*<script defer src="([^"]+)"><\/script>/g, (_, name) => {
  scriptNames.push(name);
  return '';
});
const bundle = scriptNames.map(name => '<script>\n' +
  fs.readFileSync(path.join(source, name), 'utf8').replace(/<\/script/gi, '<\\/script') +
  '\n</script>').join('\n');
html = html.replace('</body>', () => bundle + '\n</body>');
html = html.replace('class="brand" href="./"', 'class="brand" href=""');

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== scriptNames.length) throw Error('Unexpected inline script boundaries');
scripts.forEach((match, index) => new vm.Script(match[1], {filename: scriptNames[index]}));
if (/src="vendor|href="(?:premium|style)\.css/.test(html)) {
  throw Error('The exported game still has a local dependency');
}
fs.mkdirSync(offline, {recursive: true});
fs.mkdirSync(site, {recursive: true});
fs.writeFileSync(path.join(offline, '星轨跑酷.html'), html, 'utf8');
fs.writeFileSync(path.join(site, 'index.html'), html, 'utf8');
fs.copyFileSync(path.join(source, 'vendor/THREE-LICENSE.txt'), path.join(site, 'THREE-LICENSE.txt'));
fs.writeFileSync(path.join(site, '_headers'), '/*\n' +
  '  X-Content-Type-Options: nosniff\n' +
  '  Referrer-Policy: strict-origin-when-cross-origin\n' +
  '  Permissions-Policy: camera=(), microphone=(), geolocation=()\n' +
  '  Cache-Control: public, max-age=0, must-revalidate\n', 'utf8');
console.log(`Built offline game and Cloudflare site (${scriptNames.length} scripts, ${Buffer.byteLength(html)} bytes).`);

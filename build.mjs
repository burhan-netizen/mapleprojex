// Builds the protected site: src/ (readable) -> dist/ (minified + obfuscated + domain locked).
// Run: npm run build
import { promises as fs } from 'node:fs';
import path from 'node:path';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';

const SRC = 'src';
const OUT = 'dist';
const HOSTS = ['mapleprojex.vercel.app', 'localhost', '127.0.0.1'];
const NOTICE = 'Design and code (c) 2026 Mago Labs (magolabs.in). Concept website prepared for Maple Projex. Not licensed for copying or reuse.';

const obf = (code, strong = true) => JavaScriptObfuscator.obfuscate(code, {
  compact: true,
  target: 'browser',
  domainLock: HOSTS,
  domainLockRedirectUrl: 'https://magolabs.in/',
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 1,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  identifierNamesGenerator: 'hexadecimal',
  transformObjectKeys: true,
  numbersToExpressions: true,
  simplify: true,
  controlFlowFlattening: strong,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: strong,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: strong,
  debugProtectionInterval: strong ? 4000 : 0,
  disableConsoleOutput: false,
  renameGlobals: false,
}).getObfuscatedCode();

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const e of await fs.readdir(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) await copyDir(a, b);
    else await fs.copyFile(a, b);
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await copyDir(SRC, OUT);

// JS: guard + main in one obfuscated file. main only runs if the guard passes,
// so stripping the guard out breaks the site.
const guard = await fs.readFile(`${SRC}/assets/guard.js`, 'utf8');
const main = await fs.readFile(`${SRC}/assets/main.js`, 'utf8');
await fs.writeFile(`${OUT}/assets/main.js`, `/* ${NOTICE} */\n` + obf(`${guard}\nif (__mpOK === true) {\n${main}\n}`));
await fs.rm(`${OUT}/assets/guard.js`);

// CSS
const css = await fs.readFile(`${SRC}/assets/styles.css`, 'utf8');
const cssOut = new CleanCSS({ level: 2 }).minify(css);
if (cssOut.errors.length) throw new Error(cssOut.errors.join('\n'));
await fs.writeFile(`${OUT}/assets/styles.css`, `/* ${NOTICE} */\n` + cssOut.styles);

// HTML: obfuscate the inline boot script (not JSON-LD), then minify.
let html = await fs.readFile(`${SRC}/index.html`, 'utf8');
html = html.replace(/<script>([\s\S]*?)<\/script>/g, (_, code) => `<script>${obf(code, false)}</script>`);
html = await minifyHtml(html, {
  collapseWhitespace: true,
  conservativeCollapse: false,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: false,
  minifyCSS: true,
  minifyJS: false,
  sortAttributes: true,
  sortClassName: false,
});
html = html.replace('<!doctype html>', `<!doctype html><!-- ${NOTICE} -->`);
await fs.writeFile(`${OUT}/index.html`, html);

console.log('Built protected site into dist/');

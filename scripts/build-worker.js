const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist', 'server');
const assetPaths = [
  ['/', 'dist/index.html', 'text/html; charset=utf-8'],
  ['/index.html', 'dist/index.html', 'text/html; charset=utf-8'],
  ['/daily-cycle.js', 'dist/daily-cycle.js', 'application/javascript; charset=utf-8'],
  ['/learning-path.js', 'dist/learning-path.js', 'application/javascript; charset=utf-8'],
  ['/course-upgrade.js', 'dist/course-upgrade.js', 'application/javascript; charset=utf-8'],
  ['/vocab-scheduler.js', 'dist/vocab-scheduler.js', 'application/javascript; charset=utf-8'],
  ['/collocation-scheduler.js', 'dist/collocation-scheduler.js', 'application/javascript; charset=utf-8'],
  ['/word-card-redesign.js', 'dist/word-card-redesign.js', 'application/javascript; charset=utf-8'],
  ['/weekend-upgrade.js', 'dist/weekend-upgrade.js', 'application/javascript; charset=utf-8'],
  ['/data/ability-map-canonical.json', 'dist/data/ability-map-canonical.json', 'application/json; charset=utf-8'],
  ['/data/course-vocab-index-2025.json', 'dist/data/course-vocab-index-2025.json', 'application/json; charset=utf-8'],
  ['/data/vocabulary-catalog-v1.json', 'dist/data/vocabulary-catalog-v1.json', 'application/json; charset=utf-8'],
  ['/data/collocation-catalog-v1.json', 'dist/data/collocation-catalog-v1.json', 'application/json; charset=utf-8']
];
const assets = Object.fromEntries(assetPaths.map(([route, relative, type]) => [route, { type, data: fs.readFileSync(path.join(root, relative)).toString('base64') }]));
const template = fs.readFileSync(path.join(root, 'worker', 'index.js'), 'utf8');
if (!template.includes('/*__ASSETS__*/')) throw new Error('Worker asset marker missing.');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.js'), template.replace('/*__ASSETS__*/', JSON.stringify(assets)));
fs.mkdirSync(path.join(root, 'dist', '.openai'), { recursive: true });
fs.copyFileSync(path.join(root, '.openai', 'hosting.json'), path.join(root, 'dist', '.openai', 'hosting.json'));



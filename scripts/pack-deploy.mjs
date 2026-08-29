import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const list = execSync(
  `cd ${ROOT} && find . -type f -not -path './node_modules/*' -not -path './dist/*' -not -path './.git/*' -not -path './public/icons/*' -not -name '.gitignore' -not -name '.oxlintrc.json' -not -name 'package-lock.json' | sort`,
)
  .toString()
  .trim()
  .split('\n')
  .map((f) => f.replace(/^\.\//, ''));

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.ico']);

const files = list.map((rel) => {
  const abs = path.join(ROOT, rel);
  const ext = path.extname(rel).toLowerCase();
  if (BINARY_EXT.has(ext)) {
    return { file: rel, data: readFileSync(abs).toString('base64'), encoding: 'base64' };
  }
  return { file: rel, data: readFileSync(abs, 'utf-8') };
});

const totalBytes = files.reduce((n, f) => n + f.data.length, 0);
console.error(`files: ${files.length}, payload chars: ${totalBytes}`);

writeFileSync(path.join(ROOT, '..', 'deploy-payload.json'), JSON.stringify(files));

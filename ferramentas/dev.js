// npm run dev: liga o servidor Node (porta 5050) e o Vite (porta 5173) juntos.
// Abra http://localhost:5173 . Ctrl+C desliga os dois.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const filhos = [
  spawn(process.execPath, ['servidor/index.js', '--porta', '5050'], { cwd: raiz, stdio: 'inherit' }),
  spawn(process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js')], { cwd: raiz, stdio: 'inherit' }),
];

function encerrar() {
  for (const f of filhos) if (!f.killed) f.kill();
  process.exit();
}
for (const f of filhos) f.on('exit', encerrar);
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
